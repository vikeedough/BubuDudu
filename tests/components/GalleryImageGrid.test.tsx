import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";

import GalleryImageGrid from "@/components/gallery/GalleryImageGrid";
jest.mock("@/components/gallery/GalleryImageItem", () => () => null);
jest.mock("@shopify/flash-list", () => ({ FlashList: ({ data, ListEmptyComponent }: any) => data.length ? null : ListEmptyComponent }));
const props = { images: [], isLoadingInitial: false, isLoadingMore: false, hasMore: false, onEndReached: jest.fn(), editMode: false, selectedImageIds: new Set<string>(), onImagePress: jest.fn(), onImageLongPress: jest.fn(), onImageSelect: jest.fn() };
it("distinguishes a failed read from an actually empty gallery and exposes Retry", async () => {
    const refresh = jest.fn().mockResolvedValue([]);
    const view = render(<GalleryImageGrid {...props} error="Connection failed" onRefresh={refresh} />);
    expect(view.getByText("Photos could not load")).toBeTruthy();
    expect(view.queryByText("No photos here yet")).toBeNull();
    await act(async () => fireEvent.press(view.getByLabelText("Retry loading photos")));
    expect(refresh).toHaveBeenCalledTimes(1);
    view.rerender(<GalleryImageGrid {...props} error={null} onRefresh={refresh} />);
    expect(view.getByText("No photos here yet")).toBeTruthy();
});
it("offline metadata does not claim uncached image bytes are available", () => {
    const view = render(<GalleryImageGrid {...props} isOnline={false} onRefresh={jest.fn()} />);
    expect(view.getByText("No cached photos")).toBeTruthy();
    expect(view.getByText(/Only photos already cached/)).toBeTruthy();
    expect(view.queryByLabelText("Retry loading photos")).toBeNull();
});
