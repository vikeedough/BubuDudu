import React from "react";
import { render } from "@testing-library/react-native";

import GalleryImageGrid from "@/components/gallery/GalleryImageGrid";
import GalleryListGrid from "@/components/gallery/GalleryListGrid";

const mockGalleryImageItemRender = jest.fn();
const mockGalleryItemRender = jest.fn();
const mockOnRefresh = jest.fn();
let mockGalleryStoreState: any;

jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    FlashList: ({
      data = [],
      renderItem,
      ItemSeparatorComponent,
      ListFooterComponent,
    }: any) => (
      <View>
        {data.map((item: any, index: number) => (
          <View key={String(index)}>
            {renderItem({ item, index })}
            {ItemSeparatorComponent ? <ItemSeparatorComponent /> : null}
          </View>
        ))}
        {typeof ListFooterComponent === "function"
          ? <ListFooterComponent />
          : ListFooterComponent}
      </View>
    ),
  };
});

jest.mock("@/components/gallery/GalleryImageItem", () => {
  const React = require("react");
  const Comp = React.memo((props: any) => {
    mockGalleryImageItemRender(props);
    return null;
  });
  Comp.displayName = "MockGalleryImageItem";
  return Comp;
});

jest.mock("@/components/gallery/GalleryItem", () => {
  const React = require("react");
  const Comp = React.memo((props: any) => {
    mockGalleryItemRender(props);
    return null;
  });
  Comp.displayName = "MockGalleryItem";
  return Comp;
});

jest.mock("@/stores/GalleryStore", () => ({
  Gallery: {},
  useGalleryStore: (selector: any) => selector(mockGalleryStoreState),
}));

jest.mock("@/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({
    refreshing: false,
    onRefresh: mockOnRefresh,
  }),
}));

describe("Gallery performance guardrails", () => {
  beforeEach(() => {
    mockGalleryImageItemRender.mockClear();
    mockGalleryItemRender.mockClear();
    mockOnRefresh.mockClear();

    mockGalleryStoreState = {
      refreshGalleries: jest.fn(),
      loadMoreGalleries: jest.fn(),
      galleriesPage: {
        isLoadingMore: false,
        hasMore: false,
      },
    };
  });

  it("GalleryImageGrid avoids extra item renders on noop rerender", () => {
    const images = [
      {
        id: "i1",
        gallery_id: "g1",
        storage_path_thumb: "thumb-1.jpg",
        storage_path_grid: "grid-1.jpg",
        storage_path_orig: "orig-1.jpg",
        blur_hash: null,
        created_at: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "i2",
        gallery_id: "g1",
        storage_path_thumb: "thumb-2.jpg",
        storage_path_grid: "grid-2.jpg",
        storage_path_orig: "orig-2.jpg",
        blur_hash: null,
        created_at: "2026-03-02T00:00:00.000Z",
      },
    ];
    const selectedImageIds = new Set<string>();
    const onImagePress = jest.fn();
    const onImageLongPress = jest.fn();
    const onImageSelect = jest.fn();
    const onEndReached = jest.fn();

    const { rerender } = render(
      <GalleryImageGrid
        images={images as any}
        isLoadingInitial={false}
        isLoadingMore={false}
        onEndReached={onEndReached}
        editMode={false}
        selectedImageIds={selectedImageIds}
        onImagePress={onImagePress}
        onImageLongPress={onImageLongPress}
        onImageSelect={onImageSelect}
      />,
    );

    expect(mockGalleryImageItemRender).toHaveBeenCalledTimes(2);

    rerender(
      <GalleryImageGrid
        images={images as any}
        isLoadingInitial={false}
        isLoadingMore={false}
        onEndReached={onEndReached}
        editMode={false}
        selectedImageIds={selectedImageIds}
        onImagePress={onImagePress}
        onImageLongPress={onImageLongPress}
        onImageSelect={onImageSelect}
      />,
    );

    expect(mockGalleryImageItemRender).toHaveBeenCalledTimes(2);
  });

  it("GalleryListGrid avoids extra item renders on noop rerender", () => {
    const galleries = [
      {
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
      },
      {
        id: "g2",
        space_id: "space-1",
        title: "Dinner",
        date: "2026-03-02",
        date_date: "2026-03-02",
        color: "#00FF00",
        location: "Rome",
        cover_image_path: null,
        cover_image_thumb_path: null,
        cover_image_blur_hash: null,
      },
    ];
    const onGalleryPress = jest.fn();

    const { rerender } = render(
      <GalleryListGrid
        galleries={galleries as any}
        onGalleryPress={onGalleryPress}
      />,
    );

    expect(mockGalleryItemRender).toHaveBeenCalledTimes(2);

    rerender(
      <GalleryListGrid
        galleries={galleries as any}
        onGalleryPress={onGalleryPress}
      />,
    );

    expect(mockGalleryItemRender).toHaveBeenCalledTimes(2);
  });
});
