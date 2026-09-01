export const REPORT_TIME_ZONE = "Asia/Singapore";
export const REPORT_BASE_CURRENCY = "SGD";

// Asia/Singapore is UTC+08:00 year-round and has no daylight-saving transitions.
const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SAFE_CATEGORY_SYMBOL = "\uFE0F";
const DIVIDER = "━━━━━━━━━━━━━━";
const WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const;

export type ReportMode = "weekly" | "monthly";

export type ExpenseReportRow = {
    id: string;
    paid_by: string;
    category_id: string | null;
    category_name: string;
    category_icon_name?: string | null;
    title: string;
    amount: number;
    currency: string;
    base_amount: number | null;
    conversion_status: string;
    paid_at: string;
    created_at?: string | null;
    deleted_at?: string | null;
};

export type ActiveExpenseCategory = {
    id: string;
    name: string;
    icon_name?: string | null;
    deleted_at?: string | null;
};

export type ReportPeriod = {
    mode: ReportMode;
    startUtc: string;
    endUtc: string;
    previousStartUtc: string;
    previousEndUtc: string;
    startDate: string;
    endDate: string;
    periodLabel: string;
    comparisonLabel: string;
    summaryLabel: string;
};

export type CategoryTotal = {
    key: string;
    label: string;
    iconName: string | null;
    total: number;
};

export type LargestExpense = {
    id: string;
    title: string;
    total: number;
};

export type ExpenseReport = {
    mode: ReportMode;
    period: ReportPeriod;
    combinedTotal: number;
    combinedTopCategories: CategoryTotal[];
    duduTotal: number;
    duduTopCategories: CategoryTotal[];
    bubuTotal: number;
    bubuTopCategories: CategoryTotal[];
    largestExpenses: LargestExpense[];
    previousCombinedTotal: number;
    previousDuduTotal: number;
    previousBubuTotal: number;
    combinedChange: number;
    combinedPercentChange: number | null;
    duduChange: number;
    bubuChange: number;
    transactionCount: number;
    averagePerTransaction: number;
    highestCategory: CategoryTotal | null;
    highestWeekday: string | null;
};

type ReportableExpense = {
    expense: ExpenseReportRow;
    value: number;
    category: {
        key: string;
        label: string;
        iconName: string | null;
    };
};

function singaporeCalendarDate(timestamp: Date) {
    const wallClock = new Date(timestamp.getTime() + SINGAPORE_OFFSET_MS);
    return {
        year: wallClock.getUTCFullYear(),
        month: wallClock.getUTCMonth(),
        day: wallClock.getUTCDate(),
        weekday: wallClock.getUTCDay(),
    };
}

function singaporeMidnightUtc(year: number, month: number, day: number) {
    return new Date(Date.UTC(year, month, day) - SINGAPORE_OFFSET_MS);
}

function dateOnlyInSingapore(value: Date) {
    const calendar = singaporeCalendarDate(value);
    return `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}-${
        String(
            calendar.day,
        ).padStart(2, "0")
    }`;
}

function formatCalendarDate(
    year: number,
    month: number,
    day: number,
    options: Intl.DateTimeFormatOptions,
) {
    return new Intl.DateTimeFormat("en-GB", {
        ...options,
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month, day, 12)));
}

function formatWeeklyRange(start: Date, end: Date, includeYear: boolean) {
    const startCalendar = singaporeCalendarDate(start);
    const inclusiveEnd = new Date(end.getTime() - DAY_MS);
    const endCalendar = singaporeCalendarDate(inclusiveEnd);
    const sameMonth = startCalendar.year === endCalendar.year &&
        startCalendar.month === endCalendar.month;
    const sameYear = startCalendar.year === endCalendar.year;

    if (sameMonth) {
        const startDay = String(startCalendar.day);
        const endText = formatCalendarDate(
            endCalendar.year,
            endCalendar.month,
            endCalendar.day,
            {
                day: "numeric",
                month: "long",
                year: includeYear ? "numeric" : undefined,
            },
        );
        return `${startDay}–${endText}`;
    }

    const startText = formatCalendarDate(
        startCalendar.year,
        startCalendar.month,
        startCalendar.day,
        {
            day: "numeric",
            month: "long",
            year: !sameYear || includeYear ? "numeric" : undefined,
        },
    );
    const endText = formatCalendarDate(
        endCalendar.year,
        endCalendar.month,
        endCalendar.day,
        {
            day: "numeric",
            month: "long",
            year: includeYear ? "numeric" : undefined,
        },
    );
    return `${startText}–${endText}`;
}

export function getCompletedReportPeriod(
    mode: ReportMode,
    now = new Date(),
): ReportPeriod {
    const current = singaporeCalendarDate(now);
    let start: Date;
    let end: Date;
    let previousStart: Date;

    if (mode === "weekly") {
        const mondayOffset = (current.weekday + 6) % 7;
        end = singaporeMidnightUtc(
            current.year,
            current.month,
            current.day - mondayOffset,
        );
        start = new Date(end.getTime() - 7 * DAY_MS);
        previousStart = new Date(start.getTime() - 7 * DAY_MS);
    } else {
        end = singaporeMidnightUtc(current.year, current.month, 1);
        start = singaporeMidnightUtc(current.year, current.month - 1, 1);
        previousStart = singaporeMidnightUtc(current.year, current.month - 2, 1);
    }

    const periodLabel = mode === "weekly"
        ? formatWeeklyRange(start, end, true)
        : formatCalendarDate(
            singaporeCalendarDate(start).year,
            singaporeCalendarDate(start).month,
            1,
            { month: "long", year: "numeric" },
        );
    const startCalendar = singaporeCalendarDate(start);
    const previousStartCalendar = singaporeCalendarDate(previousStart);
    const comparisonCrossesYear = previousStartCalendar.year !== startCalendar.year;
    const comparisonLabel = mode === "weekly"
        ? formatWeeklyRange(previousStart, start, comparisonCrossesYear)
        : formatCalendarDate(previousStartCalendar.year, previousStartCalendar.month, 1, {
            month: "long",
            year: comparisonCrossesYear ? "numeric" : undefined,
        });
    const summaryLabel = mode === "weekly"
        ? formatWeeklyRange(start, end, false)
        : formatCalendarDate(
            singaporeCalendarDate(start).year,
            singaporeCalendarDate(start).month,
            1,
            { month: "long" },
        );

    return {
        mode,
        startUtc: start.toISOString(),
        endUtc: end.toISOString(),
        previousStartUtc: previousStart.toISOString(),
        previousEndUtc: start.toISOString(),
        startDate: dateOnlyInSingapore(start),
        endDate: dateOnlyInSingapore(end),
        periodLabel,
        comparisonLabel,
        summaryLabel,
    };
}

export function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function formatSgd(value: number) {
    return new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency: REPORT_BASE_CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function getReportableAmount(expense: ExpenseReportRow) {
    if (
        expense.conversion_status === "converted" &&
        typeof expense.base_amount === "number" &&
        Number.isFinite(expense.base_amount)
    ) {
        return expense.base_amount;
    }

    if (
        expense.currency === REPORT_BASE_CURRENCY &&
        typeof expense.amount === "number" &&
        Number.isFinite(expense.amount)
    ) {
        return expense.amount;
    }

    return null;
}

function isInRange(value: string, start: string, end: string) {
    const timestamp = new Date(value).getTime();
    return (
        Number.isFinite(timestamp) &&
        timestamp >= new Date(start).getTime() &&
        timestamp < new Date(end).getTime()
    );
}

function getCategoryDisplay(
    expense: ExpenseReportRow,
    categoryById: Map<string, ActiveExpenseCategory>,
) {
    const category = expense.category_id ? categoryById.get(expense.category_id) : null;
    return {
        key: category?.id ?? expense.category_id ?? expense.category_name,
        label: category?.name ?? expense.category_name,
        iconName: category?.icon_name ?? expense.category_icon_name ?? null,
    };
}

function normalizeReportableExpenses(
    expenses: ExpenseReportRow[],
    categories: ActiveExpenseCategory[],
) {
    const categoryById = new Map(
        categories
            .filter((category) => !category.deleted_at)
            .map((category) => [category.id, category]),
    );

    return expenses.flatMap((expense): ReportableExpense[] => {
        if (expense.deleted_at) return [];
        const value = getReportableAmount(expense);
        if (typeof value !== "number") return [];
        return [
            {
                expense,
                value,
                category: getCategoryDisplay(expense, categoryById),
            },
        ];
    });
}

function sumExpenses(expenses: ReportableExpense[]) {
    return expenses.reduce((sum, item) => sum + item.value, 0);
}

function groupCategories(expenses: ReportableExpense[]) {
    const grouped = new Map<
        string,
        { label: string; iconName: string | null; total: number }
    >();

    for (const item of expenses) {
        const existing = grouped.get(item.category.key) ?? {
            label: item.category.label,
            iconName: item.category.iconName,
            total: 0,
        };
        existing.total += item.value;
        grouped.set(item.category.key, existing);
    }

    return Array.from(grouped.entries())
        .map(([key, item]) => ({
            key,
            label: item.label,
            iconName: item.iconName,
            total: roundMoney(item.total),
        }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function getHighestWeekday(expenses: ReportableExpense[]) {
    const totals = new Map<string, number>();
    const formatter = new Intl.DateTimeFormat("en-SG", {
        weekday: "long",
        timeZone: REPORT_TIME_ZONE,
    });

    for (const item of expenses) {
        const paidAt = new Date(item.expense.paid_at);
        if (Number.isNaN(paidAt.getTime())) continue;
        const weekday = formatter.format(paidAt);
        totals.set(weekday, (totals.get(weekday) ?? 0) + item.value);
    }

    return (
        Array.from(totals.entries()).sort((a, b) => {
            const totalDiff = b[1] - a[1];
            if (totalDiff !== 0) return totalDiff;
            return WEEKDAYS.indexOf(a[0] as (typeof WEEKDAYS)[number]) -
                WEEKDAYS.indexOf(b[0] as (typeof WEEKDAYS)[number]);
        })[0]?.[0] ?? null
    );
}

function compareNewestFirst(a: ReportableExpense, b: ReportableExpense) {
    const paidDiff = new Date(b.expense.paid_at).getTime() -
        new Date(a.expense.paid_at).getTime();
    if (paidDiff !== 0) return paidDiff;
    const createdDiff = new Date(b.expense.created_at ?? 0).getTime() -
        new Date(a.expense.created_at ?? 0).getTime();
    if (createdDiff !== 0) return createdDiff;
    return b.expense.id.localeCompare(a.expense.id);
}

export function buildExpenseReport(input: {
    mode: ReportMode;
    period: ReportPeriod;
    expenses: ExpenseReportRow[];
    categories: ActiveExpenseCategory[];
    duduUserId: string;
    bubuUserId: string;
}): ExpenseReport {
    const reportable = normalizeReportableExpenses(
        input.expenses,
        input.categories,
    );
    const current = reportable.filter((item) =>
        isInRange(
            item.expense.paid_at,
            input.period.startUtc,
            input.period.endUtc,
        )
    );
    const previous = reportable.filter((item) =>
        isInRange(
            item.expense.paid_at,
            input.period.previousStartUtc,
            input.period.previousEndUtc,
        )
    );
    const currentDudu = current.filter(
        (item) => item.expense.paid_by === input.duduUserId,
    );
    const currentBubu = current.filter(
        (item) => item.expense.paid_by === input.bubuUserId,
    );
    const previousDudu = previous.filter(
        (item) => item.expense.paid_by === input.duduUserId,
    );
    const previousBubu = previous.filter(
        (item) => item.expense.paid_by === input.bubuUserId,
    );

    const combinedRawTotal = sumExpenses(current);
    const previousCombinedRawTotal = sumExpenses(previous);
    const duduRawTotal = sumExpenses(currentDudu);
    const bubuRawTotal = sumExpenses(currentBubu);
    const previousDuduRawTotal = sumExpenses(previousDudu);
    const previousBubuRawTotal = sumExpenses(previousBubu);
    const combinedTotal = roundMoney(combinedRawTotal);
    const previousCombinedTotal = roundMoney(previousCombinedRawTotal);
    const duduTotal = roundMoney(duduRawTotal);
    const bubuTotal = roundMoney(bubuRawTotal);
    const previousDuduTotal = roundMoney(previousDuduRawTotal);
    const previousBubuTotal = roundMoney(previousBubuRawTotal);
    const combinedCategories = groupCategories(current);
    const combinedRawChange = combinedRawTotal - previousCombinedRawTotal;
    const combinedChange = roundMoney(combinedRawChange);

    return {
        mode: input.mode,
        period: input.period,
        combinedTotal,
        combinedTopCategories: combinedCategories.slice(0, 5),
        duduTotal,
        duduTopCategories: groupCategories(currentDudu).slice(0, 5),
        bubuTotal,
        bubuTopCategories: groupCategories(currentBubu).slice(0, 5),
        largestExpenses: current
            .slice()
            .sort((a, b) => b.value - a.value || compareNewestFirst(a, b))
            .slice(0, 5)
            .map((item) => ({
                id: item.expense.id,
                title: item.expense.title,
                total: roundMoney(item.value),
            })),
        previousCombinedTotal,
        previousDuduTotal,
        previousBubuTotal,
        combinedChange,
        combinedPercentChange: previousCombinedRawTotal > 0
            ? (combinedRawChange / previousCombinedRawTotal) * 100
            : null,
        duduChange: roundMoney(duduRawTotal - previousDuduRawTotal),
        bubuChange: roundMoney(bubuRawTotal - previousBubuRawTotal),
        transactionCount: current.length,
        averagePerTransaction: current.length > 0 ? roundMoney(combinedTotal / current.length) : 0,
        highestCategory: combinedCategories[0] ?? null,
        highestWeekday: getHighestWeekday(current),
    };
}

export function getCategorySymbol(
    categoryName: string,
    _iconName?: string | null,
) {
    const normalized = categoryName.trim().toLowerCase();
    const symbols: Record<string, string> = {
        food: "🍽️",
        health: "❤️",
        medical: "🩺",
        bills: "🧾",
        transport: "🚗",
    };
    return symbols[normalized] ?? SAFE_CATEGORY_SYMBOL;
}

function formatCategoryLines(categories: CategoryTotal[]) {
    if (categories.length === 0) return ["No reportable spending"];
    return categories.map(
        (category) =>
            `${getCategorySymbol(category.label, category.iconName)} ${category.label} — ${
                formatSgd(
                    category.total,
                )
            }`,
    );
}

function formatChange(value: number) {
    const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "—";
    return `${arrow} ${formatSgd(Math.abs(value))}`;
}

export function formatCombinedComparison(report: ExpenseReport) {
    const base = `Combined spending: ${formatChange(report.combinedChange)}`;
    if (report.previousCombinedTotal <= 0) return base;
    const percentage = report.combinedPercentChange ?? 0;
    const sign = percentage > 0 ? "+" : "";
    return `${base} (${sign}${percentage.toFixed(1)}%)`;
}

function truncate(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

export function formatExpenseReport(report: ExpenseReport) {
    const title = report.mode === "weekly" ? "Weekly" : "Monthly";
    const largestLines = report.largestExpenses.length === 0
        ? ["No reportable expenses"]
        : report.largestExpenses.map(
            (expense, index) =>
                `${index + 1}. ${formatSgd(expense.total)} — ${
                    truncate(
                        expense.title,
                        80,
                    )
                }`,
        );
    const highestCategory = report.highestCategory
        ? `${
            getCategorySymbol(
                report.highestCategory.label,
                report.highestCategory.iconName,
            )
        } ${report.highestCategory.label}`
        : "—";

    return [
        `BubuDudu ${title} Finance Report`,
        report.period.periodLabel,
        "",
        "Total Combined Spending",
        formatSgd(report.combinedTotal),
        "",
        DIVIDER,
        "",
        "Combined Top Categories",
        "",
        ...formatCategoryLines(report.combinedTopCategories),
        "",
        DIVIDER,
        "",
        "Dudu",
        "",
        `Total spent: ${formatSgd(report.duduTotal)}`,
        "",
        "Top categories:",
        ...formatCategoryLines(report.duduTopCategories),
        "",
        DIVIDER,
        "",
        "Bubu",
        "",
        `Total spent: ${formatSgd(report.bubuTotal)}`,
        "",
        "Top categories:",
        ...formatCategoryLines(report.bubuTopCategories),
        "",
        DIVIDER,
        "",
        "Largest Expenses",
        "",
        ...largestLines,
        "",
        DIVIDER,
        "",
        `Compared with ${report.period.comparisonLabel}`,
        "",
        formatCombinedComparison(report),
        `Dudu: ${formatChange(report.duduChange)}`,
        `Bubu: ${formatChange(report.bubuChange)}`,
        "",
        DIVIDER,
        "",
        `${report.period.summaryLabel} Summary`,
        "",
        `Total transactions: ${report.transactionCount}`,
        `Average per transaction: ${formatSgd(report.averagePerTransaction)}`,
        `Highest spending category: ${highestCategory}`,
        `Highest spending day: ${report.highestWeekday ?? "—"}`,
    ].join("\n");
}
