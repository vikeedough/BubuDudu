import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Image } from "react-native";

import GalleryImageViewerModal from "@/components/gallery/GalleryImageViewerModal";
jest.mock("react-native-gesture-handler", () => ({ GestureHandlerRootView: require("react-native").View }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: require("react-native").View }));
jest.mock("@/assets/svgs/back.svg", () => () => null);
const mockSetIndex = jest.fn();
const mockRenew = jest.fn();
let mockGalleryProps: any;
jest.mock("@/hooks/useGalleryImageRefresh", () => ({ useGalleryImageRefresh: () => mockRenew }));
jest.mock("react-native-zoom-toolkit", () => {
    const React = require("react");
    return { fitContainer: (_ratio: number, size: any) => size, Gallery: React.forwardRef(function MockZoomGallery(props: any, ref: any) {
        mockGalleryProps = props; React.useImperativeHandle(ref, () => ({ setIndex: mockSetIndex }));
        return props.renderItem(props.data[0], 0);
    }) };
});
const image = (id: string) => ({ id, gallery_id: "g", created_at: "2026-01-01", url_orig: `orig/${id}`, url_thumb: `thumb/${id}` });
const images = [image("a"),image("b"),image("c")];
const props = { isOpen: true, initialImageId: "a", images, hasMore: true, isLoadingMore: false, onLoadMore: jest.fn(), onClose: jest.fn() };
it("one pending page request, bounded automatic failure, explicit retry and reopen recovery", async () => {
    let reject!: (error: Error) => void;
    const load = jest.fn().mockImplementationOnce(() => new Promise((_r,r) => { reject = r; })).mockResolvedValue(images);
    const view = render(<GalleryImageViewerModal {...props} onLoadMore={load} />);
    await act(async () => { mockGalleryProps.onIndexChange(2); mockGalleryProps.onIndexChange(2); });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("network")));
    await act(async () => mockGalleryProps.onIndexChange(2));
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.press(view.getByLabelText("Retry loading more photos")));
    expect(load).toHaveBeenCalledTimes(2);
    view.rerender(<GalleryImageViewerModal {...props} isOpen={false} onLoadMore={load} />);
    view.rerender(<GalleryImageViewerModal {...props} onLoadMore={load} />);
    await act(async () => mockGalleryProps.onIndexChange(2));
    expect(load).toHaveBeenCalledTimes(3);
});
it("anchors the current photo ID through appends and changed ordering", async () => {
    const view = render(<GalleryImageViewerModal {...props} hasMore={false} />);
    act(() => mockGalleryProps.onIndexChange(1)); // b
    mockSetIndex.mockClear();
    view.rerender(<GalleryImageViewerModal {...props} hasMore={false} images={[...images,image("d")]} />);
    expect(mockSetIndex).not.toHaveBeenCalled();
    view.rerender(<GalleryImageViewerModal {...props} hasMore={false} images={[image("x"),...images]} />);
    expect(mockSetIndex).toHaveBeenCalledWith(2); // still b
});
it("original loading, decode failure and expired URL recovery have visible bounded retry", async () => {
    const view = render(<GalleryImageViewerModal {...props} hasMore={false} />);
    expect(view.getByLabelText("Loading original photo")).toBeTruthy();
    const original = view.UNSAFE_getAllByType(Image).find(i => i.props.source.uri === "orig/a")!;
    fireEvent(original, "error");
    expect(view.getByText("Photo could not load")).toBeTruthy(); expect(mockRenew).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByLabelText("Retry photo")); expect(mockRenew).toHaveBeenLastCalledWith(true);
    fireEvent(original, "load", { nativeEvent: { source: { width: 100, height: 200 } } });
    expect(view.queryByLabelText("Loading original photo")).toBeNull();
});
