import { useCallback, useEffect, useRef } from "react";

import { useGalleryStore, type GalleryImage } from "@/stores/GalleryStore";
import { getIsOnline } from "@/utils/offline/network";

export function useGalleryImageRefresh(image: GalleryImage) {
    const retried = useRef(false);
    const refresh = useCallback(() => {
        if (!getIsOnline()) return;
        void useGalleryStore.getState().refreshImageUrls(image.gallery_id, [image.id], true).catch(() => undefined);
    }, [image.gallery_id, image.id]);
    useEffect(() => { retried.current = false; }, [image.id]);
    useEffect(() => {
        if (!image.urls_expires_at) return;
        const delay = Date.parse(image.urls_expires_at) - Date.now() - 30000;
        const timer = setTimeout(refresh, Math.max(0, delay));
        return () => clearTimeout(timer);
    }, [image.urls_expires_at, refresh]);
    return useCallback((explicit?: unknown) => {
        if (retried.current && explicit !== true) return;
        retried.current = true;
        refresh();
    }, [refresh]);
}
