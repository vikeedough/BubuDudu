let mockGalleryStoreState: any;

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock("@/stores/GalleryStore", () => ({
  useGalleryStore: (selector: any) => selector(mockGalleryStoreState),
}));

jest.mock("@/utils/gallery", () => ({
  pickMultipleImages: jest.fn(),
  multipleDownloadAndSaveImage: jest.fn(),
}));

jest.mock("@/components/common/ConfirmModal", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return function MockConfirmModal({
    isOpen,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) {
    if (!isOpen) return null;
    return (
      <View>
        <Pressable testID="confirm-delete-images" onPress={onConfirm}>
          <Text>Confirm</Text>
        </Pressable>
        <Pressable testID="close-delete-images" onPress={onClose}>
          <Text>Close</Text>
        </Pressable>
      </View>
    );
  };
});

import { act, fireEvent, render, renderHook } from "@testing-library/react-native";

import DeleteImagesModal from "@/components/gallery/DeleteImagesModal";
import { useGalleryContent } from "@/hooks/useGalleryContent";

describe("integration/gallery open-delete flow", () => {
  beforeEach(() => {
    mockGalleryStoreState = {
      loadInitialGalleryImages: jest.fn(),
      loadMoreGalleryImages: jest.fn(),
      refreshGalleryImages: jest.fn().mockResolvedValue([]),
      refreshGalleries: jest.fn(),
      deleteGallery: jest.fn().mockResolvedValue(true),
      uploadGalleryImages: jest.fn().mockResolvedValue(true),
      deleteMultipleGalleryImages: jest.fn().mockResolvedValue(true),
      imagesByGalleryId: {
        g1: [
          {
            id: "i1",
            created_at: "2026-03-06T00:00:00.000Z",
            url_orig: undefined,
          },
          {
            id: "i2",
            created_at: "2026-03-05T00:00:00.000Z",
            url_orig: "https://x/2.jpg",
          },
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
  });

  it("opens gallery content, selects an image, and deletes it through modal flow", async () => {
    const { result } = renderHook(() => useGalleryContent({ galleryId: "g1" }));
    const onClose = jest.fn();

    act(() => {
      result.current.handleImageLongPress({
        id: "i1",
        created_at: "2026-03-06T00:00:00.000Z",
        url_orig: undefined,
      } as any);
    });

    expect(result.current.editMode).toBe(true);
    expect(result.current.selectedImageIdList).toEqual(["i1"]);

    const modal = render(
      <DeleteImagesModal
        isOpen
        onClose={onClose}
        selectedImageIds={result.current.selectedImageIdList}
        galleryId="g1"
        onCleared={result.current.handleClearSelection}
      />,
    );

    await act(async () => {
      fireEvent.press(modal.getByTestId("confirm-delete-images"));
    });

    expect(mockGalleryStoreState.deleteMultipleGalleryImages).toHaveBeenCalledWith(
      "g1",
      ["i1"],
    );
    expect(mockGalleryStoreState.refreshGalleryImages).toHaveBeenCalledWith("g1");
    expect(result.current.selectedImageIdList).toEqual([]);
    expect(result.current.editMode).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });
});
