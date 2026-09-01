import { getExistingDeliveryAction } from "./delivery.ts";
import {
    type ActiveExpenseCategory,
    buildExpenseReport,
    type ExpenseReport,
    type ExpenseReportRow,
    formatCombinedComparison,
    formatExpenseReport,
    getCompletedReportPeriod,
    getReportableAmount,
} from "./report.ts";
import { sendTelegramMessage, TelegramSendError } from "./telegram.ts";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
    if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message?: string) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(message ?? `Expected ${expectedJson}, received ${actualJson}`);
    }
}

function expense(
    patch: Partial<ExpenseReportRow> & Pick<ExpenseReportRow, "id" | "paid_at">,
): ExpenseReportRow {
    return {
        paid_by: "dudu-id",
        category_id: "food-id",
        category_name: "Old Food",
        category_icon_name: null,
        title: patch.id,
        amount: 10,
        currency: "SGD",
        base_amount: null,
        conversion_status: "converted",
        created_at: patch.paid_at,
        deleted_at: null,
        ...patch,
    } as ExpenseReportRow;
}

Deno.test("completed weekly and monthly periods use Singapore boundaries", () => {
    const weekly = getCompletedReportPeriod(
        "weekly",
        new Date("2026-08-30T16:05:00.000Z"),
    );
    assertEquals(weekly.startUtc, "2026-08-23T16:00:00.000Z");
    assertEquals(weekly.endUtc, "2026-08-30T16:00:00.000Z");
    assertEquals(weekly.previousStartUtc, "2026-08-16T16:00:00.000Z");
    assertEquals(weekly.periodLabel, "24–30 August 2026");
    assertEquals(weekly.comparisonLabel, "17–23 August");

    const monthly = getCompletedReportPeriod(
        "monthly",
        new Date("2026-08-31T16:10:00.000Z"),
    );
    assertEquals(monthly.startUtc, "2026-07-31T16:00:00.000Z");
    assertEquals(monthly.endUtc, "2026-08-31T16:00:00.000Z");
    assertEquals(monthly.previousStartUtc, "2026-06-30T16:00:00.000Z");
    assertEquals(monthly.periodLabel, "August 2026");
    assertEquals(monthly.comparisonLabel, "July");
});

Deno.test("monetary normalization matches the mobile analytics rules", () => {
    const paidAt = "2026-08-10T16:00:00.000Z";
    assertEquals(
        getReportableAmount(
            expense({
                id: "converted",
                paid_at: paidAt,
                amount: 100,
                currency: "USD",
                base_amount: 135.4321,
                conversion_status: "converted",
            }),
        ),
        135.4321,
    );
    assertEquals(
        getReportableAmount(
            expense({
                id: "sgd-fallback",
                paid_at: paidAt,
                amount: 18.5,
                currency: "SGD",
                base_amount: null,
                conversion_status: "pending",
            }),
        ),
        18.5,
    );
    assertEquals(
        getReportableAmount(
            expense({
                id: "foreign-pending",
                paid_at: paidAt,
                amount: 99,
                currency: "USD",
                base_amount: null,
                conversion_status: "pending",
            }),
        ),
        null,
    );
});

Deno.test("report analytics cover ownership, categories, largest expenses, average, and weekday", () => {
    const period = getCompletedReportPeriod(
        "monthly",
        new Date("2026-08-31T16:10:00.000Z"),
    );
    const categories: ActiveExpenseCategory[] = [
        { id: "food-id", name: "Food & Dining", icon_name: null },
        { id: "deleted-id", name: "Renamed Deleted", deleted_at: "2026-08-01" },
    ];
    const expenses = [
        expense({ id: "food-dudu", paid_at: "2026-08-01T04:00:00.000Z", amount: 40 }),
        expense({
            id: "food-bubu",
            paid_at: "2026-08-08T04:00:00.000Z",
            paid_by: "bubu-id",
            amount: 30,
        }),
        expense({
            id: "snapshot",
            paid_at: "2026-08-08T06:00:00.000Z",
            category_id: "deleted-id",
            category_name: "Historical Household",
            amount: 20,
        }),
        expense({
            id: "transport",
            paid_at: "2026-08-03T04:00:00.000Z",
            category_id: null,
            category_name: "Transport",
            amount: 15,
        }),
        expense({
            id: "health",
            paid_at: "2026-08-04T04:00:00.000Z",
            category_id: null,
            category_name: "Health",
            amount: 14,
        }),
        expense({
            id: "medical",
            paid_at: "2026-08-05T04:00:00.000Z",
            category_id: null,
            category_name: "Medical",
            amount: 13,
        }),
        expense({
            id: "bills",
            paid_at: "2026-08-06T04:00:00.000Z",
            category_id: null,
            category_name: "Bills",
            amount: 12,
        }),
        expense({
            id: "shopping",
            paid_at: "2026-08-07T04:00:00.000Z",
            category_id: null,
            category_name: "Shopping",
            amount: 11,
        }),
        expense({
            id: "pending",
            paid_at: "2026-08-09T04:00:00.000Z",
            currency: "USD",
            base_amount: null,
            conversion_status: "pending",
            amount: 999,
        }),
        expense({
            id: "deleted",
            paid_at: "2026-08-10T04:00:00.000Z",
            amount: 999,
            deleted_at: "2026-08-11T00:00:00.000Z",
        }),
        expense({
            id: "previous",
            paid_at: "2026-07-10T04:00:00.000Z",
            paid_by: "bubu-id",
            amount: 25,
        }),
    ];

    const report = buildExpenseReport({
        mode: "monthly",
        period,
        expenses,
        categories,
        duduUserId: "dudu-id",
        bubuUserId: "bubu-id",
    });

    assertEquals(report.combinedTotal, 155);
    assertEquals(report.duduTotal, 125);
    assertEquals(report.bubuTotal, 30);
    assertEquals(report.transactionCount, 8);
    assertEquals(report.averagePerTransaction, 19.375);
    assertEquals(report.previousCombinedTotal, 25);
    assertEquals(report.combinedChange, 130);
    assertEquals(report.highestWeekday, "Saturday");
    assertEquals(report.highestCategory?.label, "Food & Dining");
    assertEquals(report.combinedTopCategories.length, 5);
    assertEquals(report.duduTopCategories.length, 5);
    assertEquals(report.bubuTopCategories.map((category) => category.label), [
        "Food & Dining",
    ]);
    assertEquals(report.largestExpenses.map((item) => item.id), [
        "food-dudu",
        "food-bubu",
        "snapshot",
        "transport",
        "health",
    ]);
    assert(
        report.combinedTopCategories.some(
            (category) => category.label === "Historical Household",
        ),
        "Deleted active categories must fall back to the expense snapshot",
    );
});

Deno.test("zero-expense and comparison formatting handle zero safely", () => {
    const period = getCompletedReportPeriod(
        "weekly",
        new Date("2026-08-30T16:05:00.000Z"),
    );
    const empty = buildExpenseReport({
        mode: "weekly",
        period,
        expenses: [],
        categories: [],
        duduUserId: "dudu-id",
        bubuUserId: "bubu-id",
    });
    assertEquals(empty.transactionCount, 0);
    assertEquals(empty.averagePerTransaction, 0);
    assertEquals(formatCombinedComparison(empty), "Combined spending: — $0.00");

    const increased = {
        ...empty,
        combinedChange: 124.3,
        previousCombinedTotal: 0,
    } as ExpenseReport;
    assertEquals(
        formatCombinedComparison(increased),
        "Combined spending: ↑ $124.30",
    );

    const decreased = {
        ...empty,
        combinedChange: -124.3,
        previousCombinedTotal: 1408.8,
        combinedPercentChange: -8.8224,
    } as ExpenseReport;
    assertEquals(
        formatCombinedComparison(decreased),
        "Combined spending: ↓ $124.30 (-8.8%)",
    );

    const increasedWithBaseline = {
        ...empty,
        combinedChange: 25,
        previousCombinedTotal: 100,
        combinedPercentChange: 25,
    } as ExpenseReport;
    assertEquals(
        formatCombinedComparison(increasedWithBaseline),
        "Combined spending: ↑ $25.00 (+25.0%)",
    );

    const unchangedWithBaseline = {
        ...empty,
        combinedChange: 0,
        previousCombinedTotal: 100,
        combinedPercentChange: 0,
    } as ExpenseReport;
    assertEquals(
        formatCombinedComparison(unchangedWithBaseline),
        "Combined spending: — $0.00 (0.0%)",
    );
});

Deno.test("weekly and monthly reports use the same formatter structure", () => {
    const weeklyPeriod = getCompletedReportPeriod(
        "weekly",
        new Date("2026-08-30T16:05:00.000Z"),
    );
    const weekly = buildExpenseReport({
        mode: "weekly",
        period: weeklyPeriod,
        expenses: [],
        categories: [],
        duduUserId: "dudu-id",
        bubuUserId: "bubu-id",
    });
    const weeklyText = formatExpenseReport(weekly);
    assert(weeklyText.startsWith("BubuDudu Weekly Finance Report\n24–30 August 2026"));
    assert(weeklyText.includes("Compared with 17–23 August"));
    assert(weeklyText.includes("24–30 August Summary"));

    const monthlyPeriod = getCompletedReportPeriod(
        "monthly",
        new Date("2026-08-31T16:10:00.000Z"),
    );
    const monthly = { ...weekly, mode: "monthly", period: monthlyPeriod } as ExpenseReport;
    const monthlyText = formatExpenseReport(monthly);
    assert(monthlyText.startsWith("BubuDudu Monthly Finance Report\nAugust 2026"));
    assert(monthlyText.includes("Compared with July"));
    assert(monthlyText.includes("August Summary"));
});

Deno.test("delivery state decisions allow one failed retry", () => {
    assertEquals(getExistingDeliveryAction("sent"), "already_sent");
    assertEquals(getExistingDeliveryAction("sending"), "already_sending");
    assertEquals(getExistingDeliveryAction("failed"), "reclaim_failed");
});

Deno.test("Telegram helper sends to the requested topic without parse mode", async () => {
    let requestBody: Record<string, unknown> | null = null;
    const fetcher: typeof fetch = (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return Promise.resolve(
            Response.json({ ok: true, result: { message_id: 321 } }),
        );
    };
    const result = await sendTelegramMessage({
        botToken: "test-token",
        chatId: "-100123",
        messageThreadId: 77,
        text: "report",
        fetcher,
    });
    assertEquals(result.messageId, 321);
    assertEquals(requestBody, {
        chat_id: "-100123",
        message_thread_id: 77,
        text: "report",
    });

    let rejected = false;
    try {
        await sendTelegramMessage({
            botToken: "test-token",
            chatId: "-100123",
            messageThreadId: 77,
            text: "report",
            fetcher: () =>
                Promise.resolve(
                    Response.json(
                        { ok: false, description: "Bad Request: topic not found" },
                        { status: 400 },
                    ),
                ),
        });
    } catch (error) {
        rejected = error instanceof TelegramSendError &&
            error.definite &&
            error.message.includes("topic not found");
    }
    assert(rejected, "Telegram API rejections must be definite failures");
});
