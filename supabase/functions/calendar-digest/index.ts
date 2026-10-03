import { createClient } from "@supabase/supabase-js";

import {
    type CalendarEvent,
    type CalendarException,
    dateInSingapore,
} from "../_shared/calendar.ts";
import { sendTelegramMessage } from "../expense-report/telegram.ts";
import { deliverCalendarDigest } from "./digest.ts";

function requiredEnv(name: string) {
    const value = Deno.env.get(name)?.trim();
    if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
    return value;
}
// Same hosted secret-key dictionary and legacy fallback as expense-report.
function backendKey() {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
    if (raw) {
        let value: unknown;
        try {
            value = JSON.parse(raw).default;
        } catch {
            throw new Error("SUPABASE_SECRET_KEYS is not valid JSON");
        }
        if (typeof value === "string" && value.trim()) return value;
    }
    return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}
function timingSafeEqual(a: string, b: string) {
    const left = new TextEncoder().encode(a), right = new TextEncoder().encode(b);
    let difference = left.length ^ right.length;
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
    }
    return difference === 0;
}
Deno.serve(async (request: Request) => {
    if (request.method !== "POST") {
        return Response.json({ ok: false, error: "POST required" }, { status: 405 });
    }
    const secret = Deno.env.get("EXPENSE_REPORT_CRON_SECRET")?.trim();
    if (!secret) return Response.json({ ok: false, error: "Missing cron secret" }, { status: 500 });
    if (!timingSafeEqual(request.headers.get("x-expense-report-secret") ?? "", secret)) {
        return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) {
            return Response.json({
                ok: false,
                error: "Use an empty JSON object; date/force overrides are not supported",
            }, { status: 400 });
        }
    } catch {
        return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    try {
        const admin = createClient(requiredEnv("SUPABASE_URL"), backendKey(), {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const spaceId = requiredEnv("EXPENSE_REPORT_SPACE_ID");
        const botToken = requiredEnv("TELEGRAM_BOT_TOKEN");
        const chatId = requiredEnv("TELEGRAM_CHAT_ID");
        const messageThreadId = Number(requiredEnv("TELEGRAM_CALENDAR_THREAD_ID"));
        if (!Number.isSafeInteger(messageThreadId) || messageThreadId <= 0) {
            throw new Error("TELEGRAM_CALENDAR_THREAD_ID must be a positive integer");
        }
        const today = dateInSingapore();
        const events: CalendarEvent[] = [];
        for (let offset = 0;; offset += 500) {
            const { data, error } = await admin.from("calendar_events").select("*").eq(
                "space_id",
                spaceId,
            ).is("deleted_at", null)
                .or(`recurrence_rule.not.is.null,end_date.gte.${today},ends_at.gt.${today}T00:00:00+08:00`)
                .order("id").range(offset, offset + 499);
            if (error) throw new Error("Could not fetch Calendar events");
            events.push(...data as CalendarEvent[]);
            if (data.length < 500) break;
        }
        const exceptions: CalendarException[] = [];
        for (let batch = 0; batch < events.length; batch += 100) {
            for (let offset = 0;; offset += 500) {
                const { data, error } = await admin.from("calendar_event_exceptions").select("*")
                    .eq("space_id", spaceId)
                    .in("event_id", events.slice(batch, batch + 100).map((e) => e.id)).order("id")
                    .range(offset, offset + 499);
                if (error) throw new Error("Could not fetch Calendar exceptions");
                exceptions.push(...data as CalendarException[]);
                if (data.length < 500) break;
            }
        }
        const result = await deliverCalendarDigest({
            events,
            exceptions,
            today,
            delivery: {
                claim: async (text, occurrences) => {
                    const { data, error } = await admin.rpc("claim_calendar_digest", {
                        p_space_id: spaceId,
                        p_date: today,
                        p_text: text,
                        p_occurrences: occurrences.map((e) => ({
                            event_id: e.event_id,
                            original_date: e.original_date,
                        })),
                    });
                    if (error) throw new Error("Could not claim Calendar digest");
                    return data as string | null;
                },
                send: (text, plainText) =>
                    sendTelegramMessage({
                        botToken,
                        chatId,
                        messageThreadId,
                        text,
                        parseMode: "HTML",
                        overflowDocument: {
                            filename: `calendar-${today}.txt`,
                            caption: `${plainText.split("\n")[0]}\nFull daily digest attached`,
                            text: plainText,
                        },
                    }),
                sent: async (id, messageId) => {
                    const { error } = await admin.from("calendar_digest_deliveries").update({
                        status: "sent",
                        telegram_message_id: messageId,
                        sent_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        error: null,
                    }).eq("id", id).eq("status", "sending").select("id").single();
                    if (error) {
                        throw new Error(
                            "Telegram accepted the digest but ledger completion failed; inspect the sending claim before retrying",
                        );
                    }
                },
                failed: async (id) => {
                    const { error } = await admin.from("calendar_digest_deliveries").update({
                        status: "failed",
                        error: "Telegram rejected the message",
                        updated_at: new Date().toISOString(),
                    })
                        .eq("id", id).eq("status", "sending").select("id").single();
                    if (error) {
                        throw new Error(
                            "Could not record Telegram rejection; inspect the sending claim",
                        );
                    }
                },
            },
        });
        return Response.json({ ok: true, ...result, date: today });
    } catch (error) {
        let message = error instanceof Error ? error.message : "Calendar digest failed";
        for (
            const name of [
                "TELEGRAM_BOT_TOKEN",
                "EXPENSE_REPORT_CRON_SECRET",
                "SUPABASE_SERVICE_ROLE_KEY",
                "SUPABASE_SECRET_KEYS",
            ]
        ) {
            const value = Deno.env.get(name);
            if (value) message = message.replaceAll(value, "[redacted]");
        }
        return Response.json({
            ok: false,
            error: message.replace(/[\r\n\t]+/g, " ").slice(0, 1000),
        }, { status: 502 });
    }
});
