import { useCallback, useState } from "react";

type AsyncFn<T = void> = () => Promise<T> | T;

export function usePullToRefresh<T = void>(refreshFn: AsyncFn<T>) {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await Promise.resolve(refreshFn());
        } catch (err) {
            console.warn("[PTR] refresh failed:", err);
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, refreshFn]);

    return { refreshing, onRefresh };
}
