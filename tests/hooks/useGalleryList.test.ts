import { act, renderHook } from "@testing-library/react-native";

let mockPush: jest.Mock;
let mockGalleryStoreState: any;

jest.mock("expo-router", () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
  },
}));

jest.mock("@/stores/GalleryStore", () => ({
  useGalleryStore: (selector: any) => selector(mockGalleryStoreState),
}));

import { useGalleryList } from "@/hooks/useGalleryList";

describe("hooks/useGalleryList", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush = jest.fn();

    mockGalleryStoreState = {
      galleries: [
        {
          id: "g1",
          title: "Trip",
          date: new Date("2026-03-06T00:00:00.000Z"),
          color: "#FF0000",
          location: "Paris",
        },
      ],
      galleriesQuery: {
        searchText: "",
        sortDir: "desc",
      },
      galleriesPage: {
        isLoadingInitial: false,
        isLoadingMore: false,
        hasMore: true,
      },
      loadInitialGalleries: jest.fn(),
      loadMoreGalleries: jest.fn(),
      refreshGalleries: jest.fn(),
      setGalleriesQuery: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads initial galleries on mount", () => {
    renderHook(() => useGalleryList());

    expect(mockGalleryStoreState.loadInitialGalleries).toHaveBeenCalledTimes(1);
  });

  it("debounces search updates before dispatching query change", () => {
    const { result } = renderHook(() => useGalleryList());

    act(() => {
      result.current.handleSearchChange("tri");
    });

    expect(mockGalleryStoreState.setGalleriesQuery).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockGalleryStoreState.setGalleriesQuery).toHaveBeenCalledWith({
      searchText: "tri",
    });
  });

  it("toggles sort direction", () => {
    const { result } = renderHook(() => useGalleryList());

    act(() => {
      result.current.handleToggleSort();
    });

    expect(mockGalleryStoreState.setGalleriesQuery).toHaveBeenCalledWith({
      sortDir: "asc",
    });
  });

  it("navigates to gallery content with normalized params", () => {
    const { result } = renderHook(() => useGalleryList());

    act(() => {
      result.current.navigateToGalleryContent(mockGalleryStoreState.galleries[0]);
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/(gallery)/galleryContent",
      params: expect.objectContaining({
        galleryId: "g1",
        galleryTitle: "Trip",
        galleryLocation: "Paris",
      }),
    });
    expect(mockPush.mock.calls[0][0].params.galleryDate).toContain("2026-03-06");
  });

  it("navigates with string date unchanged", () => {
    const { result } = renderHook(() => useGalleryList());
    const gallery = {
      ...mockGalleryStoreState.galleries[0],
      id: "g2",
      date: "2026-03-01",
    };

    act(() => {
      result.current.navigateToGalleryContent(gallery);
    });

    expect(mockPush.mock.calls[0][0].params.galleryDate).toBe("2026-03-01");
  });

  it("opens and closes new gallery modal", () => {
    const { result } = renderHook(() => useGalleryList());

    expect(result.current.isNewGalleryModalOpen).toBe(false);
    act(() => {
      result.current.handleAddNewGallery();
    });
    expect(result.current.isNewGalleryModalOpen).toBe(true);
    act(() => {
      result.current.handleCloseModal();
    });
    expect(result.current.isNewGalleryModalOpen).toBe(false);
  });

  it("refresh delegates to refreshGalleries", async () => {
    mockGalleryStoreState.refreshGalleries.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGalleryList());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGalleryStoreState.refreshGalleries).toHaveBeenCalledTimes(1);
  });
});
