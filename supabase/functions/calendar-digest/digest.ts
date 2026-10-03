import {
    type CalendarEvent,
    type CalendarException,
    type CalendarOccurrence,
    occurrenceEnd,
    occurrenceStart,
    selectDigest,
    timeInSingapore,
} from "../_shared/calendar.ts";
import { TelegramSendError } from "../expense-report/telegram.ts";

function formatDigestDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const suffix = day % 100 >= 11 && day % 100 <= 13
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
    const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" })
        .format(new Date(Date.UTC(year, month - 1, day)));
    return `${day}${suffix} ${monthName} ${year}`;
}
function formatDigestTime(value: string): string {
    const [hour, minute] = timeInSingapore(value).split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
export function formatCalendarDigest(
    occurrences: CalendarOccurrence[],
    today: string,
    format: "html" | "plain" = "html",
): string {
    const bold = (value: string) => format === "html" ? `<b>${value}</b>` : value;
    const italic = (value: string) => format === "html" ? `<i>${value}</i>` : value;
    const happening = occurrences.filter((e) =>
        occurrenceStart(e) <= today && occurrenceEnd(e) >= today
    );
    const upcoming = occurrences.filter((e) => occurrenceStart(e) > today);
    const line = (e: CalendarOccurrence, future: boolean) => {
        const date = future ? bold(occurrenceStart(e)) + " · " : "";
        const time = e.is_all_day
            ? "All day"
            : `${formatDigestTime(e.starts_at!)} – ${formatDigestTime(e.ends_at!)}`;
        const span = occurrenceStart(e) !== occurrenceEnd(e)
            ? ` (through ${occurrenceEnd(e)})`
            : "";
        const title = e.title.replace(/[\r\n\t]+/g, " ");
        return `• ${date}${italic(time)} · ${format === "html" ? escapeHtml(title) : title}${span}`;
    };
    const sections = [bold(formatDigestDate(today))];
    if (happening.length) {
        sections.push(bold("Today") + "\n" + happening.map((e) => line(e, false)).join("\n"));
    }
    if (upcoming.length) {
        sections.push(bold("Coming up") + "\n" + upcoming.map((e) => line(e, true)).join("\n"));
    }
    const text = sections.join("\n\n");
    // The shared sender attaches oversized digests as one document message.
    // Never split into multiple messages or silently drop qualifying occurrences.
    return text;
}
export interface DigestDelivery {
    claim: (text: string, occurrences: CalendarOccurrence[]) => Promise<string | null>;
    send: (text: string, plainText: string) => Promise<{ messageId: number }>;
    sent: (id: string, messageId: number) => Promise<void>;
    failed: (id: string) => Promise<void>;
}
export async function deliverCalendarDigest(input: {
    events: CalendarEvent[];
    exceptions: CalendarException[];
    today: string;
    delivery: DigestDelivery;
}) {
    const occurrences = selectDigest(input.events, input.exceptions, input.today);
    if (!occurrences.length) return { status: "empty" as const, count: 0 };
    const text = formatCalendarDigest(occurrences, input.today);
    const id = await input.delivery.claim(text, occurrences);
    if (!id) return { status: "already_claimed" as const, count: 0 };
    let telegram: { messageId: number };
    try {
        telegram = await input.delivery.send(
            text,
            formatCalendarDigest(occurrences, input.today, "plain"),
        );
    } catch (error) {
        // Only a definite rejection can be retried safely. Transport ambiguity stays sending.
        if (error instanceof TelegramSendError && error.definite) await input.delivery.failed(id);
        throw error;
    }
    // A failed post-send ledger write MUST NOT set failed: the durable sending claim blocks duplicates.
    await input.delivery.sent(id, telegram.messageId);
    return { status: "sent" as const, count: occurrences.length, messageId: telegram.messageId };
}
