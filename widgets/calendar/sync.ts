import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import WidgetNative from "@/modules/calendar-widget";

import { refreshPlatformWidgets } from "./refresh";
import { buildCalendarWidgetData } from "./snapshot";

import type { CalendarOccurrence } from "@/types/calendar";

const OWNER_KEY = "calendar-widget-owner-v1"; // App-only storage; never passed to extension.
let owner: string | null = null;
let generation = 0;
let renders: Promise<void> = Promise.resolve();
let metadata: Promise<void> = Promise.resolve();
const url = () => WidgetNative?.getCalendarURL?.() ?? Linking.createURL("calendar-widget");

function refresh() {
    if (!WidgetNative) return Promise.resolve();
    renders = renders.catch(() => {}).then(refreshPlatformWidgets);
    return renders;
}
function write(occurrences: CalendarOccurrence[], signedIn: boolean) {
    WidgetNative?.setPayload(JSON.stringify(buildCalendarWidgetData(occurrences, url(), signedIn)));
    WidgetNative?.scheduleMidnight();
    return refresh();
}

export async function setWidgetOwner(next: string | null): Promise<number> {
    const changed = owner !== null && owner !== next;
    owner = next;
    const ticket = ++generation;
    // Clear synchronously on logout, before any promise/session cleanup.
    if (!next || changed) void write([], !!next).catch(reportWidgetError);
    metadata = metadata.catch(() => {}).then(async () => {
        const previous = await AsyncStorage.getItem(OWNER_KEY);
        if (ticket !== generation) return;
        if (next) {
            if (previous !== next || !WidgetNative?.getPayload()) await write([], true);
            if (ticket === generation) await AsyncStorage.setItem(OWNER_KEY, next);
        } else { await AsyncStorage.removeItem(OWNER_KEY); }
    });
    await metadata;
    await renders;
    return ticket;
}

export async function clearWidgetPrivateData() {
    await setWidgetOwner(null);
}
export function publishCalendarWidget(occurrences: CalendarOccurrence[], ticket: number) {
    if (!owner || ticket !== generation) return Promise.resolve();
    return write(occurrences, true);
}
export function reportWidgetError(error: unknown) {
    // Never log payloads or event titles.
    console.warn("Calendar widget update failed", error instanceof Error ? error.message : "Native widget unavailable");
}
