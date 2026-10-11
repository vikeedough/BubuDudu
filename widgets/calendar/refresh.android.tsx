import { getWidgetInfo, requestWidgetUpdateById } from "react-native-android-widget";

import WidgetNative from "@/modules/calendar-widget";
import { dateInSingapore } from "@/utils/calendar";

import { readWidgetData } from "./android-task";
import { CalendarWidget } from "./CalendarWidget.android";
import { buildCalendarWidgetSnapshot } from "./snapshot";


export async function refreshPlatformWidgets() {
    // Render from the latest storage at callback time, so an account switch
    // cannot race a closure holding an earlier account's payload.
    for (const widget of await getWidgetInfo("BubuDuduCalendar")) {
        await requestWidgetUpdateById({ widgetName: widget.widgetName, widgetId: widget.widgetId, renderWidget: () => {
            const data = readWidgetData();
            const snapshot = buildCalendarWidgetSnapshot({ items: data?.items, holidays: data?.holidays, signedIn: data?.signedIn ?? false, singaporeDate: dateInSingapore(), generatedAt: data?.generatedAt });
            return <CalendarWidget snapshot={snapshot} width={widget.width} height={widget.height} calendarUrl={data?.calendarUrl ?? WidgetNative?.getCalendarURL?.() ?? "bubududu://calendar-widget"} />;
        } });
    }
}
