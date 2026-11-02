import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, Alert, AppState } from "react-native";

import { useGalleryContent } from "@/hooks/useGalleryContent";
import { useSyncStore } from "@/stores/SyncStore";
import { queueFunction, supabaseMock } from "@/tests/mocks/supabase";
import { resetToastMock, toastMock } from "@/tests/mocks/toast";
import {
  multipleDownloadAndSaveImage,
  pickMultipleImages,
} from "@/utils/gallery";

let mockBack: jest.Mock;
let mockGalleryStoreState: any;
let mockIsFocused = true;

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: any) => {
    const React = jest.requireActual<typeof import("react")>("react");
    const focused = mockIsFocused;
    React.useEffect(() => focused ? effect() : undefined, [effect, focused]);
  },
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

jest.mock("@/toast/api", () => {
  const { toastMock } = require("@/tests/mocks/toast");
  return { toast: toastMock };
});

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
    mockIsFocused = true;
    mockBack = jest.fn();
    resetToastMock();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    mockGalleryStoreState = {
      imageSortByGalleryId: {},
      setImageSort: jest.fn(async (id, direction) => { mockGalleryStoreState.imageSortByGalleryId[id] = direction; return []; }),
      loadInitialGalleryImages: jest.fn().mockResolvedValue([]),
      loadMoreGalleryImages: jest.fn(),
      refreshGalleryImages: jest.fn().mockResolvedValue([]),
      refreshGalleries: jest.fn().mockResolvedValue([]),
      refreshImageUrls: jest.fn(async (_gallery, ids) => ids.map((id) => id === "i1" ? { ...image1, url_orig: "https://signed/i1.jpg" } : image2)),
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
    (multipleDownloadAndSaveImage as jest.Mock).mockResolvedValue({ savedIds: [], failedIds: [], skippedIds: [], errors: {}, permissionDenied: false, cancelled: false });
  });

  it("loads initial gallery images on mount", () => {
    renderHook(() => useGalleryContent({ galleryId: "g1" }));

    expect(mockGalleryStoreState.loadInitialGalleryImages).toHaveBeenCalledWith("g1");
  });

  it("sorts images and toggles sorting direction", () => {
    const { result, rerender } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    expect(result.current.images.map((x) => x.id)).toEqual(["i1", "i2"]);

    act(() => {
      result.current.handleToggleSort();
    });

    rerender({});
    expect(mockGalleryStoreState.setImageSort).toHaveBeenCalledWith("g1", "asc");
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

  it("keeps the user on the screen when gallery delete fails", async () => {
    mockGalleryStoreState.deleteGallery.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.setIsDeleteGalleryModalOpen(true);
    });

    await act(async () => {
      await result.current.handleDeleteGallery();
    });

    expect(mockGalleryStoreState.deleteGallery).toHaveBeenCalledWith("g1");
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockGalleryStoreState.refreshGalleries).not.toHaveBeenCalled();
    expect(result.current.isDeleteGalleryModalOpen).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith("Error", "Failed to delete gallery.");
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
    (multipleDownloadAndSaveImage as jest.Mock).mockImplementationOnce(async (images) => ({ savedIds: images.map((image: any) => image.id), failedIds: [], skippedIds: [], errors: {}, permissionDenied: false, cancelled: false }));
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
    ], expect.any(Function), expect.objectContaining({ signal: expect.anything(), onProgress: expect.any(Function) }));
    expect(mockGalleryStoreState.refreshImageUrls).toHaveBeenCalledWith("g1", ["i1"]);
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Download complete",
        message: "Saved 1 photo to BubuDudu.",
      }),
    );
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.editMode).toBe(false);
  });

  it("downloads images without signing when all selected rows already have orig urls", async () => {
    (multipleDownloadAndSaveImage as jest.Mock).mockImplementationOnce(async (images) => ({ savedIds: images.map((image: any) => image.id), failedIds: [], skippedIds: [], errors: {}, permissionDenied: false, cancelled: false }));
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleImageLongPress(image2 as any);
    });

    await act(async () => {
      await result.current.handleDownloadImages();
    });

    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    expect(multipleDownloadAndSaveImage).toHaveBeenCalledWith([image2], expect.any(Function), expect.objectContaining({ signal: expect.anything(), onProgress: expect.any(Function) }));
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Download complete",
        message: "Saved 1 photo to BubuDudu.",
      }),
    );
    expect(result.current.isDownloading).toBe(false);
  });

  it("reports a signing failure and preserves unsuccessful download selection", async () => {
    mockGalleryStoreState.refreshImageUrls.mockRejectedValueOnce(new Error("sign fail"));
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => result.current.handleImageLongPress(image1 as any));
    await act(async () => { await result.current.handleDownloadImages(); });
    expect(multipleDownloadAndSaveImage).not.toHaveBeenCalled();
    expect(result.current.selectedImageIdList).toEqual(["i1"]);
    expect(Alert.alert).toHaveBeenCalledWith("Download failed", "sign fail");
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

  it("keeps only loaded image ids in selection and its derived count", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.applySelectedImageIds(["i1", "missing-id"]);
    });

    expect(result.current.selectedImageIdList).toEqual(["i1"]);
    expect(result.current.selectedImages.map((x) => x.id)).toEqual(["i1"]);
    expect(result.current.editMode).toBe(true);
  });

  it("exits selection mode after deselecting the last image through its body", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => result.current.handleImageLongPress(image1 as any));
    act(() => result.current.handleImagePress(image1 as any));
    expect(result.current.selectedImageIds.size).toBe(0);
    expect(result.current.editMode).toBe(false);
    act(() => result.current.handleImageLongPress(image2 as any));
    expect(result.current.editMode).toBe(true); // selection entry still works
    expect(result.current.selectedImageIdList).toEqual(["i2"]);
  });

  it("prunes deleted selections, keeps remaining selections, and exits after the final removal", () => {
    const { result, rerender } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => result.current.handleImageLongPress(image1 as any));
    act(() => result.current.handleSelectImage(image2 as any));
    mockGalleryStoreState.imagesByGalleryId.g1 = [image2];
    rerender({});
    expect(result.current.selectedImageIdList).toEqual(["i2"]);
    expect(result.current.editMode).toBe(true);
    mockGalleryStoreState.imagesByGalleryId.g1 = [];
    rerender({});
    expect(result.current.selectedImageIds.size).toBe(0);
    expect(result.current.editMode).toBe(false);
  });

  it("does not discard selections while initial refresh temporarily clears rows", () => {
    const { result, rerender } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => result.current.handleImageLongPress(image1 as any));
    mockGalleryStoreState.imagesByGalleryId.g1 = [];
    mockGalleryStoreState.imagesPageByGalleryId.g1.isLoadingInitial = true;
    rerender({});
    expect(result.current.selectedImageIds.size).toBe(0);
    mockGalleryStoreState.imagesByGalleryId.g1 = [image1, image2];
    mockGalleryStoreState.imagesPageByGalleryId.g1.isLoadingInitial = false;
    rerender({});
    expect(result.current.selectedImageIdList).toEqual(["i1"]);
  });

  it("clears selection and its confirmation when navigating away and back", () => {
    const { result, rerender } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => {
      result.current.handleImageLongPress(image1 as any);
      result.current.setIsDeleteImagesModalOpen(true);
    });
    mockIsFocused = false;
    rerender({});
    mockIsFocused = true;
    rerender({});
    expect(result.current.selectedImageIdList).toEqual([]);
    expect(result.current.editMode).toBe(false);
    expect(result.current.isDeleteImagesModalOpen).toBe(false);
  });

  it("does not carry selected ids to a different gallery on the same route", () => {
    mockGalleryStoreState.imagesByGalleryId.g2 = [image1];
    const { result, rerender } = renderHook(({ galleryId }) => useGalleryContent({ galleryId }), { initialProps: { galleryId: "g1" } });
    act(() => result.current.handleImageLongPress(image1 as any));
    rerender({ galleryId: "g2" });
    expect(result.current.selectedImageIds.size).toBe(0);
    expect(result.current.editMode).toBe(false);
  });

  it("does not invoke signing or download permissions for an empty selection", async () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    await act(async () => { await result.current.handleDownloadImages(); });
    expect(mockGalleryStoreState.refreshImageUrls).not.toHaveBeenCalled();
    expect(multipleDownloadAndSaveImage).not.toHaveBeenCalled();
  });

  it("navigates back via handleBack", () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));

    act(() => {
      result.current.handleBack();
    });

    expect(mockBack).toHaveBeenCalled();
  });

  it("owns gallery deletion synchronously and navigates only once for duplicate confirmation", async () => {
    let finish!: (ok: boolean) => void;
    mockGalleryStoreState.deleteGallery.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = result.current.handleDeleteGallery(); second = result.current.handleDeleteGallery(); });
    expect(mockGalleryStoreState.deleteGallery).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); await Promise.all([first, second]); });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("keeps only unsuccessful downloads selected and retries without previously saved photos", async () => {
    (multipleDownloadAndSaveImage as jest.Mock)
      .mockResolvedValueOnce({ savedIds: ["i1"], failedIds: ["i2"], skippedIds: [], errors: {}, permissionDenied: false, cancelled: false })
      .mockResolvedValueOnce({ savedIds: ["i2"], failedIds: [], skippedIds: [], errors: {}, permissionDenied: false, cancelled: false });
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => result.current.handleImageLongPress(image1 as any));
    act(() => result.current.handleSelectImage(image2 as any));
    await act(async () => { await result.current.handleDownloadImages(); });
    expect(result.current.selectedImageIdList).toEqual(["i2"]);
    expect(result.current.editMode).toBe(true);
    await act(async () => { await result.current.handleDownloadImages(); });
    expect((multipleDownloadAndSaveImage as jest.Mock).mock.calls[1][0].map((image: any) => image.id)).toEqual(["i2"]);
    expect(result.current.selectedImageIds.size).toBe(0);
    expect(result.current.editMode).toBe(false);
  });

  it("guards rapid picker taps and releases its busy state on cancel and rejection", async () => {
    let finish!: (photos: string[]) => void;
    (pickMultipleImages as jest.Mock).mockReturnValueOnce(new Promise<string[]>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = result.current.handleAddImages(); second = result.current.handleAddImages(); });
    expect(pickMultipleImages).toHaveBeenCalledTimes(1);
    await act(async () => { finish([]); await Promise.all([first, second]); });
    expect(result.current.isPickingImages).toBe(false);
    expect(mockGalleryStoreState.uploadGalleryImages).not.toHaveBeenCalled();
    (pickMultipleImages as jest.Mock).mockRejectedValueOnce(new Error("native picker failure"));
    await act(async () => { await result.current.handleAddImages(); });
    expect(result.current.isPickingImages).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith("Photos unavailable", expect.any(String));
  });

  it("reconciles ready rows after foreground and focus instead of only renewing URLs", async () => {
    const listeners: ((state: any) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
    mockGalleryStoreState.reconcileGalleryImages = jest.fn().mockResolvedValue([]);
    const { rerender } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    await act(async () => { listeners[0]("background"); listeners[0]("active"); listeners[0]("active"); });
    expect(mockGalleryStoreState.reconcileGalleryImages).toHaveBeenCalledTimes(1);
    mockIsFocused = false; rerender({});
    mockIsFocused = true; rerender({});
    expect(mockGalleryStoreState.reconcileGalleryImages).toHaveBeenCalledTimes(2);
    expect(mockGalleryStoreState.refreshImageUrls).not.toHaveBeenCalled();
  });
  it("reconnect reconciles metadata once while focused and retains cached content while offline", async () => {
    useSyncStore.getState().setOnline(false);
    mockGalleryStoreState.reconcileGalleryImages = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    expect(result.current.images.map(i => i.id)).toEqual(["i2"]);
    await act(async () => useSyncStore.getState().setOnline(true));
    expect(mockGalleryStoreState.reconcileGalleryImages).toHaveBeenCalledTimes(1);
    await act(async () => useSyncStore.getState().setOnline(true));
    expect(mockGalleryStoreState.reconcileGalleryImages).toHaveBeenCalledTimes(1);
  });
  it("announces changed selection counts including clearing the last selected photo", () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    act(() => result.current.handleSelectImage(image1 as any));
    expect(announce).toHaveBeenLastCalledWith("1 photos selected");
    act(() => result.current.handleSelectImage(image1 as any));
    expect(announce).toHaveBeenLastCalledWith("0 photos selected");
  });

  it("Clear cancels a download without restoring its old selection when the native call settles", async () => {
    let finish!: (value: any) => void;
    (multipleDownloadAndSaveImage as jest.Mock).mockImplementationOnce(() => new Promise(resolve=>{finish=resolve;}));
    const { result } = renderHook(() => useGalleryContent({galleryId:"g1"}));
    act(() => result.current.handleSelectImage(image1 as any));
    let pending!: Promise<void>;
    await act(async () => { pending=result.current.handleDownloadImages(); });
    act(() => result.current.handleClearSelection());
    await act(async () => { finish({savedIds:[],failedIds:[],skippedIds:["i1"],cancelled:true,permissionDenied:false}); await pending; });
    expect(result.current.selectedImageIds.size).toBe(0); expect(result.current.editMode).toBe(false);
  });

});
