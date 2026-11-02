import { waitFor } from "@testing-library/react-native";

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
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space-1");
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
    await waitFor(() => expect(supabaseMock.from).toHaveBeenCalledWith("galleries"));
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
    queueFunction("sign-gallery-cover-urls", {
      data: { "covers/g1-thumb.jpg": "https://signed/thumb.jpg" },
      error: null,
    });

    const result = await useGalleryStore.getState().loadInitialGalleries();

    expect(result[0].cover_thumb_url).toBe("https://signed/thumb.jpg");
    expect(useGalleryStore.getState().galleriesPage.hasMore).toBe(false);
  });

  it("loadInitialGalleries uses batched cover signing function when available", async () => {
    const gallery = {
      ...BASE_GALLERY,
      cover_image_thumb_path: "covers/g1-thumb.jpg",
    };

    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", { data: [gallery], error: null });
    queueFunction("sign-gallery-cover-urls", {
      data: {
        "covers/g1-thumb.jpg": "https://signed/batch-thumb.jpg",
      },
      error: null,
    });

    const result = await useGalleryStore.getState().loadInitialGalleries();

    expect(result[0].cover_thumb_url).toBe("https://signed/batch-thumb.jpg");
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "sign-gallery-cover-urls",
      { body: { paths: ["covers/g1-thumb.jpg"] } },
    );
  });

  it("loadInitialGalleries fails closed when batch signing fails", async () => {
    const gallery = {
      ...BASE_GALLERY,
      cover_image_thumb_path: "covers/g1-thumb.jpg",
    };

    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", { data: [gallery], error: null });
    queueFunction("sign-gallery-cover-urls", {
      data: null,
      error: { message: "batch signer unavailable" },
    });
    queueStorage("gallery-private", "createSignedUrl", {
      data: { signedUrl: "https://signed/fallback-thumb.jpg" },
      error: null,
    });

    const result = await useGalleryStore.getState().loadInitialGalleries();

    expect(result[0].cover_thumb_url).toBeNull();
  });

  it("loadInitialGalleries leaves unresolved paths unsigned", async () => {
    const galleryWithBatchHit = {
      ...BASE_GALLERY,
      id: "g-batch",
      cover_image_thumb_path: "covers/shared-thumb.jpg",
    };
    const galleryWithFallback = {
      ...BASE_GALLERY,
      id: "g-fallback",
      cover_image_thumb_path: "covers/fallback-thumb.jpg",
    };
    const galleryWithDuplicateThumb = {
      ...BASE_GALLERY,
      id: "g-duplicate",
      cover_image_thumb_path: "covers/shared-thumb.jpg",
    };

    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("galleries", "select", {
      data: [galleryWithBatchHit, galleryWithFallback, galleryWithDuplicateThumb],
      error: null,
    });
    queueFunction("sign-gallery-cover-urls", {
      data: {
        "covers/shared-thumb.jpg": "https://signed/shared.jpg",
      },
      error: null,
    });
    queueStorage("gallery-private", "createSignedUrl", {
      data: { signedUrl: "https://signed/fallback.jpg" },
      error: null,
    });

    const result = await useGalleryStore.getState().loadInitialGalleries();

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "sign-gallery-cover-urls",
      { body: { paths: ["covers/shared-thumb.jpg", "covers/fallback-thumb.jpg"] } },
    );
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
    expect(result.find((g) => g.id === "g-batch")?.cover_thumb_url).toBe(
      "https://signed/shared.jpg",
    );
    expect(result.find((g) => g.id === "g-fallback")?.cover_thumb_url).toBe(
      null,
    );
    expect(result.find((g) => g.id === "g-duplicate")?.cover_thumb_url).toBe(
      "https://signed/shared.jpg",
    );
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
    queueFunction("sign-gallery-cover-urls", {
      data: { "covers/g2-thumb.jpg": "https://signed/g2-thumb.jpg" },
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

  it("loadInitialGalleryImages exposes signing failure alongside scoped metadata", async () => {
    queueFrom("date_images", "select", { data: [BASE_IMAGE], error: null });
    queueFunction("sign-gallery-urls", {
      data: null,
      error: { message: "sign failed" },
    });

    const result = await useGalleryStore
      .getState()
      .loadInitialGalleryImages("g1");

    expect(result).toEqual([expect.objectContaining(BASE_IMAGE)]);
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
    const builder = (supabaseMock.from as jest.Mock).mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-03-06",
        date_date: "2026-03-06",
      }),
    );
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

  it("loadMoreGalleries declines an unowned page when no space id is available", async () => {
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

    expect(rows).toEqual([]);
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
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalledWith("sign-gallery-urls", expect.anything());
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
      expect.stringContaining('date.gt."2026-03-01"'),
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

  it("deletes through the authenticated endpoint without a storage fallback", async () => {
    queueFunction("delete-gallery-images", { data: { ok: true } });
    queueFrom("date_images", "select", { data: [] });
    queueFrom("galleries", "select", { data: [] });
    expect(await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1")).toBe(true);
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("delete-gallery-images", { body: { galleryId: "g1", imageIds: ["i1"] } });
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });

  it("retains gallery state and reports a server deletion failure", async () => {
    useGalleryStore.setState({ galleries: [BASE_GALLERY], imagesByGalleryId: { g1: [BASE_IMAGE] } });
    queueFunction("delete-gallery", { error: { message: "404 not found" } });
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space-1");
    queueFrom("galleries", "select", { data: [BASE_GALLERY] });
    queueFrom("date_images", "select", { data: [BASE_IMAGE] });
    expect(await useGalleryStore.getState().deleteGallery("g1")).toBe(false);
    expect(useGalleryStore.getState().galleries).toEqual([expect.objectContaining(BASE_GALLERY)]);
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });

  it("clears gallery caches only after confirmed server deletion", async () => {
    useGalleryStore.setState({ galleries: [BASE_GALLERY], imagesByGalleryId: { g1: [BASE_IMAGE] } });
    queueFunction("delete-gallery", { data: { ok: true } });
    expect(await useGalleryStore.getState().deleteGallery("g1")).toBe(true);
    expect(useGalleryStore.getState().galleries).toEqual([]);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toBeUndefined();
  });

  it("batch deletion reports cleanup failure and never removes rows client-side", async () => {
    queueFunction("delete-gallery-images", { error: { message: "Object cleanup incomplete" } });
    expect(await useGalleryStore.getState().deleteMultipleGalleryImages("g1", ["i1", "i1"])).toBe(false);
    for (const result of (supabaseMock.from as jest.Mock).mock.results) expect(result.value.delete).not.toHaveBeenCalled();
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });
  it("accepts a deferred deletion and does not restore it when refresh fails", async () => {
    useGalleryStore.setState({ imagesByGalleryId: { g1: [BASE_IMAGE, { ...BASE_IMAGE, id: "i2" }] } });
    queueFunction("delete-gallery-images", { data: { ok: true, deferred: true, remaining: 1 } });
    jest.spyOn(useGalleryStore.getState(), "refreshGalleryImages").mockRejectedValueOnce(new Error("refresh failed"));
    jest.spyOn(useGalleryStore.getState(), "refreshGalleries").mockRejectedValueOnce(new Error("refresh failed"));
    expect(await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1")).toBe(true);
    expect(useGalleryStore.getState().imagesByGalleryId.g1.map((i) => i.id)).toEqual(["i2"]);
    expect(useGalleryStore.getState().error).toBeNull();
  });

  it("does not require an app timer or gallery visit after deletion acceptance", async () => {
    useGalleryStore.setState({ imagesByGalleryId: { g1: [BASE_IMAGE] } });
    queueFunction("delete-gallery-images", { data: { ok: true, deferred: true, cleanup: "daily-backend" } });
    jest.spyOn(useGalleryStore.getState(), "refreshGalleryImages").mockResolvedValueOnce([]);
    jest.spyOn(useGalleryStore.getState(), "refreshGalleries").mockResolvedValueOnce([]);
    expect(await useGalleryStore.getState().deleteOneGalleryImage("g1", "i1")).toBe(true);
    expect(useGalleryStore.getState().imagesByGalleryId.g1).toEqual([]);
    useGalleryStore.getState().clear(); // App/account memory can disappear after acceptance.
    expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1);
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });

  it("gallery reads never invoke cleanup", async () => {
    queueFrom("date_images", "select", { data: [] });
    await useGalleryStore.getState().loadInitialGalleryImages("g1");
    expect(supabaseMock.functions.invoke.mock.calls.some((call) => call[1]?.body?.action === "cleanup")).toBe(false);
  });

  it("reconciles rejected batch deletion with ready images still visible", async () => {
    useGalleryStore.setState({ imagesByGalleryId: { g1: [BASE_IMAGE] } });
    queueFunction("delete-gallery-images", { error: { message: "Membership rejected" } });
    queueFrom("date_images", "select", { data: [BASE_IMAGE] });
    expect(await useGalleryStore.getState().deleteMultipleGalleryImages("g1", ["i1"])).toBe(false);
    expect(useGalleryStore.getState().imagesByGalleryId.g1[0].id).toBe("i1");
    expect(useGalleryStore.getState().error).toBe("Membership rejected");
  });

  it("accepts queued whole-gallery deletion and hides it from subsequent gallery reads", async () => {
    useGalleryStore.setState({ galleries: [BASE_GALLERY], imagesByGalleryId: { g1: [BASE_IMAGE] } });
    queueFunction("delete-gallery", { data: { ok: true, deferred: true } });
    expect(await useGalleryStore.getState().deleteGallery("g1")).toBe(true);
    expect(useGalleryStore.getState().galleries).toEqual([]);
    expect(toastMock.show).toHaveBeenCalledWith(expect.objectContaining({ title: "Gallery removed" }));
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space-1");
    queueFrom("galleries", "select", { data: [] });
    await useGalleryStore.getState().refreshGalleries();
    const builder = (supabaseMock.from as jest.Mock).mock.results.find((r, i) => (supabaseMock.from as jest.Mock).mock.calls[i][0] === "galleries")!.value;
    expect(builder.eq).toHaveBeenCalledWith("storage_deleting", false);
    expect(useGalleryStore.getState().galleries).toEqual([]);
  });

});
