import WidgetNative from "@/modules/calendar-widget";
import { dateInSingapore } from "@/utils/calendar";

import { CalendarWidget } from "./CalendarWidget.android";
import { buildCalendarWidgetSnapshot } from "./snapshot";

import type { CalendarWidgetData } from "./snapshot";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

export function readWidgetData(): CalendarWidgetData | null {
    try {
        const payload = WidgetNative?.getPayload();
        const data = payload ? JSON.parse(payload) : null;
        return data?.schemaVersion === 1 ? data : null;
    } catch { return null; }
}

export async function calendarWidgetTask({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
    if (widgetInfo.widgetName !== "BubuDuduCalendar" || widgetAction === "WIDGET_DELETED") return;
    // No session, store, hooks or network. Native private snapshot storage only.
    const data = readWidgetData();
    const snapshot = buildCalendarWidgetSnapshot({ items: data?.items, holidays: data?.holidays,
        signedIn: data?.signedIn ?? false, generatedAt: data?.generatedAt, singaporeDate: dateInSingapore() });
    renderWidget(<CalendarWidget snapshot={snapshot} width={widgetInfo.width} height={widgetInfo.height} calendarUrl={data?.calendarUrl ?? WidgetNative?.getCalendarURL?.() ?? "bubududu://calendar-widget"} />);
    WidgetNative?.scheduleMidnight();
}
