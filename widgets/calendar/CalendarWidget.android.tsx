import { FlexWidget, TextWidget } from "react-native-android-widget";

import { Colors } from "@/constants/colors";

import { widgetItemTime } from "./snapshot";

import type { CalendarWidgetItem, CalendarWidgetSnapshot } from "./snapshot";
import type { TextWidgetStyle } from "react-native-android-widget";

const text: TextWidgetStyle = { color: Colors.darkGreenText as `#${string}`, fontFamily: "Raleway-Regular", fontSize: 12 };
const bold: TextWidgetStyle = { ...text, fontFamily: "Raleway-Bold", fontWeight: "bold" };

export function CalendarWidget({ snapshot, width, height, calendarUrl }: { snapshot: CalendarWidgetSnapshot; width: number; height: number; calendarUrl: string }) {
    const size = width < 260 || height < 150 ? "small" : height >= 300 ? "large" : "medium";
    const gridWidth = size === "medium" ? Math.floor((width - 36) * 0.53) : width - 32;
    const cellWidth = Math.floor(gridWidth / 7);
    const cellHeight = size === "large" ? 19 : 15;
    const todayLimit = size === "large" && height < 340 ? 1 : 2;
    const upcomingLimit = height >= 380 ? 2 : 1;
    const row = (item: CalendarWidgetItem, upcoming = false) => <FlexWidget key={item.id} style={{ flexDirection: "row", alignItems: "center", marginTop: 5, width: "match_parent" }}
        clickAction="OPEN_URI" clickActionData={{ uri: `${calendarUrl}?date=${item.date}` }} accessibilityLabel={`${item.title}, ${widgetItemTime(item)}`}>
        <FlexWidget style={{ width: 4, height: 26, backgroundColor: Colors[item.colorKey] as `#${string}`, borderRadius: 2, marginRight: 6 }} />
        <FlexWidget style={{ flex: 1 }}>
            <TextWidget text={item.title} style={bold} truncate="END" maxLines={1} />
            <TextWidget text={`${upcoming ? item.date.slice(5) + " · " : ""}${widgetItemTime(item)}`} style={{ ...text, fontSize: 10, color: Colors.brownText as `#${string}` }} truncate="END" maxLines={1} />
        </FlexWidget>
    </FlexWidget>;
    const today = <FlexWidget style={{ flex: 1 }}>
        {size !== "small" && <TextWidget text="Today" style={bold} />}
        {snapshot.today.length ? snapshot.today.slice(0, todayLimit).map((item) => row(item)) : <TextWidget text={snapshot.emptyText} style={{ ...text, marginTop: 6 }} maxLines={3} />}
    </FlexWidget>;
    const grid = <FlexWidget style={{ width: gridWidth }}>
        <FlexWidget style={{ flexDirection: "row" }}>{["S", "M", "T", "W", "T", "F", "S"].map((day, i) => <TextWidget key={i} text={day} style={{ ...bold, width: cellWidth, textAlign: "center", fontSize: 9 }} />)}</FlexWidget>
        {Array.from({ length: 6 }, (_, week) => <FlexWidget key={week} style={{ flexDirection: "row" }}>
            {snapshot.month.days.slice(week * 7, week * 7 + 7).map((day) => <FlexWidget key={day.date} style={{ width: cellWidth, height: cellHeight, alignItems: "center", justifyContent: "center", borderRadius: 6, ...(day.isToday ? { backgroundColor: Colors.yellow as `#${string}` } : {}) }}
                clickAction="OPEN_URI" clickActionData={{ uri: `${calendarUrl}?date=${day.date}` }}>
                <TextWidget text={String(day.day)} style={{ ...text, fontSize: size === "large" ? 11 : 9, color: (day.inMonth ? Colors.darkGreenText : Colors.gray) as `#${string}` }} />
                <FlexWidget style={{ flexDirection: "row", height: 3 }}>{day.colorKeys.slice(0, 3).map((color) => <FlexWidget key={color} style={{ width: 3, height: 3, borderRadius: 2, marginRight: 1, backgroundColor: Colors[color] as `#${string}` }} />)}</FlexWidget>
            </FlexWidget>)}
        </FlexWidget>)}
    </FlexWidget>;
    return <FlexWidget style={{ width: "match_parent", height: "match_parent", padding: 16, borderRadius: 16, backgroundColor: Colors.backgroundPink as `#${string}`, overflow: "hidden" }}
        clickAction="OPEN_URI" clickActionData={{ uri: calendarUrl }} accessibilityLabel="Open BubuDudu Calendar">
        <TextWidget text={size === "small" ? snapshot.dateLabel : snapshot.month.label} style={{ ...bold, fontSize: size === "large" ? 17 : 14, marginBottom: 8 }} truncate="END" maxLines={1} />
        {!snapshot.signedIn ? <TextWidget text={snapshot.emptyText} style={text} maxLines={3} /> : size === "small" ? today : size === "medium" ?
            <FlexWidget style={{ flexDirection: "row" }}>{grid}<FlexWidget style={{ flex: 1, marginLeft: 12 }}>{today}</FlexWidget></FlexWidget> :
            <FlexWidget>{grid}<FlexWidget style={{ marginTop: 8 }}>{today}</FlexWidget><TextWidget text="Coming up" style={{ ...bold, marginTop: 8 }} />{snapshot.upcoming.slice(0, upcomingLimit).map((item) => row(item, true))}</FlexWidget>}
    </FlexWidget>;
}
