import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getExistingDeliveryAction } from "./delivery.ts";
import {
    type ActiveExpenseCategory,
    buildExpenseReport,
    type ExpenseReportRow,
    formatExpenseReport,
    getCompletedReportPeriod,
    type ReportMode,
} from "./report.ts";
import { sendTelegramMessage, TelegramSendError } from "./telegram.ts";

type DeliveryRow = {
    id: string;
    status: "sending" | "sent" | "failed";
    attempt_count: number;
};

type DeliveryClaim =
    | { outcome: "claimed"; delivery: DeliveryRow }
    | { outcome: "already_sent" | "already_sending"; delivery: DeliveryRow };

// This repository does not keep generated database types. The response rows are
// narrowed at the query boundary into the report-specific types below.
// deno-lint-ignore no-explicit-any
type AdminClient = SupabaseClient<any>;

const EXPENSE_SELECT = [
    "id",
    "paid_by",
    "category_id",
    "category_name",
    "category_icon_name",
    "title",
    "amount",
    "currency",
    "base_amount",
    "conversion_status",
    "paid_at",
    "created_at",
    "deleted_at",
].join(",");

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function requiredEnv(name: string) {
    const value = Deno.env.get(name)?.trim();
    if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
    return value;
}

function getBackendKey() {
    const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
    if (secretKeysJson) {
        let secretKeys: Record<string, unknown>;
        try {
            secretKeys = JSON.parse(secretKeysJson) as Record<string, unknown>;
        } catch {
            throw new Error("SUPABASE_SECRET_KEYS is not valid JSON");
        }
        const defaultKey = secretKeys.default;
        if (typeof defaultKey !== "string" || !defaultKey.trim()) {
            throw new Error("SUPABASE_SECRET_KEYS does not contain a default key");
        }
        return defaultKey;
    }

    const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (legacyKey) return legacyKey;
    throw new Error(
        "Missing SUPABASE_SECRET_KEYS and compatibility SUPABASE_SERVICE_ROLE_KEY",
    );
}

function timingSafeEqual(left: string, right: string) {
    const encoder = new TextEncoder();
    const leftBytes = encoder.encode(left);
    const rightBytes = encoder.encode(right);
    const length = Math.max(leftBytes.length, rightBytes.length);
    let difference = leftBytes.length ^ rightBytes.length;
    for (let index = 0; index < length; index += 1) {
        difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
    }
    return difference === 0;
}

function sanitizeError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(/[\r\n\t]+/g, " ").slice(0, 1000);
}

function parseThreadId(value: string) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error("TELEGRAM_FINANCES_THREAD_ID must be a positive integer");
    }
    return parsed;
}

async function validateConfiguredUsers(
    supabaseAdmin: AdminClient,
    spaceId: string,
    duduUserId: string,
    bubuUserId: string,
) {
    if (duduUserId === bubuUserId) {
        throw new Error("DUDU_USER_ID and BUBU_USER_ID must be different users");
    }

    const [{ data: members, error: memberError }, { data: profiles, error: profileError }] =
        await Promise.all([
            supabaseAdmin
                .from("space_members")
                .select("user_id")
                .eq("space_id", spaceId)
                .in("user_id", [duduUserId, bubuUserId]),
            supabaseAdmin
                .from("profiles")
                .select("id")
                .in("id", [duduUserId, bubuUserId]),
        ]);

    if (memberError) throw new Error(`Failed to validate space members: ${memberError.message}`);
    if (profileError) throw new Error(`Failed to validate profiles: ${profileError.message}`);

    const memberIds = new Set((members ?? []).map((row) => String(row.user_id)));
    const profileIds = new Set((profiles ?? []).map((row) => String(row.id)));
    for (
        const [label, userId] of [
            ["Dudu", duduUserId],
            ["Bubu", bubuUserId],
        ] as const
    ) {
        if (!profileIds.has(userId)) throw new Error(`${label} profile does not exist`);
        if (!memberIds.has(userId)) {
            throw new Error(`${label} is not a member of EXPENSE_REPORT_SPACE_ID`);
        }
    }
}

async function fetchActiveCategories(
    supabaseAdmin: AdminClient,
    spaceId: string,
) {
    const { data, error } = await supabaseAdmin
        .from("expense_categories")
        .select("id,name,icon_name,deleted_at")
        .eq("space_id", spaceId)
        .is("deleted_at", null);
    if (error) throw new Error(`Failed to fetch expense categories: ${error.message}`);
    return (data ?? []) as ActiveExpenseCategory[];
}

async function fetchExpenses(
    supabaseAdmin: AdminClient,
    spaceId: string,
    startUtc: string,
    endUtc: string,
) {
    const pageSize = 1000;
    const expenses: ExpenseReportRow[] = [];

    for (let offset = 0;; offset += pageSize) {
        const { data, error } = await supabaseAdmin
            .from("expenses")
            .select(EXPENSE_SELECT)
            .eq("space_id", spaceId)
            .is("deleted_at", null)
            .gte("paid_at", startUtc)
            .lt("paid_at", endUtc)
            .order("paid_at", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1);
        if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);

        const page = (data ?? []) as unknown as ExpenseReportRow[];
        expenses.push(...page);
        if (page.length < pageSize) break;
    }

    return expenses;
}

async function getDelivery(
    supabaseAdmin: AdminClient,
    spaceId: string,
    reportType: ReportMode,
    periodStart: string,
    periodEnd: string,
) {
    const { data, error } = await supabaseAdmin
        .from("expense_report_deliveries")
        .select("id,status,attempt_count")
        .eq("space_id", spaceId)
        .eq("report_type", reportType)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .single();
    if (error) throw new Error(`Failed to read delivery claim: ${error.message}`);
    return data as DeliveryRow;
}

async function claimDelivery(
    supabaseAdmin: AdminClient,
    spaceId: string,
    reportType: ReportMode,
    periodStart: string,
    periodEnd: string,
): Promise<DeliveryClaim> {
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await supabaseAdmin
        .from("expense_report_deliveries")
        .insert({
            space_id: spaceId,
            report_type: reportType,
            period_start: periodStart,
            period_end: periodEnd,
            status: "sending",
            attempt_count: 1,
            created_at: now,
            updated_at: now,
            last_attempt_at: now,
        })
        .select("id,status,attempt_count")
        .single();

    if (!insertError && inserted) {
        return { outcome: "claimed", delivery: inserted as DeliveryRow };
    }
    if (insertError?.code !== "23505") {
        throw new Error(
            `Failed to create delivery claim: ${insertError?.message ?? "unknown error"}`,
        );
    }

    const existing = await getDelivery(
        supabaseAdmin,
        spaceId,
        reportType,
        periodStart,
        periodEnd,
    );
    const existingAction = getExistingDeliveryAction(existing.status);
    if (existingAction === "already_sent") {
        return { outcome: "already_sent", delivery: existing };
    }
    if (existingAction === "already_sending") {
        return { outcome: "already_sending", delivery: existing };
    }

    const { data: reclaimed, error: reclaimError } = await supabaseAdmin
        .from("expense_report_deliveries")
        .update({
            status: "sending",
            attempt_count: existing.attempt_count + 1,
            error: null,
            updated_at: now,
            last_attempt_at: now,
        })
        .eq("id", existing.id)
        .eq("status", "failed")
        .select("id,status,attempt_count")
        .maybeSingle();
    if (reclaimError) throw new Error(`Failed to reclaim delivery: ${reclaimError.message}`);
    if (reclaimed) {
        return { outcome: "claimed", delivery: reclaimed as DeliveryRow };
    }

    const raced = await getDelivery(
        supabaseAdmin,
        spaceId,
        reportType,
        periodStart,
        periodEnd,
    );
    return {
        outcome: raced.status === "sent" ? "already_sent" : "already_sending",
        delivery: raced,
    };
}

async function updateDelivery(
    supabaseAdmin: AdminClient,
    deliveryId: string,
    patch: Record<string, unknown>,
) {
    const { data, error } = await supabaseAdmin
        .from("expense_report_deliveries")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", deliveryId)
        .eq("status", "sending")
        .select("id")
        .maybeSingle();
    if (error) throw new Error(`Failed to update delivery ledger: ${error.message}`);
    if (!data) throw new Error("Delivery ledger was no longer in sending state");
}

Deno.serve(async (req) => {
    if (req.method !== "POST") {
        return jsonResponse({ ok: false, error: "Method Not Allowed" }, 405);
    }

    let cronSecret: string;
    try {
        cronSecret = requiredEnv("EXPENSE_REPORT_CRON_SECRET");
    } catch (error) {
        return jsonResponse({ ok: false, error: sanitizeError(error) }, 500);
    }
    const suppliedSecret = req.headers.get("x-expense-report-secret") ?? "";
    if (!timingSafeEqual(suppliedSecret, cronSecret)) {
        return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    let body: { mode?: unknown };
    try {
        body = (await req.json()) as { mode?: unknown };
    } catch {
        return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }
    if (body.mode !== "weekly" && body.mode !== "monthly") {
        return jsonResponse(
            { ok: false, error: "mode must be weekly or monthly" },
            400,
        );
    }
    const mode = body.mode;

    let supabaseAdmin: AdminClient;
    let config: {
        spaceId: string;
        duduUserId: string;
        bubuUserId: string;
        botToken: string;
        chatId: string;
        messageThreadId: number;
    };
    try {
        const supabaseUrl = requiredEnv("SUPABASE_URL");
        // deno-lint-ignore no-explicit-any
        supabaseAdmin = createClient<any>(
            supabaseUrl,
            getBackendKey(),
            {
                auth: { persistSession: false, autoRefreshToken: false },
            },
        );
        config = {
            spaceId: requiredEnv("EXPENSE_REPORT_SPACE_ID"),
            duduUserId: requiredEnv("DUDU_USER_ID"),
            bubuUserId: requiredEnv("BUBU_USER_ID"),
            botToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
            chatId: requiredEnv("TELEGRAM_CHAT_ID"),
            messageThreadId: parseThreadId(
                requiredEnv("TELEGRAM_FINANCES_THREAD_ID"),
            ),
        };
    } catch (error) {
        return jsonResponse({ ok: false, error: sanitizeError(error) }, 500);
    }

    const period = getCompletedReportPeriod(mode);
    let delivery: DeliveryRow;
    try {
        await validateConfiguredUsers(
            supabaseAdmin,
            config.spaceId,
            config.duduUserId,
            config.bubuUserId,
        );
        const claim = await claimDelivery(
            supabaseAdmin,
            config.spaceId,
            mode,
            period.startDate,
            period.endDate,
        );
        if (claim.outcome !== "claimed") {
            return jsonResponse({
                ok: true,
                status: claim.outcome,
                mode,
                period_start: period.startDate,
                period_end: period.endDate,
            });
        }
        delivery = claim.delivery;
    } catch (error) {
        return jsonResponse({ ok: false, error: sanitizeError(error) }, 500);
    }

    try {
        const [categories, expenses] = await Promise.all([
            fetchActiveCategories(supabaseAdmin, config.spaceId),
            fetchExpenses(
                supabaseAdmin,
                config.spaceId,
                period.previousStartUtc,
                period.endUtc,
            ),
        ]);
        const report = buildExpenseReport({
            mode,
            period,
            expenses,
            categories,
            duduUserId: config.duduUserId,
            bubuUserId: config.bubuUserId,
        });
        const text = formatExpenseReport(report);
        const telegram = await sendTelegramMessage({
            botToken: config.botToken,
            chatId: config.chatId,
            messageThreadId: config.messageThreadId,
            text,
        });

        const sentAt = new Date().toISOString();
        await updateDelivery(supabaseAdmin, delivery.id, {
            status: "sent",
            telegram_message_id: telegram.messageId,
            sent_at: sentAt,
            error: null,
        });
        return jsonResponse({
            ok: true,
            status: "sent",
            mode,
            period_start: period.startDate,
            period_end: period.endDate,
            telegram_message_id: telegram.messageId,
        });
    } catch (error) {
        const sanitized = sanitizeError(error);
        try {
            if (error instanceof TelegramSendError && !error.definite) {
                await updateDelivery(supabaseAdmin, delivery.id, { error: sanitized });
            } else {
                await updateDelivery(supabaseAdmin, delivery.id, {
                    status: "failed",
                    error: sanitized,
                });
            }
        } catch (ledgerError) {
            return jsonResponse(
                {
                    ok: false,
                    error: sanitized,
                    ledger_error: sanitizeError(ledgerError),
                },
                500,
            );
        }
        return jsonResponse(
            {
                ok: false,
                status: error instanceof TelegramSendError && !error.definite
                    ? "sending"
                    : "failed",
                error: sanitized,
            },
            502,
        );
    }
});
