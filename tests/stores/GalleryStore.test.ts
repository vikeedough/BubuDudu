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
import { generateBlurhash } from "@/utils/generateBlurhash";
import { generateVariants } from "@/utils/generateImageVariants";
import { runWithConcurrency } from "@/utils/runWithConcurrency";

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

const MOCK_VARIANTS = {
  thumb: {
    uri: "file://thumb.jpg",
    arrayBuffer: new ArrayBuffer(8),
    width: 120,
    height: 80,
    bytes: 1024,
  },
  grid: {
    uri: "file://grid.jpg",
    arrayBuffer: new ArrayBuffer(8),
    width: 800,
    height: 600,
    bytes: 8192,
  },
  orig: {
    uri: "file://orig.jpg",
    arrayBuffer: new ArrayBuffer(8),
    width: 2048,
    height: 1536,
    bytes: 16384,
  },
};

describe("stores/GalleryStore", () => {
  beforeEach(() => {
    resetAllStores();
    const { resetToastMock } = require("@/tests/mocks/toast");
    resetToastMock();
    (generateVariants as jest.Mock).mockClear();
    (generateBlurhash as jest.Mock).mockClear();
    (runWithConcurrency as jest.Mock).mockClear();
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

  it("loadMoreGalleries signs cover thumbs when signing succeeds", async () => {
    const second = {
      ...BASE_GALLERY,
      id: "g2",
      title: "Dinner",
      date_date: "2026-02-28",
      cover_image_thumb_path: "covers/g2-thumb.jpg",
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
      data: [second],
      error: null,
    });
    queueStorage("gallery-private", "createSignedUrl", {
      data: { signedUrl: "https://signed/g2-thumb.jpg" },
      error: null,
    });

    const result = await useGalleryStore.getState().loadMoreGalleries();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "g2",
          cover_thumb_url: "https://signed/g2-thumb.jpg",
        }),
      ]),
    );
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

  it("loadInitialGalleryImages merges signed urls when signing succeeds", async () => {
    queueFrom("date_images", "select", { data: [BASE_IMAGE], error: null });
    queueFunction("sign-gallery-urls", {
      data: {
        i1: {
          url_thumb: "thumb-signed",
          url_grid: "grid-signed",
          url_orig: "orig-signed",
        },
      },
      error: null,
    });

    const result = await useGalleryStore
      .getState()
      .loadInitialGalleryImages("g1");

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "i1",
        url_thumb: "thumb-signed",
        url_grid: "grid-signed",
        url_orig: "orig-signed",
      }),
    );
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

  it("loadInitialGalleries stores error when query fails", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", {
      data: null,
      error: { message: "load fail" },
    });

    const rows = await useGalleryStore.getState().loadInitialGalleries();

    expect(rows).toEqual([]);
    expect(useGalleryStore.getState().error).toBe("load fail");
    expect(useGalleryStore.getState().isLoadingGalleries).toBe(false);
  });

  it("loadMoreGalleries returns existing rows when hasMore is false", async () => {
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      galleriesPage: {
        cursor: { date: "2026-03-01", id: "g1" },
        hasMore: false,
        isLoadingInitial: false,
        isLoadingMore: false,
      },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleries();

    expect(rows).toEqual([BASE_GALLERY]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("loadMoreGalleries returns existing rows while already loading", async () => {
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      galleriesPage: {
        cursor: { date: "2026-03-01", id: "g1" },
        hasMore: true,
        isLoadingInitial: false,
        isLoadingMore: true,
      },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleries();

    expect(rows).toEqual([BASE_GALLERY]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("loadMoreGalleries returns existing rows when no space id is available", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      galleriesPage: {
        cursor: { date: "2026-03-01", id: "g1" },
        hasMore: true,
        isLoadingInitial: false,
        isLoadingMore: false,
      },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleries();

    expect(rows).toEqual([BASE_GALLERY]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("loadMoreGalleries stores error when next-page query fails", async () => {
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
      data: null,
      error: { message: "more failed" },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleries();

    expect(rows).toEqual([BASE_GALLERY]);
    expect(useGalleryStore.getState().error).toBe("more failed");
  });

  it("loadInitialGalleryImages stores error when query fails", async () => {
    queueFrom("date_images", "select", {
      data: null,
      error: { message: "images failed" },
    });

    const rows = await useGalleryStore
      .getState()
      .loadInitialGalleryImages("g1");

    expect(rows).toEqual([]);
    expect(useGalleryStore.getState().error).toBe("images failed");
    expect(useGalleryStore.getState().isLoadingImagesByGalleryId.g1).toBe(false);
  });

  it("loadInitialGalleryImages handles empty result without signing call", async () => {
    queueFrom("date_images", "select", { data: [], error: null });

    const rows = await useGalleryStore
      .getState()
      .loadInitialGalleryImages("g1");

    expect(rows).toEqual([]);
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    expect(useGalleryStore.getState().imagesPageByGalleryId.g1.cursor).toBeNull();
  });

  it("loadMoreGalleryImages returns existing rows when page has no more", async () => {
    useGalleryStore.setState({
      imagesByGalleryId: { g1: [BASE_IMAGE] },
      imagesPageByGalleryId: {
        g1: {
          cursor: { created_at: "2026-03-06T00:00:00.000Z", id: "i1" },
          hasMore: false,
          isLoadingInitial: false,
          isLoadingMore: false,
        },
      },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleryImages("g1");

    expect(rows).toEqual([BASE_IMAGE]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("loadMoreGalleryImages returns existing rows while already loading", async () => {
    useGalleryStore.setState({
      imagesByGalleryId: { g1: [BASE_IMAGE] },
      imagesPageByGalleryId: {
        g1: {
          cursor: { created_at: "2026-03-06T00:00:00.000Z", id: "i1" },
          hasMore: true,
          isLoadingInitial: false,
          isLoadingMore: true,
        },
      },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleryImages("g1");

    expect(rows).toEqual([BASE_IMAGE]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("loadMoreGalleryImages stores error when query fails", async () => {
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
      data: null,
      error: { message: "more images failed" },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleryImages("g1");

    expect(rows).toEqual([BASE_IMAGE]);
    expect(useGalleryStore.getState().error).toBe("more images failed");
  });

  it("loadMoreGalleryImages falls back to unsigned rows when signing fails", async () => {
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
    queueFrom("date_images", "select", { data: [second], error: null });
    queueFunction("sign-gallery-urls", {
      data: null,
      error: { message: "sign fail" },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleryImages("g1");

    expect(rows.map((x) => x.id)).toEqual(["i1", "i2"]);
    expect(rows.find((x) => x.id === "i2")?.url_orig).toBeUndefined();
  });

  it("fetchGalleryImages returns [] when gallery has no rows", async () => {
    queueFrom("date_images", "select", { data: [], error: null });

    const rows = await useGalleryStore.getState().fetchGalleryImages("g1");

    expect(rows).toEqual([]);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toEqual([]);
  });

  it("fetchGalleryImages falls back to unsigned rows when signing fails", async () => {
    queueFrom("date_images", "select", { data: [BASE_IMAGE], error: null });
    queueFunction("sign-gallery-urls", {
      data: null,
      error: { message: "sign fail" },
    });

    const rows = await useGalleryStore.getState().fetchGalleryImages("g1");

    expect(rows).toEqual([BASE_IMAGE]);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toEqual([BASE_IMAGE]);
  });

  it("addNewGallery returns null and stores error on insert failure", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("galleries", "insert", {
      data: null,
      error: { message: "insert failed" },
    });

    const result = await useGalleryStore.getState().addNewGallery({
      title: "Trip",
      date: "2026-03-06",
      color: "#123",
      location: "Rome",
    });

    expect(result).toBeNull();
    expect(useGalleryStore.getState().error).toBe("insert failed");
  });

  it("uploadGalleryImages uploads a row, signs it, and updates progress", async () => {
    (generateVariants as jest.Mock).mockResolvedValueOnce(MOCK_VARIANTS);
    (generateBlurhash as jest.Mock).mockResolvedValueOnce("blur-1");

    queueFromSingle("galleries", "select", {
      data: {
        space_id: "space-1",
        cover_image_path: null,
        cover_image_thumb_path: null,
      },
      error: null,
    });
    queueFromSingle("date_images", "insert", {
      data: { id: "img-1", created_at: "2026-03-06T00:00:00.000Z" },
      error: null,
    });
    queueStorage("gallery-private", "upload", { data: { path: "a" }, error: null });
    queueStorage("gallery-private", "upload", { data: { path: "b" }, error: null });
    queueStorage("gallery-private", "upload", { data: { path: "c" }, error: null });
    queueFrom("date_images", "update", { data: null, error: null });
    queueFunction("sign-gallery-urls", {
      data: {
        "img-1": {
          url_thumb: "https://signed/t.jpg",
          url_grid: "https://signed/g.jpg",
          url_orig: "https://signed/o.jpg",
        },
      },
      error: null,
    });
    queueFrom("galleries", "update", { data: null, error: null });

    const ok = await useGalleryStore
      .getState()
      .uploadGalleryImages("g1", ["file://1.jpg"]);

    expect(ok).toBe(true);
    expect(runWithConcurrency).toHaveBeenCalledWith(
      ["file://1.jpg"],
      3,
      expect.any(Function),
    );
    expect(toastMock.update).toHaveBeenCalledWith(
      "toast-id",
      expect.objectContaining({
        message: "Uploaded 1/1 images...",
        progress: 1,
      }),
    );
    expect(useGalleryStore.getState().imagesByGalleryId.g1[0]).toEqual(
      expect.objectContaining({
        id: "img-1",
        url_orig: "https://signed/o.jpg",
      }),
    );
    expect(toastMock.dismiss).toHaveBeenCalledWith("toast-id");
  });

  it("uploadGalleryImages propagates upload failure and still resets loading", async () => {
    (generateVariants as jest.Mock).mockResolvedValueOnce(MOCK_VARIANTS);
    (generateBlurhash as jest.Mock).mockResolvedValueOnce("blur-1");

    queueFromSingle("galleries", "select", {
      data: {
        space_id: "space-1",
        cover_image_path: "covers/existing.jpg",
        cover_image_thumb_path: "covers/existing-thumb.jpg",
      },
      error: null,
    });
    queueFromSingle("date_images", "insert", {
      data: { id: "img-err", created_at: "2026-03-06T00:00:00.000Z" },
      error: null,
    });
    queueStorage("gallery-private", "upload", {
      data: null,
      error: { message: "upload failed" },
    });
    queueStorage("gallery-private", "upload", { data: { path: "b" }, error: null });
    queueStorage("gallery-private", "upload", { data: { path: "c" }, error: null });
    queueStorage("gallery-private", "remove", { data: [], error: null });
    queueFrom("date_images", "delete", { data: null, error: null });

    await expect(
      useGalleryStore.getState().uploadGalleryImages("g1", ["file://1.jpg"]),
    ).rejects.toBeTruthy();

    expect(useGalleryStore.getState().isUploadingByGalleryId.g1).toBe(false);
    expect(toastMock.dismiss).toHaveBeenCalledWith("toast-id");
  });

  it("deleteOneGalleryImage returns false when gallery fetch fails", async () => {
    queueFromSingle("galleries", "select", {
      data: null,
      error: { message: "gallery query failed" },
    });

    const ok = await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1");

    expect(ok).toBe(false);
    expect(useGalleryStore.getState().error).toBe("gallery query failed");
  });

  it("deleteOneGalleryImage returns false when image row fetch fails", async () => {
    queueFromSingle("galleries", "select", {
      data: {
        cover_image_path: "old/grid.jpg",
        cover_image_thumb_path: "old/thumb.jpg",
      },
      error: null,
    });
    queueFromSingle("date_images", "select", {
      data: null,
      error: { message: "image row failed" },
    });

    const ok = await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1");

    expect(ok).toBe(false);
    expect(useGalleryStore.getState().error).toBe("image row failed");
  });

  it("deleteOneGalleryImage returns false when replacement fetch fails", async () => {
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
      data: null,
      error: { message: "replacement failed" },
    });

    const ok = await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1");

    expect(ok).toBe(false);
    expect(useGalleryStore.getState().error).toBe("replacement failed");
  });

  it("deleteOneGalleryImage succeeds for non-cover image even if storage removal fails", async () => {
    useGalleryStore.setState({
      galleries: [
        {
          ...BASE_GALLERY,
          cover_image_path: "cover/grid.jpg",
          cover_image_thumb_path: "cover/thumb.jpg",
          cover_image_blur_hash: "cover-blur",
        },
      ],
      imagesByGalleryId: { g1: [BASE_IMAGE] },
    });
    queueFromSingle("galleries", "select", {
      data: {
        cover_image_path: "cover/grid.jpg",
        cover_image_thumb_path: "cover/thumb.jpg",
      },
      error: null,
    });
    queueFromSingle("date_images", "select", {
      data: {
        storage_path_thumb: "thumb.jpg",
        storage_path_grid: "grid.jpg",
        storage_path_orig: "orig.jpg",
      },
      error: null,
    });
    queueStorage("gallery-private", "remove", {
      data: null,
      error: { message: "storage remove failed" },
    });
    queueFrom("date_images", "delete", { data: null, error: null });

    const ok = await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1");

    expect(ok).toBe(true);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toEqual([]);
    expect(useGalleryStore.getState().galleries[0].cover_image_path).toBe("cover/grid.jpg");
  });

  it("deleteMultipleGalleryImages delegates deletion for each id", async () => {
    const deleteOneSpy = jest
      .spyOn(useGalleryStore.getState(), "deleteOneGalleryImage")
      .mockResolvedValue(true);

    const ok = await useGalleryStore
      .getState()
      .deleteMultipleGalleryImages("g1", ["i1", "i2"]);

    expect(ok).toBe(true);
    expect(deleteOneSpy).toHaveBeenCalledTimes(2);
    expect(deleteOneSpy).toHaveBeenNthCalledWith(1, "g1", "i1");
    expect(deleteOneSpy).toHaveBeenNthCalledWith(2, "g1", "i2");
  });

  it("deleteGallery queries image rows and deletes a small set before gallery row", async () => {
    queueFrom("date_images", "select", {
      data: [BASE_IMAGE],
      error: null,
    });
    queueFromSingle("galleries", "select", {
      data: {
        cover_image_path: "cover/grid.jpg",
        cover_image_thumb_path: "cover/thumb.jpg",
      },
      error: null,
    });
    queueFromSingle("date_images", "select", {
      data: {
        storage_path_thumb: "thumb.jpg",
        storage_path_grid: "grid.jpg",
        storage_path_orig: "orig.jpg",
      },
      error: null,
    });
    queueStorage("gallery-private", "remove", { data: [], error: null });
    queueFrom("date_images", "delete", { data: null, error: null });
    queueFrom("galleries", "delete", { data: null, error: null });

    const ok = await useGalleryStore.getState().deleteGallery("g1");

    expect(ok).toBe(true);
    expect(supabaseMock.from).toHaveBeenCalledWith("date_images");
  });

  it("deleteGallery uses bulk deletion path for large image sets", async () => {
    const rows = Array.from({ length: 10 }, (_, idx) => ({
      id: `i${idx + 1}`,
      storage_path_thumb: `thumb-${idx + 1}.jpg`,
      storage_path_grid: `grid-${idx + 1}.jpg`,
      storage_path_orig: `orig-${idx + 1}.jpg`,
    }));

    queueFrom("date_images", "select", { data: rows, error: null });
    queueStorage("gallery-private", "remove", { data: [], error: null });
    queueFrom("date_images", "delete", { data: null, error: null });
    queueFrom("galleries", "delete", { data: null, error: null });

    const ok = await useGalleryStore.getState().deleteGallery("g1");
    const galleriesCalls = supabaseMock.from.mock.calls.filter(
      ([table]) => table === "galleries",
    );

    expect(ok).toBe(true);
    expect(galleriesCalls).toHaveLength(1);
    expect(supabaseMock.storage.from).toHaveBeenCalledWith("gallery-private");
  });

  it("loadInitialGalleries keeps null cover url when signing thumbnail fails", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", {
      data: [
        {
          ...BASE_GALLERY,
          cover_image_thumb_path: "covers/g1-thumb.jpg",
        },
      ],
      error: null,
    });
    queueStorage("gallery-private", "createSignedUrl", {
      data: null,
      error: { message: "sign fail" },
    });

    const rows = await useGalleryStore.getState().loadInitialGalleries();

    expect(rows).toHaveLength(1);
    expect(rows[0].cover_thumb_url).toBeNull();
  });

  it("loadMoreGalleries uses asc cursor branch with search and keeps null cover url when signing fails", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    useGalleryStore.setState({
      galleries: [BASE_GALLERY],
      galleriesQuery: {
        searchText: "Trip",
        sortDir: "asc",
      },
      galleriesPage: {
        cursor: { date: "2026-03-01", id: "g1" },
        hasMore: true,
        isLoadingInitial: false,
        isLoadingMore: false,
      },
    });
    queueFrom("galleries", "select", {
      data: [
        {
          ...BASE_GALLERY,
          id: "g2",
          date_date: "2026-03-02",
          cover_image_thumb_path: "covers/g2-thumb.jpg",
        },
      ],
      error: null,
    });
    queueStorage("gallery-private", "createSignedUrl", {
      data: null,
      error: { message: "sign fail" },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleries();

    expect(rows.map((x) => x.id)).toEqual(["g1", "g2"]);
    expect(rows.find((x) => x.id === "g2")?.cover_thumb_url).toBeNull();

    const builder = (supabaseMock.from as jest.Mock).mock.results[0].value;
    expect(builder.ilike).toHaveBeenCalledWith("title", "%Trip%");
    expect(builder.or).toHaveBeenCalledWith(
      expect.stringContaining("date_date.gt.2026-03-01"),
    );
  });

  it("loadMoreGalleries keeps previous cursor when fetched page is empty", async () => {
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
      data: [],
      error: null,
    });

    await useGalleryStore.getState().loadMoreGalleries();

    expect(useGalleryStore.getState().galleriesPage.cursor).toEqual({
      date: "2026-03-01",
      id: "g1",
    });
  });

  it("loadMoreGalleryImages returns existing rows when page cursor is missing", async () => {
    useGalleryStore.setState({
      imagesByGalleryId: { g1: [BASE_IMAGE] },
      imagesPageByGalleryId: {
        g1: {
          cursor: null,
          hasMore: true,
          isLoadingInitial: false,
          isLoadingMore: false,
        },
      },
    });

    const rows = await useGalleryStore.getState().loadMoreGalleryImages("g1");

    expect(rows).toEqual([BASE_IMAGE]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("refreshGalleries delegates to loadInitialGalleries", async () => {
    const loadInitialSpy = jest
      .spyOn(useGalleryStore.getState(), "loadInitialGalleries")
      .mockResolvedValue([BASE_GALLERY]);

    const rows = await useGalleryStore.getState().refreshGalleries();

    expect(loadInitialSpy).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([BASE_GALLERY]);
  });

  it("refreshGalleryImages delegates to loadInitialGalleryImages", async () => {
    const loadInitialImagesSpy = jest
      .spyOn(useGalleryStore.getState(), "loadInitialGalleryImages")
      .mockResolvedValue([BASE_IMAGE]);

    const rows = await useGalleryStore.getState().refreshGalleryImages("g1");

    expect(loadInitialImagesSpy).toHaveBeenCalledWith("g1");
    expect(rows).toEqual([BASE_IMAGE]);
  });

  it("fetchGalleries delegates to refreshGalleries", async () => {
    const refreshSpy = jest
      .spyOn(useGalleryStore.getState(), "refreshGalleries")
      .mockResolvedValue([BASE_GALLERY]);

    const rows = await useGalleryStore.getState().fetchGalleries();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([BASE_GALLERY]);
  });

  it("uploadGalleryImages rejects when inserted image row has no id", async () => {
    queueFromSingle("galleries", "select", {
      data: {
        space_id: "space-1",
        cover_image_path: null,
        cover_image_thumb_path: null,
      },
      error: null,
    });
    queueFromSingle("date_images", "insert", {
      data: { created_at: "2026-03-06T00:00:00.000Z" },
      error: null,
    });

    await expect(
      useGalleryStore.getState().uploadGalleryImages("g1", ["file://1.jpg"]),
    ).rejects.toThrow("Failed to create image row");

    expect(generateVariants).not.toHaveBeenCalled();
    expect(useGalleryStore.getState().isUploadingByGalleryId.g1).toBe(false);
    expect(toastMock.dismiss).toHaveBeenCalledWith("toast-id");
  });

  it("uploadGalleryImages cleans up files and db row when image update fails", async () => {
    (generateVariants as jest.Mock).mockResolvedValueOnce(MOCK_VARIANTS);
    (generateBlurhash as jest.Mock).mockResolvedValueOnce("blur-1");

    queueFromSingle("galleries", "select", {
      data: {
        space_id: "space-1",
        cover_image_path: null,
        cover_image_thumb_path: null,
      },
      error: null,
    });
    queueFromSingle("date_images", "insert", {
      data: { id: "img-upd-fail", created_at: "2026-03-06T00:00:00.000Z" },
      error: null,
    });
    queueStorage("gallery-private", "upload", { data: { path: "a" }, error: null });
    queueStorage("gallery-private", "upload", { data: { path: "b" }, error: null });
    queueStorage("gallery-private", "upload", { data: { path: "c" }, error: null });
    queueFrom("date_images", "update", {
      data: null,
      error: { message: "db update failed" },
    });
    queueStorage("gallery-private", "remove", { data: [], error: null });
    queueFrom("date_images", "delete", { data: null, error: null });

    await expect(
      useGalleryStore.getState().uploadGalleryImages("g1", ["file://1.jpg"]),
    ).rejects.toMatchObject({ message: "db update failed" });

    expect(useGalleryStore.getState().isUploadingByGalleryId.g1).toBe(false);
    expect(toastMock.dismiss).toHaveBeenCalledWith("toast-id");
  });
});
