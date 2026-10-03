// Async fakes intentionally implement the production delivery interface.
// deno-lint-ignore-file require-await
import { type CalendarEvent, type CalendarOccurrence } from "../_shared/calendar.ts";
import { sendTelegramMessage, TelegramSendError } from "../expense-report/telegram.ts";
import { deliverCalendarDigest, type DigestDelivery, formatCalendarDigest } from "./digest.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value {
    if (!value) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown) {
    assert(JSON.stringify(actual) === JSON.stringify(expected),
        `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
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
function occurrence(overrides: Partial<CalendarEvent> = {}): CalendarOccurrence {
    return {
        ...event(),
        ...overrides,
        key: "one:2026-10-03",
        event_id: "one",
        original_date: "2026-10-03",
        is_exception: false,
    };
}
for (const [day, ordinal] of [
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"],
    [11, "11th"], [12, "12th"], [13, "13th"],
    [21, "21st"], [22, "22nd"], [23, "23rd"], [31, "31st"],
] as const) {
    Deno.test(`digest date uses ${ordinal} January 2027`, () => {
        assertEquals(
            formatCalendarDigest([], `2027-01-${String(day).padStart(2, "0")}`),
            `<b>${ordinal} January 2027</b>`,
        );
    });
}
Deno.test("both sections format all-day and timed entries with bold dates and italic labels", () => {
    const events = [
        occurrence({ title: "All Day Test" }),
        occurrence({
            title: "Evening Test", is_all_day: false, start_date: null, end_date: null,
            starts_at: "2026-10-03T11:00:00Z", ends_at: "2026-10-03T13:00:00Z",
        }),
        occurrence({ title: "Reminder Test", start_date: "2026-10-04", end_date: "2026-10-04" }),
        occurrence({
            title: "Future Evening", is_all_day: false, start_date: null, end_date: null,
            starts_at: "2026-10-04T11:00:00Z", ends_at: "2026-10-04T13:00:00Z",
        }),
    ];
    assertEquals(formatCalendarDigest(events, "2026-10-03"), [
        "<b>3rd October 2026</b>", "", "<b>Today</b>",
        "• <i>All day</i> · All Day Test",
        "• <i>7:00 PM – 9:00 PM</i> · Evening Test", "", "<b>Coming up</b>",
        "• <b>2026-10-04</b> · <i>All day</i> · Reminder Test",
        "• <b>2026-10-04</b> · <i>7:00 PM – 9:00 PM</i> · Future Evening",
    ].join("\n"));
    assertEquals(formatCalendarDigest(events, "2026-10-03", "plain"), [
        "3rd October 2026", "", "Today", "• All day · All Day Test",
        "• 7:00 PM – 9:00 PM · Evening Test", "", "Coming up",
        "• 2026-10-04 · All day · Reminder Test",
        "• 2026-10-04 · 7:00 PM – 9:00 PM · Future Evening",
    ].join("\n"));
});
Deno.test("Today alone omits Coming up and escapes user titles without interpreting HTML", () => {
    const events = [occurrence({ title: "A & B <b>bold?</b> > &lt;\nnext\tline" })];
    assertEquals(formatCalendarDigest(events, "2026-10-03"),
        "<b>3rd October 2026</b>\n\n<b>Today</b>\n• <i>All day</i> · A &amp; B &lt;b&gt;bold?&lt;/b&gt; &gt; &amp;lt; next line");
    assertEquals(formatCalendarDigest(events, "2026-10-03", "plain"),
        "3rd October 2026\n\nToday\n• All day · A & B <b>bold?</b> > &lt; next line");
});
Deno.test("Coming up alone omits Today and escapes user titles", () => {
    assertEquals(formatCalendarDigest([occurrence({
        title: "<i>A & B</i>", start_date: "2026-10-04", end_date: "2026-10-04",
    })], "2026-10-03"),
        "<b>3rd October 2026</b>\n\n<b>Coming up</b>\n• <b>2026-10-04</b> · <i>All day</i> · &lt;i&gt;A &amp; B&lt;/i&gt;");
});
Deno.test("timed formatting handles midnight, noon, minutes and multi-day spans", () => {
    assertEquals(formatCalendarDigest([occurrence({
        is_all_day: false, start_date: null, end_date: null,
        starts_at: "2026-10-02T16:00:00Z", ends_at: "2026-10-04T04:05:00Z",
    })], "2026-10-03"),
        "<b>3rd October 2026</b>\n\n<b>Today</b>\n• <i>12:00 AM – 12:05 PM</i> · Our event (through 2026-10-04)");
});
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
    assertEquals([state.calls, state.status, state.manifested], [0, "new", 0]);
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
            text: messageThreadId === 20 ? "<b>Calendar</b>" : "Finance <plain> & text",
            ...(messageThreadId === 20 ? { parseMode: "HTML" as const } : {}),
            fetcher,
        });
    }
    assert(bodies[0].message_thread_id === 10 && bodies[1].message_thread_id === 20);
    assert(bodies.every((body) => body.chat_id === "same-group"));
    assertEquals(bodies[0], {
        chat_id: "same-group", message_thread_id: 10, text: "Finance <plain> & text",
    });
    assertEquals(bodies[1], {
        chat_id: "same-group", message_thread_id: 20, text: "<b>Calendar</b>", parse_mode: "HTML",
    });
});
Deno.test("delivery passes HTML and plain text while claiming the rendered message", async () => {
    const { delivery } = ledger();
    let text = "";
    let plainText = "";
    let claimedText = "";
    const claim = delivery.claim;
    delivery.claim = async (value, occurrences) => {
        claimedText = value;
        return await claim(value, occurrences);
    };
    delivery.send = async (value, plain) => {
        text = value;
        plainText = plain;
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
    assert(text.includes("<b>Today</b>\n") && text.includes("<b>Coming up</b>\n"));
    assertEquals(claimedText, text);
    assertEquals(plainText,
        "3rd October 2026\n\nToday\n• All day · Our event\n\nComing up\n• 2026-10-05 · All day · Our event");
});
Deno.test("oversized HTML digest sends one complete plain-text document; Finance still rejects overflow", async () => {
    const occurrences = Array.from(
        { length: 200 },
        (_, i) => ({
            ...event(String(i)),
            key: String(i),
            event_id: String(i),
            original_date: "2026-10-03",
            is_exception: false,
        }),
    );
    const oversized = formatCalendarDigest(occurrences, "2026-10-03");
    const plainText = formatCalendarDigest(occurrences, "2026-10-03", "plain");
    assert(oversized.length > 4096);
    let calls = 0;
    const result = await sendTelegramMessage({
        botToken: "test",
        chatId: "same-group",
        messageThreadId: 20,
        text: oversized,
        parseMode: "HTML",
        overflowDocument: {
            filename: "calendar-2026-10-03.txt", caption: "Full daily digest", text: plainText,
        },
        fetcher: async (url, init) => {
            calls++;
            assert(String(url).endsWith("/sendDocument"));
            const form = init?.body as FormData;
            assert(form.get("chat_id") === "same-group" && form.get("message_thread_id") === "20");
            assert(form.get("parse_mode") === null);
            const document = form.get("document") as File;
            assert(document.name === "calendar-2026-10-03.txt");
            assertEquals(await document.text(), plainText);
            assert(!plainText.includes("<b>") && !plainText.includes("<i>"));
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
