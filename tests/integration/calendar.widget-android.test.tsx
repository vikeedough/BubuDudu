import WidgetNative from "@/modules/calendar-widget";
import { calendarWidgetTask } from "@/widgets/calendar/android-task";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget.android";
import { buildCalendarWidgetData, buildCalendarWidgetSnapshot } from "@/widgets/calendar/snapshot";

import type { WidgetTaskHandlerProps } from "react-native-android-widget";

// Exercise the library's real RemoteViews tree converter, not a JSX mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildWidgetTree } = require("react-native-android-widget/lib/commonjs/api/build-widget-tree");
jest.mock("@/modules/calendar-widget", () => ({ __esModule: true, default: { getCalendarURL: () => "bubududu-dev://calendar-widget", getPayload: jest.fn(), scheduleMidnight: jest.fn() } }));

it.each([[160, 160, "Sun 9 August"], [320, 160, "August 2026"], [320, 350, "Coming up"]])("converts the %sx%s renderer into a native widget tree", (width, height, heading) => {
    const snapshot = buildCalendarWidgetSnapshot({ singaporeDate: "2026-08-09" });
    const tree = buildWidgetTree(<CalendarWidget snapshot={snapshot} width={width} height={height} calendarUrl="bubududu-dev://calendar-widget" />);
    const encoded = JSON.stringify(tree);
    expect(encoded).toContain(heading);
    expect(encoded).toContain("National Day");
    expect(encoded).toContain("OPEN_URI");
    expect(encoded).toContain("bubududu-dev://calendar-widget");
    expect(encoded).toContain("Public holiday · All day");
});
it("shows a safe signed-out native tree when no payload is available", async () => {
    (WidgetNative!.getPayload as jest.Mock).mockReturnValue(null);
    const renderWidget = jest.fn((element) => {
        const tree = JSON.stringify(buildWidgetTree(element));
        expect(tree).toContain("Open BubuDudu to view your calendar");
        expect(tree).toContain("bubududu-dev://calendar-widget");
    });
    await calendarWidgetTask({ widgetInfo: { widgetName: "BubuDuduCalendar", width: 160, height: 160 }, widgetAction: "WIDGET_ADDED", renderWidget } as unknown as WidgetTaskHandlerProps);
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(WidgetNative!.scheduleMidnight).toHaveBeenCalled();
});
it("headless refresh recalculates Today from persisted minimal data at midnight", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-09T16:00:00Z"));
    try {
        const data = buildCalendarWidgetData([], "bubududu-dev://calendar-widget", true, new Date("2026-08-09T15:00:00Z"));
        (WidgetNative!.getPayload as jest.Mock).mockReturnValue(JSON.stringify(data));
        const renderWidget = jest.fn();
        await calendarWidgetTask({ widgetInfo: { widgetName: "BubuDuduCalendar", width: 160, height: 160 }, widgetAction: "WIDGET_UPDATE", renderWidget } as unknown as WidgetTaskHandlerProps);
        expect(renderWidget.mock.calls[0][0].props.snapshot.singaporeDate).toBe("2026-08-10");
        expect(renderWidget.mock.calls[0][0].props.snapshot.today[0].title).toBe("National Day (Observed)");
    } finally { jest.useRealTimers(); }
});
