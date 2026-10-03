import { useEffect } from "react";
import { AppState } from "react-native";

import { supabase } from "@/api/clients/supabaseClient";
import { useCalendarStore } from "@/stores/CalendarStore";
import { subscribeToOnlineStatus } from "@/utils/offline/network";

export function useCalendarRealtime(spaceId: string | null) {
    useEffect(() => {
        if (!spaceId) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const refresh = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { void useCalendarStore.getState().refresh(); }, 150);
        };
        const channel = supabase.channel(`calendar:${spaceId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events", filter: `space_id=eq.${spaceId}` }, refresh)
            .on("postgres_changes", { event: "*", schema: "public", table: "calendar_event_exceptions", filter: `space_id=eq.${spaceId}` }, refresh)
            .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
        const foreground = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
        const online = subscribeToOnlineStatus((connected) => { if (connected) refresh(); });
        return () => { clearTimeout(timer); foreground.remove(); online(); void supabase.removeChannel(channel); };
    }, [spaceId]);
}
