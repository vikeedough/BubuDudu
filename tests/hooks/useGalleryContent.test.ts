let mockBack: jest.Mock;
let mockGalleryStoreState: any;

jest.mock("expo-router", () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
  },
}));

jest.mock("@/stores/GalleryStore", () => ({
  useGalleryStore: (selector: any) => selector(mockGalleryStoreState),
}));

jest.mock("@/utils/gallery", () => ({
  pickMultipleImages: jest.fn(),
  multipleDownloadAndSaveImage: jest.fn(),
}));

import { act, renderHook } from "@testing-library/react-native";

import { useGalleryContent } from "@/hooks/useGalleryContent";
import { queueFunction } from "@/tests/mocks/supabase";
import {
  multipleDownloadAndSaveImage,
  pickMultipleImages,
} from "@/utils/gallery";

describe("hooks/useGalleryContent", () => {
  beforeEach(() => {
    mockBack = jest.fn();

    mockGalleryStoreState = {
      loadInitialGalleryImages: jest.fn(),
      loadMoreGalleryImages: jest.fn(),
      refreshGalleryImages: jest.fn(),
      refreshGalleries: jest.fn(),
      deleteGallery: jest.fn().mockResolvedValue(true),
      uploadGalleryImages: jest.fn().mockResolvedValue(true),
      imagesByGalleryId: {
        g1: [
          { id: "i2", created_at: "2026-03-05T00:00:00.000Z", url_orig: "https://x/2.jpg" },
          { id: "i1", created_at: "2026-03-06T00:00:00.000Z", url_orig: undefined },
        ],
      },
      imagesPageByGalleryId: {
        g1: {
          hasMore: true,
          isLoadingInitial: false,
          isLoadingMore: false,
        },
      },
    };

    (pickMultipleImages as jest.Mock).mockReset();
    (multipleDownloadAndSaveImage as jest.Mock).mockReset();
    (multipleDownloadAndSaveImage as jest.Mock).mockResolvedValue(undefined);
  });

  it("loads initial gallery images on mount", () => {
    renderHook(() => useGalleryContent({ galleryId: "g1" }));

    expect(mockGalleryStoreState.loadInitialGalleryImages).toHaveBeenCalledWith("g1");
  });

  it("sorts images and toggles sorting direction", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    expect(result.current.images.map((x) => x.id)).toEqual(["i1", "i2"]);

    act(() => {
      result.current.handleToggleSort();
    });

    expect(result.current.images.map((x) => x.id)).toEqual(["i2", "i1"]);
  });

  it("adds images and refreshes galleries when upload succeeds", async () => {
    (pickMultipleImages as jest.Mock).mockResolvedValueOnce(["file://a.jpg"]);

    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    await act(async () => {
      await result.current.handleAddImages();
    });

    expect(mockGalleryStoreState.uploadGalleryImages).toHaveBeenCalledWith("g1", ["file://a.jpg"]);
    expect(mockGalleryStoreState.refreshGalleries).toHaveBeenCalled();
  });

  it("deletes gallery and navigates back", async () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    await act(async () => {
      await result.current.handleDeleteGallery();
    });

    expect(mockGalleryStoreState.deleteGallery).toHaveBeenCalledWith("g1");
    expect(mockBack).toHaveBeenCalled();
    expect(mockGalleryStoreState.refreshGalleries).toHaveBeenCalled();
  });

  it("signs missing selected image urls before download", async () => {
    queueFunction("sign-gallery-urls", {
      data: {
        i1: { url_orig: "https://signed/i1.jpg" },
      },
      error: null,
    });

    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.setSelectedImages([
        { id: "i1", created_at: "2026-03-06T00:00:00.000Z", url_orig: undefined } as any,
      ]);
      result.current.setEditMode(true);
    });

    await act(async () => {
      await result.current.handleDownloadImages();
    });

    expect(multipleDownloadAndSaveImage).toHaveBeenCalled();
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.editMode).toBe(false);
  });
});
