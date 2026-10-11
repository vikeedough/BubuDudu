import { Redirect, useLocalSearchParams } from "expo-router";

import { isCalendarDate } from "@/data/singaporePublicHolidays";
import { useAuthContext } from "@/hooks/useAuthContext";

// Public entry route gates cold widget launches on auth before opening Calendar.
export default function CalendarWidgetLink() {
    const { session, isLoading } = useAuthContext();
    const { date } = useLocalSearchParams<{ date?: string }>();
    if (isLoading) return null;
    if (!session) return <Redirect href="/(login)" />;
    return <Redirect href={{ pathname: "/(tabs)/(calendar)/calendar", params: typeof date === "string" && isCalendarDate(date) ? { date } : {} }} />;
}
