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
import { queueFunction, supabaseMock } from "@/tests/mocks/supabase";
import {
  multipleDownloadAndSaveImage,
  pickMultipleImages,
} from "@/utils/gallery";

describe("hooks/useGalleryContent", () => {
  const image1 = {
    id: "i1",
    created_at: "2026-03-06T00:00:00.000Z",
    url_orig: undefined,
  };
  const image2 = {
    id: "i2",
    created_at: "2026-03-05T00:00:00.000Z",
    url_orig: "https://x/2.jpg",
  };

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
        g1: [image2, image1],
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

  it("falls back to empty image/page values when gallery page state is missing", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "missing" }));

    expect(result.current.canonicalImages).toEqual([]);
    expect(result.current.hasMoreImages).toBe(false);
    expect(result.current.isLoadingInitialImages).toBe(false);
    expect(result.current.isLoadingMoreImages).toBe(false);
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

  it("returns early when picker provides no images", async () => {
    (pickMultipleImages as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    await act(async () => {
      await result.current.handleAddImages();
    });

    expect(mockGalleryStoreState.uploadGalleryImages).not.toHaveBeenCalled();
    expect(mockGalleryStoreState.refreshGalleries).not.toHaveBeenCalled();
  });

  it("does not refresh galleries when upload fails", async () => {
    (pickMultipleImages as jest.Mock).mockResolvedValueOnce(["file://a.jpg"]);
    mockGalleryStoreState.uploadGalleryImages.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    await act(async () => {
      await result.current.handleAddImages();
    });

    expect(mockGalleryStoreState.uploadGalleryImages).toHaveBeenCalledWith("g1", ["file://a.jpg"]);
    expect(mockGalleryStoreState.refreshGalleries).not.toHaveBeenCalled();
  });

  it("deletes gallery and navigates back", async () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.setIsDeleteGalleryModalOpen(true);
    });

    await act(async () => {
      await result.current.handleDeleteGallery();
    });

    expect(mockGalleryStoreState.deleteGallery).toHaveBeenCalledWith("g1");
    expect(mockBack).toHaveBeenCalled();
    expect(mockGalleryStoreState.refreshGalleries).toHaveBeenCalled();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.isDeleteGalleryModalOpen).toBe(false);
  });

  it("opens the viewer on image press while not in edit mode", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImagePress(image1 as any);
    });

    expect(result.current.viewerInitialImageId).toBe("i1");
    expect(result.current.isViewerOpen).toBe(true);
  });

  it("toggles image selection on image press while in edit mode", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image2 as any);
    });
    act(() => {
      result.current.handleImagePress(image1 as any);
    });
    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i2", "i1"]);

    act(() => {
      result.current.handleImagePress(image1 as any);
    });
    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i2"]);
  });

  it("handleSelectImage removes selected image and exits edit mode when empty", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image1 as any);
    });
    act(() => {
      result.current.handleSelectImage(image1 as any);
    });

    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.editMode).toBe(false);
  });

  it("handleSelectImage removes one image but keeps edit mode when others remain", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image1 as any);
      result.current.handleSelectImage(image2 as any);
    });
    act(() => {
      result.current.handleSelectImage(image1 as any);
    });

    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i2"]);
    expect(result.current.editMode).toBe(true);
  });

  it("handleSelectImage adds image when not currently selected", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleSelectImage(image1 as any);
    });

    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i1"]);
  });

  it("starts edit mode on image long-press and selects that image", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image2 as any);
    });

    expect(result.current.editMode).toBe(true);
    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i2"]);
  });

  it("does nothing on image long-press when already in edit mode", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image2 as any);
    });
    act(() => {
      result.current.handleImageLongPress(image1 as any);
    });

    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i2"]);
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
      result.current.handleImageLongPress(image1 as any);
    });

    await act(async () => {
      await result.current.handleDownloadImages();
    });

    expect(multipleDownloadAndSaveImage).toHaveBeenCalledWith([
      { id: "i1", created_at: "2026-03-06T00:00:00.000Z", url_orig: "https://signed/i1.jpg" },
    ]);
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("sign-gallery-urls", {
      body: { galleryId: "g1", imageIds: ["i1"] },
    });
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.editMode).toBe(false);
  });

  it("downloads images without signing when all selected rows already have orig urls", async () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image2 as any);
    });

    await act(async () => {
      await result.current.handleDownloadImages();
    });

    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    expect(multipleDownloadAndSaveImage).toHaveBeenCalledWith([image2]);
    expect(result.current.isDownloading).toBe(false);
  });

  it("continues download flow when signing fails", async () => {
    queueFunction("sign-gallery-urls", {
      data: null,
      error: { message: "sign fail" },
    });

    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image1 as any);
    });

    await act(async () => {
      await result.current.handleDownloadImages();
    });

    expect(multipleDownloadAndSaveImage).toHaveBeenCalledWith([image1]);
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.editMode).toBe(false);
  });

  it("clears image selection and edit mode", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image1 as any);
    });
    act(() => {
      result.current.handleClearSelection();
    });

    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.editMode).toBe(false);
  });

  it("applySelectedImageIds updates selected ids while selectedImages keeps only known images", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.applySelectedImageIds(["i1", "missing-id"]);
    });

    expect(result.current.selectedImageIdList).toEqual(["i1", "missing-id"]);
    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i1"]);
  });

  it("navigates back via handleBack", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleBack();
    });

    expect(mockBack).toHaveBeenCalled();
  });
});
