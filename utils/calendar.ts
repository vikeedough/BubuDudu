import { parseRule } from "../supabase/functions/_shared/calendar";

export { addDays, CALENDAR_COLOURS, CALENDAR_TIMEZONE, dateInSingapore, daysBetween, expandOccurrences, occurrenceEnd, occurrenceStart, parseRule, recurrenceDates, sortOccurrences, timeInSingapore, validateDraft } from "../supabase/functions/_shared/calendar";

export function recurrenceLabel(rule: string): string {
    const parsed = parseRule(rule)!;
    const unit = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year" }[parsed.frequency];
    return parsed.interval === 1 ? `Every ${unit}` : `Every ${parsed.interval} ${unit}s`;
}

export function formatCalendarDate(date: string, weekday = true): string {
    const day = Number(date.slice(8));
    const suffix = day >= 11 && day <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
    const value = new Date(date + "T00:00:00Z");
    const dayName = value.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    const month = value.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
    return `${weekday ? dayName + ", " : ""}${day}${suffix} ${month} ${date.slice(0, 4)}`;
}
export function oneCalendarYearAfter(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
    return `${year + 1}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
export function repeatDisplayLabel(rule: string): string {
    const parsed = parseRule(rule)!;
    if (parsed.interval === 1) return { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly" }[parsed.frequency];
    return recurrenceLabel(rule);
}
