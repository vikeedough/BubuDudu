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

export function formatCalendarDigest(occurrences: CalendarOccurrence[], today: string): string {
    const happening = occurrences.filter((e) =>
        occurrenceStart(e) <= today && occurrenceEnd(e) >= today
    );
    const upcoming = occurrences.filter((e) => occurrenceStart(e) > today);
    const line = (e: CalendarOccurrence, future: boolean) => {
        const date = future ? occurrenceStart(e) + " · " : "";
        const time = e.is_all_day
            ? "All day"
            : `${timeInSingapore(e.starts_at!)}–${timeInSingapore(e.ends_at!)}`;
        const span = occurrenceStart(e) !== occurrenceEnd(e)
            ? ` (through ${occurrenceEnd(e)})`
            : "";
        return `• ${date}${time} · ${e.title.replace(/[\r\n\t]+/g, " ")}${span}`;
    };
    const sections = [`Calendar · ${today}\nSingapore time`];
    if (happening.length) {
        sections.push("Today\n" + happening.map((e) => line(e, false)).join("\n"));
    }
    if (upcoming.length) {
        sections.push("Coming up\n" + upcoming.map((e) => line(e, true)).join("\n"));
    }
    const text = sections.join("\n\n");
    // The shared sender attaches oversized digests as one document message.
    // Never split into multiple messages or silently drop qualifying occurrences.
    return text;
}
export interface DigestDelivery {
    claim: (text: string, occurrences: CalendarOccurrence[]) => Promise<string | null>;
    send: (text: string) => Promise<{ messageId: number }>;
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
        telegram = await input.delivery.send(text);
    } catch (error) {
        // Only a definite rejection can be retried safely. Transport ambiguity stays sending.
        if (error instanceof TelegramSendError && error.definite) await input.delivery.failed(id);
        throw error;
    }
    // A failed post-send ledger write MUST NOT set failed: the durable sending claim blocks duplicates.
    await input.delivery.sent(id, telegram.messageId);
    return { status: "sent" as const, count: occurrences.length, messageId: telegram.messageId };
}
