// Shared by Expo and the Edge Function. No React Native or Deno dependencies.
export const CALENDAR_TIMEZONE = "Asia/Singapore";
export const CALENDAR_COLOURS = [
    "pink",
    "orange",
    "yellow",
    "green",
    "lightBlue",
    "darkBlue",
] as const;
export type CalendarColour = typeof CALENDAR_COLOURS[number];
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export interface CalendarFields {
    title: string;
    description: string | null;
    colour: CalendarColour;
    is_all_day: boolean;
    starts_at: string | null;
    ends_at: string | null;
    start_date: string | null;
    end_date: string | null;
    timezone: string;
    reminder_days_before: number | null;
}
export interface CalendarEvent extends CalendarFields {
    id: string;
    space_id: string;
    created_by: string;
    recurrence_rule: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
export interface CalendarException extends CalendarFields {
    id: string;
    event_id: string;
    space_id: string;
    original_date: string;
    is_cancelled: boolean;
    created_at: string;
    updated_at: string;
}
export interface CalendarOccurrence extends CalendarFields {
    key: string;
    event_id: string;
    original_date: string;
    recurrence_rule: string | null;
    is_exception: boolean;
}
export type CalendarDraft = CalendarFields & { recurrence_rule: string | null };
const DAY = 86400000;
export function dateInSingapore(value: Date | string = new Date()): string {
    return new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export function timeInSingapore(value: string): string {
    return new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(11, 16);
}
export function addDays(date: string, days: number): string {
    return new Date(Date.parse(date + "T00:00:00Z") + days * DAY).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
    return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY);
}
export function parseRule(rule: string | null): { frequency: Frequency; interval: number } | null {
    if (!rule) return null;
    const match = /^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(?:;INTERVAL=([1-9][0-9]{0,3}))?$/.exec(rule);
    if (!match) throw new Error("Choose a supported repeat frequency and interval (1–9999).");
    return { frequency: match[1] as Frequency, interval: Number(match[2] ?? 1) };
}
export function occurrenceStart(event: CalendarFields): string {
    return event.is_all_day ? event.start_date! : dateInSingapore(event.starts_at!);
}
export function occurrenceEnd(event: CalendarFields): string {
    // Timed end is exclusive, all-day end is inclusive.
    return event.is_all_day
        ? event.end_date!
        : dateInSingapore(new Date(Date.parse(event.ends_at!) - 1));
}
export function validateDraft(event: CalendarDraft): void {
    if (!event.title.trim()) throw new Error("Enter an event title.");
    if (event.title.length > 200) throw new Error("Keep the title within 200 characters.");
    if (!CALENDAR_COLOURS.includes(event.colour)) throw new Error("Choose an event colour.");
    if (event.timezone !== CALENDAR_TIMEZONE) throw new Error("Calendar uses Singapore time.");
    const reminder = event.reminder_days_before;
    if (
        reminder !== null &&
        (!Number.isSafeInteger(reminder) || reminder < 0 || reminder > 2147483647)
    ) {
        throw new Error("Reminder days must be a non-negative whole number.");
    }
    const validDate = (value: string | null) =>
        !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (event.is_all_day) {
        if (
            !validDate(event.start_date) || !validDate(event.end_date) ||
            event.end_date! < event.start_date!
        ) {
            throw new Error("End date must be on or after start date.");
        }
        if (event.starts_at !== null || event.ends_at !== null) {
            throw new Error("All-day events use dates only.");
        }
    } else {
        if (
            !event.starts_at || !event.ends_at || !Number.isFinite(Date.parse(event.starts_at)) ||
            !(Date.parse(event.ends_at) > Date.parse(event.starts_at))
        ) {
            throw new Error("Choose an end time after the start time.");
        }
        if (event.start_date !== null || event.end_date !== null) {
            throw new Error("Timed events use times only.");
        }
    }
    parseRule(event.recurrence_rule);
}

// The V1 RRULE subset has one occurrence per interval, anchored to DTSTART.
// Monthly/yearly invalid dates are skipped per RFC 5545, never clamped.
export function recurrenceDates(event: CalendarEvent, from: string, to: string): string[] {
    const anchor = occurrenceStart(event);
    const rule = parseRule(event.recurrence_rule);
    if (!rule) return anchor >= from && anchor <= to ? [anchor] : [];
    const [year, month, day] = anchor.split("-").map(Number);
    const [fromYear, fromMonth] = from.split("-").map(Number);
    const stepDays = rule.frequency === "DAILY" ? rule.interval : rule.interval * 7;
    const stepMonths = rule.frequency === "YEARLY" ? rule.interval * 12 : rule.interval;
    const daily = rule.frequency === "DAILY" || rule.frequency === "WEEKLY";
    let index = Math.max(
        0,
        daily
            ? Math.floor(daysBetween(anchor, from) / stepDays)
            : Math.floor(((fromYear - year) * 12 + fromMonth - month) / stepMonths),
    );
    const dates: string[] = [];
    const anchorTime = Date.parse(anchor + "T00:00:00Z");
    const endTime = Date.parse(to + "T00:00:00Z");
    for (;; index++) {
        const candidateDate = new Date(anchorTime);
        if (daily) candidateDate.setTime(anchorTime + index * stepDays * DAY);
        else candidateDate.setUTCMonth(month - 1 + index * stepMonths);
        // Compare timestamps before formatting; large custom intervals may jump
        // beyond four-digit years (or beyond Date's range) in a single step.
        if (!Number.isFinite(candidateDate.getTime()) || candidateDate.getTime() > endTime) break;
        const candidate = candidateDate.toISOString().slice(0, 10);
        if (!daily && Number(candidate.slice(8, 10)) !== day) continue;
        if (candidate >= from) dates.push(candidate);
    }
    return dates;
}
function atDate(event: CalendarEvent, originalDate: string): CalendarOccurrence {
    const shift = daysBetween(occurrenceStart(event), originalDate);
    return {
        ...event,
        key: `${event.id}:${originalDate}`,
        event_id: event.id,
        original_date: originalDate,
        is_exception: false,
        start_date: event.is_all_day ? originalDate : null,
        end_date: event.is_all_day ? addDays(event.end_date!, shift) : null,
        starts_at: event.is_all_day
            ? null
            : new Date(Date.parse(event.starts_at!) + shift * DAY).toISOString(),
        ends_at: event.is_all_day
            ? null
            : new Date(Date.parse(event.ends_at!) + shift * DAY).toISOString(),
    };
}
export function sortOccurrences(a: CalendarOccurrence, b: CalendarOccurrence): number {
    return occurrenceStart(a).localeCompare(occurrenceStart(b)) ||
        Number(b.is_all_day) - Number(a.is_all_day) ||
        (a.starts_at ?? "").localeCompare(b.starts_at ?? "") || a.title.localeCompare(b.title);
}
export function expandOccurrences(
    events: CalendarEvent[],
    exceptions: CalendarException[],
    from: string,
    to: string,
): CalendarOccurrence[] {
    const result = new Map<string, CalendarOccurrence>();
    for (const event of events) {
        if (event.deleted_at) continue;
        const overrides = event.recurrence_rule
            ? exceptions.filter((x) => x.event_id === event.id)
            : [];
        const byDate = new Map(overrides.map((x) => [x.original_date, x]));
        const durationDays = daysBetween(occurrenceStart(event), occurrenceEnd(event));
        const originals = new Set(recurrenceDates(event, addDays(from, -durationDays), to));
        // Overrides moved into the window can originate arbitrarily far outside it.
        for (const x of overrides) {
            if (recurrenceDates(event, x.original_date, x.original_date).length) {
                originals.add(x.original_date);
            }
        }
        for (const date of originals) {
            const override = byDate.get(date);
            if (override?.is_cancelled) continue;
            const occurrence = atDate(event, date);
            const resolved = override
                ? { ...occurrence, ...override, key: occurrence.key, is_exception: true }
                : occurrence;
            if (occurrenceStart(resolved) <= to && occurrenceEnd(resolved) >= from) {
                result.set(resolved.key, resolved);
            }
        }
    }
    return [...result.values()].sort(sortOccurrences);
}
export function selectDigest(
    events: CalendarEvent[],
    exceptions: CalendarException[],
    today: string,
): CalendarOccurrence[] {
    const result = new Map<string, CalendarOccurrence>();
    // Query only dates that can qualify, rather than scanning every day up to a large reminder offset.
    for (const event of events) {
        const overrides = exceptions.filter((x) => x.event_id === event.id);
        const dates = new Set([today]);
        for (
            const days of [
                event.reminder_days_before,
                ...overrides.map((x) => x.reminder_days_before),
            ]
        ) {
            // SQL integer reminders can exceed the supported four-digit calendar dates.
            // Such a reminder cannot be due for any app event today.
            if (days !== null && days <= daysBetween(today, "9999-12-31")) {
                dates.add(addDays(today, days));
            }
        }
        for (const date of dates) {
            for (const occurrence of expandOccurrences([event], overrides, date, date)) {
                const start = occurrenceStart(occurrence);
                const happening = start <= today && occurrenceEnd(occurrence) >= today;
                const due = start > today && occurrence.reminder_days_before !== null &&
                    daysBetween(today, start) === occurrence.reminder_days_before;
                if (happening || due) {
                    result.set(occurrence.key, occurrence);
                }
            }
        }
    }
    return [...result.values()].sort(sortOccurrences);
}
