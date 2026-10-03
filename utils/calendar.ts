import { parseRule } from "../supabase/functions/_shared/calendar";

export { addDays, CALENDAR_COLOURS, CALENDAR_TIMEZONE, dateInSingapore, daysBetween, expandOccurrences, occurrenceEnd, occurrenceStart, parseRule, recurrenceDates, sortOccurrences, timeInSingapore, validateDraft } from "../supabase/functions/_shared/calendar";

export function recurrenceLabel(rule: string): string {
    const parsed = parseRule(rule)!;
    const unit = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year" }[parsed.frequency];
    return parsed.interval === 1 ? `Every ${unit}` : `Every ${parsed.interval} ${unit}s`;
}
