import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { cancelAnimation, Easing, runOnJS, runOnUI, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { addDays, dateInSingapore, occurrenceEnd, occurrenceStart } from "@/utils/calendar";

import type { CalendarOccurrence } from "@/types/calendar";
import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

export function monthWindow(month: string) {
    const first = month + "-01";
    const from = addDays(first, -new Date(first + "T00:00:00Z").getUTCDay());
    return { from, to: addDays(from, 41) };
}
export function offsetMonth(month: string, offset: number) {
    const date = new Date(month + "-01T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + offset);
    return date.toISOString().slice(0, 7);
}
export function monthPageSlot(month: string) {
    return (Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1) % 3;
}
export function monthSwipeDirection(x: number, y: number, velocityX: number, width: number) {
    "worklet";
    if (width <= 0 || Math.abs(x) <= Math.abs(y) * 1.5) return 0;
    const farEnough = Math.abs(x) >= width * 0.28;
    const flick = Math.abs(x) >= width * 0.06 && Math.abs(velocityX) >= width * 2 && Math.sign(velocityX) === Math.sign(x);
    if (!farEnough && !flick) return 0;
    return x < 0 ? 1 : -1;
}
export default function MonthCalendar({ month, selected, occurrences, adjacentOccurrences = {}, onSelect, onMonth }: {
    month: string; selected: string; occurrences: CalendarOccurrence[];
    adjacentOccurrences?: Record<string, CalendarOccurrence[] | undefined>;
    onSelect: (date: string) => void; onMonth: (offset: number) => void;
}) {
    const [width, setWidth] = useState(0);
    const drag = useSharedValue(0);
    // 0 idle, 1 dragging, 2 settling, 3 awaiting canonical React commit/reset.
    const phase = useSharedValue(0);
    const ticket = useSharedValue(0);
    const renderKey = `${month}:${width}`;
    const currentSlot = monthPageSlot(month);
    const centeredSlot = useSharedValue(currentSlot);
    const latest = useRef({ renderKey, onMonth });
    latest.current = { renderKey, onMonth };
    const committedTicket = useRef(-1);
    const mounted = useRef(true);
    const commit = useCallback((direction: number, sourceKey: string, transitionTicket: number) => {
        if (!mounted.current || latest.current.renderKey !== sourceKey || committedTicket.current === transitionTicket) return;
        committedTicket.current = transitionTicket;
        latest.current.onMonth(direction);
    }, []);
    useLayoutEffect(() => {
        runOnUI(() => {
            "worklet";
            ticket.value++;
            cancelAnimation(drag);
            drag.value = 0;
            centeredSlot.value = currentSlot;
            phase.value = 0;
        })();
    }, [renderKey, currentSlot, centeredSlot, drag, phase, ticket]);
    useLayoutEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; cancelAnimation(drag); };
    }, [drag]);
    const settle = (direction: number) => {
        "worklet";
        phase.value = 2;
        const transitionTicket = ++ticket.value;
        drag.value = withTiming(-direction * width, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
            if (!finished || ticket.value !== transitionTicket || phase.value !== 2) return;
            if (direction) {
                phase.value = 3;
                runOnJS(commit)(direction, renderKey, transitionTicket);
            } else phase.value = 0;
        });
    };
    const navigate = (direction: number) => {
        // Before the first layout there is no measured page to animate.
        if (!width) { onMonth(direction); return; }
        runOnUI(() => {
            "worklet";
            if (phase.value === 0) settle(direction);
        })();
    };
    const selectDate = (date: string) => {
        runOnUI(() => {
            "worklet";
            if (phase.value === 0) runOnJS(onSelect)(date);
        })();
    };
    const intent = Math.max(12, Math.min(24, width * 0.05));
    const swipe = Gesture.Pan().enabled(width > 0).maxPointers(1).activeOffsetX([-intent, intent]).failOffsetY([-intent, intent])
        .onStart(() => { if (phase.value === 0) phase.value = 1; })
        .onUpdate((event) => {
            if (phase.value === 1) drag.value = Math.max(-width, Math.min(width, event.translationX));
        })
        .onEnd((event, success) => {
            if (phase.value === 1) settle(success ? monthSwipeDirection(event.translationX, event.translationY, event.velocityX, width) : 0);
        })
        .onFinalize(() => { if (phase.value === 1) settle(0); });
    const trackStyle = useAnimatedStyle(() => ({
        // Slots stay in place across React commit. Only the reset worklet moves
        // their positions and this offset together, leaving the same pixels.
        transform: [{ translateX: -width + drag.value }],
    }));
    const months = [offsetMonth(month, -1), month, offsetMonth(month, 1)];
    return <GestureDetector gesture={swipe}><View testID="calendar-month-viewport" style={styles.viewport}
        onLayout={(event) => { const next = event.nativeEvent.layout.width; if (next > 0) setWidth(next); }}>
        {width ? <Animated.View testID="calendar-month-track" style={[styles.track, { width: width * 3 }, trackStyle]}>
            {months.sort((a, b) => monthPageSlot(a) - monthPageSlot(b)).map((pageMonth) => <MonthSlot key={pageMonth} month={pageMonth}
                slot={monthPageSlot(pageMonth)} width={width} centeredSlot={centeredSlot} current={pageMonth === month}>
                <MonthPage month={pageMonth} selected={pageMonth === month ? selected : pageMonth + "-01"} occurrences={pageMonth === month ? occurrences : adjacentOccurrences[pageMonth] ?? occurrences}
                    loading={pageMonth !== month && !adjacentOccurrences[pageMonth]} onSelect={selectDate} onMonth={navigate} />
            </MonthSlot>)}
        </Animated.View> : <MonthPage month={month} selected={selected} occurrences={occurrences} onSelect={selectDate} onMonth={navigate} />}
    </View></GestureDetector>;
}
function MonthSlot({ month, slot, width, centeredSlot, current, children }: {
    month: string; slot: number; width: number; centeredSlot: SharedValue<number>; current: boolean; children: ReactNode;
}) {
    const position = useAnimatedStyle(() => {
        const index = (slot - centeredSlot.value + 4) % 3;
        return { transform: [{ translateX: (index - slot) * width }] };
    });
    return <Animated.View testID={`calendar-page-slot-${month}`} style={[{ width }, position]} pointerEvents={current ? "auto" : "none"}
        accessibilityElementsHidden={!current} importantForAccessibility={current ? "auto" : "no-hide-descendants"}>{children}</Animated.View>;
}
function MonthPage({ month, selected, occurrences, loading, onSelect, onMonth }: {
    month: string; selected: string; occurrences: CalendarOccurrence[]; loading?: boolean;
    onSelect: (date: string) => void; onMonth: (offset: number) => void;
}) {
    const { from } = monthWindow(month);
    const title = new Date(month + "-01T00:00:00Z").toLocaleDateString("en-SG", { month: "long", year: "numeric", timeZone: "UTC" });
    return <View testID={`calendar-month-page-${month}`} style={styles.container}>
        <View style={styles.heading}>
            <TouchableOpacity accessibilityLabel="Previous month" onPress={() => onMonth(-1)} style={styles.arrow}><CustomText weight="bold">‹</CustomText></TouchableOpacity>
            <CustomText weight="bold" style={styles.title}>{title}</CustomText>
            {loading && <ActivityIndicator style={styles.previewLoading} size="small" color={Colors.darkGreenText} accessibilityLabel="Loading event indicators" />}
            <TouchableOpacity accessibilityLabel="Next month" onPress={() => onMonth(1)} style={styles.arrow}><CustomText weight="bold">›</CustomText></TouchableOpacity>
        </View>
        <View style={styles.grid}>{["S", "M", "T", "W", "T", "F", "S"].map((day, i) => <View key={i} style={styles.weekday}><CustomText style={styles.muted}>{day}</CustomText></View>)}</View>
        <View style={styles.grid}>{Array.from({ length: 42 }, (_, index) => {
            const date = addDays(from, index);
            const events = occurrences.filter((e) => occurrenceStart(e) <= date && occurrenceEnd(e) >= date);
            const active = date === selected;
            return <TouchableOpacity key={date} accessibilityRole="button" accessibilityLabel={`${date}, ${events.length} events`} accessibilityState={{ selected: active }}
                onPress={() => onSelect(date)} style={[styles.day, active && styles.selected, date === dateInSingapore() && styles.today]}>
                <CustomText weight={active ? "bold" : "medium"} style={[styles.dayText, !date.startsWith(month) && styles.muted]}>{Number(date.slice(8))}</CustomText>
                <View style={styles.dots}>{events.slice(0, 3).map((event) => <View key={event.key} style={[styles.dot, { backgroundColor: Colors[event.colour] }]} />)}{events.length > 3 && <CustomText style={styles.more}>+</CustomText>}</View>
            </TouchableOpacity>;
        })}</View>
    </View>;
}
const styles = StyleSheet.create({
    viewport: { overflow: "hidden", borderRadius: 15, backgroundColor: Colors.white },
    track: { flexDirection: "row" },
    container: { backgroundColor: Colors.white, borderRadius: 15, padding: 8 },
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    previewLoading: { position: "absolute", right: 44 },
    arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 17, color: Colors.darkGreenText },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    weekday: { width: "14.2857%", alignItems: "center", paddingVertical: 6 },
    day: { width: "14.2857%", height: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "transparent" },
    dayText: { color: Colors.darkGreenText, fontSize: 14 },
    selected: { backgroundColor: Colors.yellow },
    today: { borderColor: Colors.green },
    muted: { color: Colors.gray, fontSize: 12 },
    dots: { height: 10, flexDirection: "row", gap: 3, alignItems: "center" },
    dot: { width: 5, height: 5, borderRadius: 3 },
    more: { fontSize: 9, color: Colors.darkGreenText },
});
