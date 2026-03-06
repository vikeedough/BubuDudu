import { act, renderHook, waitFor } from "@testing-library/react-native";

import { usePullToRefresh } from "@/hooks/usePullToRefresh";

describe("hooks/usePullToRefresh", () => {
  it("toggles refreshing state around successful refresh", async () => {
    const refreshFn = jest.fn(async () => {
      await Promise.resolve();
    });

    const { result } = renderHook(() => usePullToRefresh(refreshFn));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
  });

  it("swallows errors and still resets refreshing", async () => {
    const refreshFn = jest.fn(async () => {
      throw new Error("failure");
    });

    const { result } = renderHook(() => usePullToRefresh(refreshFn));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
  });

  it("prevents concurrent refreshes while already refreshing", async () => {
    let resolveRefresh: (() => void) | null = null;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    const refreshFn = jest.fn(() => refreshPromise);

    const { result } = renderHook(() => usePullToRefresh(refreshFn));

    let firstCall!: Promise<void>;
    await act(async () => {
      firstCall = result.current.onRefresh();
    });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(true);
    });

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(refreshFn).toHaveBeenCalledTimes(1);

    resolveRefresh?.();

    await act(async () => {
      await firstCall;
    });

    expect(result.current.refreshing).toBe(false);
  });
});
