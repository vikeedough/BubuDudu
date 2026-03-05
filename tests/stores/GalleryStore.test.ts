jest.mock("@/utils/generateImageVariants", () => ({
  generateVariants: jest.fn(),
}));

jest.mock("@/utils/generateBlurhash", () => ({
  generateBlurhash: jest.fn(),
}));

jest.mock("@/utils/runWithConcurrency", () => ({
  runWithConcurrency: jest.fn(async (items, _limit, worker) => {
    for (let i = 0; i < items.length; i++) {
      await worker(items[i], i);
    }
  }),
}));

jest.mock("@/toast/api", () => {
  const { toastMock } = require("@/tests/mocks/toast");
  return { toast: toastMock };
});

import { useGalleryStore } from "@/stores/GalleryStore";
import { resetAllStores } from "@/tests/helpers/resetStores";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import {
  queueFrom,
  queueFromSingle,
  queueFunction,
  queueStorage,
  supabaseMock,
} from "@/tests/mocks/supabase";
import { toastMock } from "@/tests/mocks/toast";

const BASE_GALLERY = {
  id: "g1",
  space_id: "space-1",
  title: "Trip",
  date: "2026-03-01",
  date_date: "2026-03-01",
  color: "#FF0000",
  location: "Paris",
  cover_image_path: null,
  cover_image_thumb_path: null,
  cover_image_blur_hash: null,
  created_at: "2026-03-01T00:00:00.000Z",
};

const BASE_IMAGE = {
  id: "i1",
  gallery_id: "g1",
  storage_path_thumb: "thumb.jpg",
  storage_path_grid: "grid.jpg",
  storage_path_orig: "orig.jpg",
  blur_hash: null,
  created_at: "2026-03-06T00:00:00.000Z",
};

describe("stores/GalleryStore", () => {
  beforeEach(() => {
    resetAllStores();
    const { resetToastMock } = require("@/tests/mocks/toast");
    resetToastMock();
  });

  it("clear resets gallery store state", () => {
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      imagesByGalleryId: { g1: [BASE_IMAGE] },
      error: "oops",
    });

    useGalleryStore.getState().clear();

    expect(useGalleryStore.getState()).toMatchObject({
      galleries: [],
      imagesByGalleryId: {},
      error: null,
    });
  });

  it("setGalleriesQuery updates query and triggers load", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", { data: [], error: null });

    useGalleryStore.getState().setGalleriesQuery({ searchText: "tri" });

    await Promise.resolve();
    await Promise.resolve();

    expect(useGalleryStore.getState().galleriesQuery.searchText).toBe("tri");
    expect(supabaseMock.from).toHaveBeenCalledWith("galleries");
  });

  it("loadInitialGalleries returns empty state when no space", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    const result = await useGalleryStore.getState().loadInitialGalleries();

    expect(result).toEqual([]);
    expect(useGalleryStore.getState().galleriesPage.hasMore).toBe(false);
  });

  it("loadInitialGalleries signs cover thumbnails", async () => {
    const gallery = {
      ...BASE_GALLERY,
      cover_image_thumb_path: "covers/g1-thumb.jpg",
    };

    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", { data: [gallery], error: null });
    queueStorage("gallery-private", "createSignedUrl", {
      data: { signedUrl: "https://signed/thumb.jpg" },
      error: null,
    });

    const result = await useGalleryStore.getState().loadInitialGalleries();

    expect(result[0].cover_thumb_url).toBe("https://signed/thumb.jpg");
    expect(useGalleryStore.getState().galleriesPage.hasMore).toBe(false);
  });

  it("loadMoreGalleries returns early without cursor", async () => {
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      galleriesPage: {
        cursor: null,
        hasMore: true,
        isLoadingInitial: false,
        isLoadingMore: false,
      },
    });

    const result = await useGalleryStore.getState().loadMoreGalleries();

    expect(result).toEqual([BASE_GALLERY]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("loadMoreGalleries merges new rows uniquely", async () => {
    const second = {
      ...BASE_GALLERY,
      id: "g2",
      title: "Dinner",
      date_date: "2026-02-28",
    };

    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      galleriesPage: {
        cursor: { date: "2026-03-01", id: "g1" },
        hasMore: true,
        isLoadingInitial: false,
        isLoadingMore: false,
      },
    });

    queueFrom("galleries", "select", {
      data: [BASE_GALLERY, second],
      error: null,
    });

    const result = await useGalleryStore.getState().loadMoreGalleries();

    expect(result.map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("loadInitialGalleryImages falls back when signing fails", async () => {
    queueFrom("date_images", "select", { data: [BASE_IMAGE], error: null });
    queueFunction("sign-gallery-urls", {
      data: null,
      error: { message: "sign failed" },
    });

    const result = await useGalleryStore
      .getState()
      .loadInitialGalleryImages("g1");

    expect(result).toEqual([BASE_IMAGE]);
    expect(useGalleryStore.getState().imagesByGalleryId.g1[0].url_orig).toBeUndefined();
  });

  it("loadMoreGalleryImages merges images without duplicates", async () => {
    const second = {
      ...BASE_IMAGE,
      id: "i2",
      created_at: "2026-03-05T00:00:00.000Z",
    };

    useGalleryStore.setState({
      imagesByGalleryId: { g1: [BASE_IMAGE] },
      imagesPageByGalleryId: {
        g1: {
          cursor: { created_at: "2026-03-06T00:00:00.000Z", id: "i1" },
          hasMore: true,
          isLoadingInitial: false,
          isLoadingMore: false,
        },
      },
    });

    queueFrom("date_images", "select", {
      data: [BASE_IMAGE, second],
      error: null,
    });
    queueFunction("sign-gallery-urls", {
      data: {
        i1: { url_thumb: "t1", url_grid: "g1", url_orig: "o1" },
        i2: { url_thumb: "t2", url_grid: "g2", url_orig: "o2" },
      },
      error: null,
    });

    const result = await useGalleryStore.getState().loadMoreGalleryImages("g1");

    const ids = result.map((i) => i.id);
    expect(ids).toEqual(["i1", "i2"]);
  });

  it("addNewGallery returns null and sets error when space is missing", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    const result = await useGalleryStore.getState().addNewGallery({
      title: "Trip",
      date: "2026-03-06",
      color: "#123",
      location: "Rome",
    });

    expect(result).toBeNull();
    expect(useGalleryStore.getState().error).toBe("No spaceId found");
  });

  it("addNewGallery returns inserted gallery on success", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("galleries", "insert", {
      data: BASE_GALLERY,
      error: null,
    });

    const result = await useGalleryStore.getState().addNewGallery({
      title: "Trip",
      date: "2026-03-06",
      color: "#123",
      location: "Rome",
    });

    expect(result).toEqual(BASE_GALLERY);
  });

  it("uploadGalleryImages handles gallery fetch failure and resets loading", async () => {
    queueFromSingle("galleries", "select", {
      data: null,
      error: { message: "Gallery not found" },
    });

    const ok = await useGalleryStore
      .getState()
      .uploadGalleryImages("g1", ["file://1.jpg"]);

    expect(ok).toBe(false);
    expect(useGalleryStore.getState().isUploadingByGalleryId.g1).toBe(false);
    expect(toastMock.show).toHaveBeenCalled();
    expect(toastMock.dismiss).toHaveBeenCalledWith("toast-id");
  });

  it("fetchGalleryImages sets error and returns [] on query failure", async () => {
    queueFrom("date_images", "select", {
      data: null,
      error: { message: "query failed" },
    });

    const rows = await useGalleryStore.getState().fetchGalleryImages("g1");

    expect(rows).toEqual([]);
    expect(useGalleryStore.getState().error).toBe("query failed");
    expect(useGalleryStore.getState().isLoadingImagesByGalleryId.g1).toBe(false);
  });

  it("fetchGalleryImages returns signed rows when signing succeeds", async () => {
    queueFrom("date_images", "select", {
      data: [BASE_IMAGE],
      error: null,
    });
    queueFunction("sign-gallery-urls", {
      data: {
        i1: { url_thumb: "t1", url_grid: "g1", url_orig: "o1" },
      },
      error: null,
    });

    const rows = await useGalleryStore.getState().fetchGalleryImages("g1");

    expect(rows[0].url_orig).toBe("o1");
    expect(useGalleryStore.getState().imagesByGalleryId.g1[0].url_orig).toBe("o1");
  });

  it("deleteOneGalleryImage replaces cover when deleting current cover", async () => {
    useGalleryStore.setState({
      galleries: [
        {
          ...BASE_GALLERY,
          cover_image_path: "old/grid.jpg",
          cover_image_thumb_path: "old/thumb.jpg",
          cover_image_blur_hash: "old-blur",
        },
      ],
      imagesByGalleryId: {
        g1: [
          {
            ...BASE_IMAGE,
            storage_path_thumb: "old/thumb.jpg",
            storage_path_grid: "old/grid.jpg",
            storage_path_orig: "old/orig.jpg",
          },
        ],
      },
    });

    queueFromSingle("galleries", "select", {
      data: {
        cover_image_path: "old/grid.jpg",
        cover_image_thumb_path: "old/thumb.jpg",
      },
      error: null,
    });
    queueFromSingle("date_images", "select", {
      data: {
        storage_path_thumb: "old/thumb.jpg",
        storage_path_grid: "old/grid.jpg",
        storage_path_orig: "old/orig.jpg",
      },
      error: null,
    });
    queueFrom("date_images", "select", {
      data: [
        {
          storage_path_grid: "new/grid.jpg",
          storage_path_thumb: "new/thumb.jpg",
          blur_hash: "new-blur",
        },
      ],
      error: null,
    });
    queueFrom("galleries", "update", { data: null, error: null });
    queueStorage("gallery-private", "createSignedUrl", {
      data: { signedUrl: "https://signed/new-thumb.jpg" },
      error: null,
    });
    queueStorage("gallery-private", "remove", {
      data: [],
      error: null,
    });
    queueFrom("date_images", "delete", { data: null, error: null });

    const ok = await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1");

    expect(ok).toBe(true);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toEqual([]);

    const [gallery] = useGalleryStore.getState().galleries;
    expect(gallery.cover_image_path).toBe("new/grid.jpg");
    expect(gallery.cover_thumb_url).toBe("https://signed/new-thumb.jpg");
  });

  it("deleteOneGalleryImage clears cover when deleting last cover image", async () => {
    useGalleryStore.setState({
      galleries: [
        {
          ...BASE_GALLERY,
          cover_image_path: "old/grid.jpg",
          cover_image_thumb_path: "old/thumb.jpg",
          cover_image_blur_hash: "old-blur",
        },
      ],
      imagesByGalleryId: {
        g1: [
          {
            ...BASE_IMAGE,
            storage_path_thumb: "old/thumb.jpg",
            storage_path_grid: "old/grid.jpg",
            storage_path_orig: "old/orig.jpg",
          },
        ],
      },
    });

    queueFromSingle("galleries", "select", {
      data: {
        cover_image_path: "old/grid.jpg",
        cover_image_thumb_path: "old/thumb.jpg",
      },
      error: null,
    });
    queueFromSingle("date_images", "select", {
      data: {
        storage_path_thumb: "old/thumb.jpg",
        storage_path_grid: "old/grid.jpg",
        storage_path_orig: "old/orig.jpg",
      },
      error: null,
    });
    queueFrom("date_images", "select", {
      data: [],
      error: null,
    });
    queueFrom("galleries", "update", { data: null, error: null });
    queueStorage("gallery-private", "remove", {
      data: [],
      error: null,
    });
    queueFrom("date_images", "delete", { data: null, error: null });

    const ok = await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1");

    expect(ok).toBe(true);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toEqual([]);
    expect(useGalleryStore.getState().galleries[0].cover_image_path).toBeNull();
    expect(useGalleryStore.getState().galleries[0].cover_image_thumb_path).toBeNull();
  });

  it("deleteGallery clears cache and shows success toast", async () => {
    useGalleryStore.setState({
      imagesByGalleryId: { g1: [] },
      imagesPageByGalleryId: {
        g1: {
          cursor: null,
          hasMore: false,
          isLoadingInitial: false,
          isLoadingMore: false,
        },
      },
    });
    queueFrom("galleries", "delete", { data: null, error: null });

    const ok = await useGalleryStore.getState().deleteGallery("g1");

    expect(ok).toBe(true);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toBeUndefined();
    expect(useGalleryStore.getState().imagesPageByGalleryId.g1).toBeUndefined();
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success!",
      }),
    );
  });

  it("deleteGallery sets error and returns false when gallery row delete fails", async () => {
    useGalleryStore.setState({
      imagesByGalleryId: { g1: [] },
    });
    queueFrom("galleries", "delete", {
      data: null,
      error: { message: "delete fail" },
    });

    const ok = await useGalleryStore.getState().deleteGallery("g1");

    expect(ok).toBe(false);
    expect(useGalleryStore.getState().error).toBe("delete fail");
  });
});
