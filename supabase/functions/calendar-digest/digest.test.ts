// Async fakes intentionally implement the production delivery interface.
// deno-lint-ignore-file require-await
import { type CalendarEvent } from "../_shared/calendar.ts";
import { sendTelegramMessage, TelegramSendError } from "../expense-report/telegram.ts";
import { deliverCalendarDigest, type DigestDelivery, formatCalendarDigest } from "./digest.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value {
    if (!value) throw new Error(message);
}
function event(id = "one"): CalendarEvent {
    return {
        id,
        space_id: "space",
        created_by: "member",
        title: "Our event",
        description: null,
        colour: "pink",
        is_all_day: true,
        start_date: "2026-10-03",
        end_date: "2026-10-03",
        starts_at: null,
        ends_at: null,
        timezone: "Asia/Singapore",
        reminder_days_before: null,
        recurrence_rule: null,
        deleted_at: null,
        created_at: "",
        updated_at: "",
    };
}
function ledger() {
    const state = {
        status: "new",
        calls: 0,
        completed: 0,
        failCompletion: false,
        rejection: false,
        ambiguous: false,
        manifested: 0,
    };
    const delivery: DigestDelivery = {
        claim: async (_text, occurrences) => {
            if (state.status === "sending" || state.status === "sent") return null;
            state.status = "sending";
            state.manifested = occurrences.length;
            return "claim";
        },
        send: async () => {
            state.calls++;
            if (state.rejection) throw new TelegramSendError("Rejected", true);
            if (state.ambiguous) throw new TelegramSendError("Lost response", false);
            return { messageId: 42 };
        },
        sent: async () => {
            if (state.failCompletion) throw new Error("Database unavailable");
            state.status = "sent";
            state.completed++;
        },
        failed: async () => {
            state.status = "failed";
        },
    };
    return { state, delivery };
}
Deno.test("empty sends nothing; many qualifying events send exactly once; successful retries are no-ops", async () => {
    const { state, delivery } = ledger();
    const input = { events: [] as CalendarEvent[], exceptions: [], today: "2026-10-03", delivery };
    assert((await deliverCalendarDigest(input)).status === "empty");
    assert(state.calls === 0);
    input.events = [event(), event("two"), {
        ...event("future"),
        start_date: "2026-10-05",
        end_date: "2026-10-05",
        reminder_days_before: 2,
    }];
    assert((await deliverCalendarDigest(input)).status === "sent");
    assert(Number(state.calls) === 1 && state.manifested === 3);
    assert((await deliverCalendarDigest(input)).status === "already_claimed");
    assert(Number(state.calls) === 1);
});
Deno.test("definite Telegram rejection stays eligible and does not complete occurrences", async () => {
    const { state, delivery } = ledger();
    state.rejection = true;
    const input = { events: [event()], exceptions: [], today: "2026-10-03", delivery };
    try {
        await deliverCalendarDigest(input);
        throw new Error("Expected rejection");
    } catch (e) {
        assert(e instanceof TelegramSendError);
    }
    assert(state.status === "failed" && state.completed === 0);
    state.rejection = false;
    assert((await deliverCalendarDigest(input)).status === "sent");
    assert(state.calls === 2);
});
Deno.test("ambiguous send and failed database completion cannot automatically resend", async () => {
    for (const failure of ["ambiguous", "failCompletion"] as const) {
        const { state, delivery } = ledger();
        state[failure] = true;
        const input = { events: [event()], exceptions: [], today: "2026-10-03", delivery };
        let rejected = false;
        try {
            await deliverCalendarDigest(input);
        } catch {
            rejected = true;
        }
        assert(rejected && state.status === "sending" && state.completed === 0);
        assert((await deliverCalendarDigest(input)).status === "already_claimed");
        assert(state.calls === 1);
    }
});
Deno.test("concurrent invocations can only claim one daily message", async () => {
    const { state, delivery } = ledger();
    const input = { events: [event()], exceptions: [], today: "2026-10-03", delivery };
    await Promise.all([deliverCalendarDigest(input), deliverCalendarDigest(input)]);
    assert(state.calls === 1);
});
Deno.test("shared Finance sender routes Calendar thread independently without altering Finance", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetcher: typeof fetch = async (_url, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return Response.json({ ok: true, result: { message_id: 123 } });
    };
    for (const messageThreadId of [10, 20]) {
        await sendTelegramMessage({
            botToken: "test",
            chatId: "same-group",
            messageThreadId,
            text: "test",
            fetcher,
        });
    }
    assert(bodies[0].message_thread_id === 10 && bodies[1].message_thread_id === 20);
    assert(bodies.every((body) => body.chat_id === "same-group"));
});
Deno.test("message is one plain-text Today/Coming up digest and never silently drops oversized content", async () => {
    const { delivery } = ledger();
    let text = "";
    delivery.send = async (value) => {
        text = value;
        return { messageId: 1 };
    };
    await deliverCalendarDigest({
        events: [event(), {
            ...event("future"),
            start_date: "2026-10-05",
            end_date: "2026-10-05",
            reminder_days_before: 2,
        }],
        exceptions: [],
        today: "2026-10-03",
        delivery,
    });
    assert(text.includes("Today\n") && text.includes("Coming up\n"));
    const oversized = formatCalendarDigest(
        Array.from(
            { length: 200 },
            (_, i) => ({
                ...event(String(i)),
                key: String(i),
                event_id: String(i),
                original_date: "2026-10-03",
                is_exception: false,
            }),
        ),
        "2026-10-03",
    );
    assert(oversized.length > 4096);
    let calls = 0;
    const result = await sendTelegramMessage({
        botToken: "test",
        chatId: "same-group",
        messageThreadId: 20,
        text: oversized,
        overflowDocument: { filename: "calendar-2026-10-03.txt", caption: "Full daily digest" },
        fetcher: async (url, init) => {
            calls++;
            assert(String(url).endsWith("/sendDocument"));
            const form = init?.body as FormData;
            assert(form.get("chat_id") === "same-group" && form.get("message_thread_id") === "20");
            assert(await (form.get("document") as File).text() === oversized);
            return Response.json({ ok: true, result: { message_id: 9 } });
        },
    });
    assert(calls === 1 && result.messageId === 9);
    let rejected = false;
    try {
        await sendTelegramMessage({
            botToken: "test",
            chatId: "same-group",
            messageThreadId: 10,
            text: oversized,
        });
    } catch (error) {
        rejected = error instanceof TelegramSendError && error.definite;
    }
    assert(rejected, "Finance's original over-limit rejection must remain unchanged");
});
