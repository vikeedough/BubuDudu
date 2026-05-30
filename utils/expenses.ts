import dayjs from "dayjs";

import type {
    Expense,
    ExpenseBudget,
    ExpenseCategory,
} from "@/api/endpoints/types";

export const DEFAULT_EXPENSE_CURRENCY = "SGD";

export const POPULAR_CURRENCIES = [
    "SGD",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "NZD",
    "CAD",
    "CHF",
    "CNY",
    "HKD",
    "MYR",
    "THB",
    "IDR",
    "VND",
    "KRW",
    "TWD",
    "PHP",
    "INR",
    "AED",
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
    { name: "Food", color: "#F04770" },
    { name: "Health", color: "#06D7A0" },
    { name: "Medical", color: "#108AB1" },
    { name: "Bills", color: "#FFD167" },
    { name: "Transport", color: "#F78C6A" },
] as const;

export const EXPENSE_CATEGORY_COLORS = [
    "#F04770",
    "#F78C6A",
    "#FFD167",
    "#06D7A0",
    "#108AB1",
    "#073A4B",
] as const;

export type ExpensePeriod = "daily" | "weekly" | "monthly" | "yearly";
export type ExpenseLogPeriod = Exclude<ExpensePeriod, "yearly">;
export type ExpenseScope = "space" | "me";

export type ExpensePeriodRange = {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    dayCount: number;
};

export type ExpenseBreakdownItem = {
    key: string;
    label: string;
    color: string;
    total: number;
    percentage: number;
    count: number;
};

export type ExpenseAnalytics = {
    period: ExpensePeriod;
    scope: ExpenseScope;
    total: number;
    previousTotal: number;
    percentChange: number | null;
    averageDailySpend: number;
    transactionCount: number;
    pendingConversionCount: number;
    largestExpense: Expense | null;
    topCategory: ExpenseBreakdownItem | null;
    breakdown: ExpenseBreakdownItem[];
};

export type ExpenseBudgetRow = {
    budget: ExpenseBudget;
    categoryName: string;
    categoryColor: string;
    spent: number;
    remaining: number;
    percentage: number;
    isOverBudget: boolean;
};

export type ExpenseBudgetAnalytics = {
    month: string;
    scope: ExpenseScope;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    percentage: number;
    rows: ExpenseBudgetRow[];
};

export function normalizeCurrencyCode(value: string) {
    return value.trim().toUpperCase();
}

export function parseExpenseAmount(value: string): number | null {
    const normalized = value.replace(/,/g, "").trim();
    if (normalized.length === 0) return null;

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

export function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function formatCurrency(
    value: number | null | undefined,
    currency = DEFAULT_EXPENSE_CURRENCY,
) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return `${currency} --`;
    }

    try {
        return new Intl.NumberFormat("en-SG", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
}

function getExpenseTimestamp(value: string) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareExpensesNewestFirst(a: Expense, b: Expense) {
    const paidDiff =
        getExpenseTimestamp(b.paid_at) - getExpenseTimestamp(a.paid_at);
    if (paidDiff !== 0) return paidDiff;

    const createdDiff =
        getExpenseTimestamp(b.created_at) - getExpenseTimestamp(a.created_at);
    if (createdDiff !== 0) return createdDiff;

    return b.id.localeCompare(a.id);
}

export function sortExpensesNewestFirst(expenses: Expense[]) {
    return expenses.slice().sort(compareExpensesNewestFirst);
}

export function formatExpenseTime(value: string) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("HH:mm") : "--:--";
}

export function getExpenseTitleSuggestions(input: {
    expenses: Expense[];
    query: string;
    currentUserId: string | null;
    excludeExpenseId?: string | null;
    minLength?: number;
    limit?: number;
}) {
    const query = input.query.trim().toLowerCase();
    const minLength = input.minLength ?? 2;
    if (!input.currentUserId || query.length < minLength) return [];

    const byTitle = new Map<
        string,
        { title: string; lastUsedAt: number }
    >();

    for (const expense of input.expenses) {
        if (expense.created_by !== input.currentUserId) continue;
        if (expense.id === input.excludeExpenseId) continue;

        const title = expense.title.trim();
        if (title.length === 0) continue;

        const normalized = title.toLowerCase();
        if (normalized === query) continue;

        const lastUsedAt = new Date(expense.created_at).getTime();
        const existing = byTitle.get(normalized);
        if (!existing || lastUsedAt > existing.lastUsedAt) {
            byTitle.set(normalized, {
                title,
                lastUsedAt: Number.isFinite(lastUsedAt) ? lastUsedAt : 0,
            });
        }
    }

    return Array.from(byTitle.entries())
        .map(([normalized, item]) => ({
            ...item,
            normalized,
            matchRank: normalized.startsWith(query) ? 0 : 1,
        }))
        .filter(
            (item) =>
                item.matchRank === 0 || item.normalized.includes(query),
        )
        .sort((a, b) => {
            if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
            if (a.lastUsedAt !== b.lastUsedAt) return b.lastUsedAt - a.lastUsedAt;
            return a.title.localeCompare(b.title);
        })
        .slice(0, input.limit ?? 3)
        .map((item) => item.title);
}

export function getPeriodRange(
    period: ExpensePeriod,
    anchorDate = new Date(),
): ExpensePeriodRange {
    const anchor = dayjs(anchorDate);
    let start = anchor.startOf("day");
    let end = start.add(1, "day");

    if (period === "weekly") {
        const mondayOffset = (anchor.day() + 6) % 7;
        start = anchor.startOf("day").subtract(mondayOffset, "day");
        end = start.add(1, "week");
    }

    if (period === "monthly") {
        start = anchor.startOf("month");
        end = start.add(1, "month");
    }

    if (period === "yearly") {
        start = anchor.startOf("year");
        end = start.add(1, "year");
    }

    let previousStart = start.subtract(1, "day");
    if (period === "weekly") previousStart = start.subtract(1, "week");
    if (period === "monthly") previousStart = start.subtract(1, "month");
    if (period === "yearly") previousStart = start.subtract(1, "year");
    const previousEnd = start;

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        dayCount: Math.max(1, end.diff(start, "day")),
    };
}

export function getExpensePeriodLabel(
    period: ExpensePeriod,
    anchorDate = new Date(),
) {
    const anchor = dayjs(anchorDate);
    if (period === "daily") {
        return anchor.isSame(dayjs(), "day")
            ? "Today"
            : anchor.format("D MMM YYYY");
    }
    if (period === "weekly") {
        const range = getPeriodRange(period, anchorDate);
        return `${dayjs(range.start).format("D MMM")} - ${dayjs(range.end)
            .subtract(1, "day")
            .format("D MMM YYYY")}`;
    }
    if (period === "monthly") return anchor.format("MMMM YYYY");
    return anchor.format("YYYY");
}

export function getExpenseMonthStart(anchorDate = new Date()) {
    return dayjs(anchorDate).startOf("month").format("YYYY-MM-DD");
}

export function getExpenseMonthLabel(anchorDate = new Date()) {
    return dayjs(anchorDate).format("MMMM YYYY");
}

export function shiftExpenseMonth(anchorDate: Date, direction: -1 | 1) {
    return dayjs(anchorDate).add(direction, "month").toDate();
}

export function shiftExpensePeriod(
    anchorDate: Date,
    period: ExpensePeriod,
    direction: -1 | 1,
) {
    const anchor = dayjs(anchorDate);
    if (period === "daily") return anchor.add(direction, "day").toDate();
    if (period === "weekly") return anchor.add(direction, "week").toDate();
    if (period === "monthly") return anchor.add(direction, "month").toDate();
    return anchor.add(direction, "year").toDate();
}

function isInRange(value: string, start: string, end: string) {
    const timestamp = new Date(value).getTime();
    return (
        Number.isFinite(timestamp) &&
        timestamp >= new Date(start).getTime() &&
        timestamp < new Date(end).getTime()
    );
}

export function isExpenseInPeriod(
    expense: Expense,
    period: ExpensePeriod,
    anchorDate = new Date(),
) {
    const range = getPeriodRange(period, anchorDate);
    return isInRange(expense.paid_at, range.start, range.end);
}

function getExpenseBaseAmount(expense: Expense) {
    if (
        expense.conversion_status === "converted" &&
        typeof expense.base_amount === "number"
    ) {
        return expense.base_amount;
    }

    if (expense.currency === DEFAULT_EXPENSE_CURRENCY) {
        return expense.amount;
    }

    return null;
}

function isBudgetInScope(
    budget: ExpenseBudget,
    scope: ExpenseScope,
    currentUserId: string | null,
) {
    if (scope === "space") {
        return budget.scope === "space" && budget.owner_user_id === null;
    }

    return (
        budget.scope === "user" &&
        !!currentUserId &&
        budget.owner_user_id === currentUserId
    );
}

function getCategoryDisplay(
    expense: Expense,
    categoryById: Map<string, ExpenseCategory>,
) {
    const category = expense.category_id
        ? categoryById.get(expense.category_id)
        : null;
    return {
        key: category?.id ?? expense.category_id ?? expense.category_name,
        label: category?.name ?? expense.category_name,
        color: category?.color ?? expense.category_color,
    };
}

export function getExpensesForBreakdownCategory(input: {
    expenses: Expense[];
    categories: ExpenseCategory[];
    categoryKey: string;
    period: ExpensePeriod;
    scope: ExpenseScope;
    currentUserId: string | null;
    anchorDate?: Date;
}) {
    const range = getPeriodRange(input.period, input.anchorDate);
    const categoryById = new Map(input.categories.map((c) => [c.id, c]));

    return sortExpensesNewestFirst(
        input.expenses.filter((expense) => {
            if (input.scope === "me") {
                if (!input.currentUserId) return false;
                if (expense.paid_by !== input.currentUserId) return false;
            }

            if (!isInRange(expense.paid_at, range.start, range.end)) {
                return false;
            }

            return getCategoryDisplay(expense, categoryById).key === input.categoryKey;
        }),
    );
}

function percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return ((current - previous) / previous) * 100;
}

export function buildExpenseAnalytics(input: {
    expenses: Expense[];
    categories: ExpenseCategory[];
    period: ExpensePeriod;
    scope: ExpenseScope;
    currentUserId: string | null;
    anchorDate?: Date;
}): ExpenseAnalytics {
    const range = getPeriodRange(input.period, input.anchorDate);
    const categoryById = new Map(input.categories.map((c) => [c.id, c]));

    const scopedExpenses = input.expenses.filter((expense) => {
        if (input.scope === "space") return true;
        return !!input.currentUserId && expense.paid_by === input.currentUserId;
    });

    const currentExpenses = scopedExpenses.filter((expense) =>
        isInRange(expense.paid_at, range.start, range.end),
    );
    const previousExpenses = scopedExpenses.filter((expense) =>
        isInRange(expense.paid_at, range.previousStart, range.previousEnd),
    );

    const pendingConversionCount = currentExpenses.filter(
        (expense) =>
            expense.currency !== DEFAULT_EXPENSE_CURRENCY &&
            expense.conversion_status !== "converted",
    ).length;

    const currentConverted = currentExpenses
        .map((expense) => ({ expense, value: getExpenseBaseAmount(expense) }))
        .filter(
            (item): item is { expense: Expense; value: number } =>
                typeof item.value === "number",
        );

    const previousTotal = previousExpenses.reduce((sum, expense) => {
        return sum + (getExpenseBaseAmount(expense) ?? 0);
    }, 0);

    const total = currentConverted.reduce((sum, item) => sum + item.value, 0);
    const grouped = new Map<
        string,
        { label: string; color: string; total: number; count: number }
    >();

    for (const { expense, value } of currentConverted) {
        const display = getCategoryDisplay(expense, categoryById);
        const existing = grouped.get(display.key) ?? {
            label: display.label,
            color: display.color,
            total: 0,
            count: 0,
        };
        existing.total += value;
        existing.count += 1;
        grouped.set(display.key, existing);
    }

    const breakdown = Array.from(grouped.entries())
        .map(([key, item]) => ({
            key,
            label: item.label,
            color: item.color,
            total: roundMoney(item.total),
            percentage: total > 0 ? (item.total / total) * 100 : 0,
            count: item.count,
        }))
        .sort((a, b) => b.total - a.total);

    const largestExpense =
        currentConverted.length === 0
            ? null
            : currentConverted.reduce((largest, item) =>
                  item.value > largest.value ? item : largest,
              ).expense;

    return {
        period: input.period,
        scope: input.scope,
        total: roundMoney(total),
        previousTotal: roundMoney(previousTotal),
        percentChange: percentChange(total, previousTotal),
        averageDailySpend: roundMoney(total / range.dayCount),
        transactionCount: currentExpenses.length,
        pendingConversionCount,
        largestExpense,
        topCategory: breakdown[0] ?? null,
        breakdown,
    };
}

export function buildExpenseBudgetAnalytics(input: {
    expenses: Expense[];
    budgets: ExpenseBudget[];
    categories: ExpenseCategory[];
    scope: ExpenseScope;
    currentUserId: string | null;
    anchorDate?: Date;
}): ExpenseBudgetAnalytics {
    const month = getExpenseMonthStart(input.anchorDate);
    const range = getPeriodRange("monthly", input.anchorDate);
    const categoryById = new Map(input.categories.map((c) => [c.id, c]));

    const scopedBudgets = input.budgets.filter(
        (budget) =>
            !budget.deleted_at &&
            budget.month === month &&
            isBudgetInScope(budget, input.scope, input.currentUserId),
    );

    const scopedExpenses = input.expenses.filter((expense) => {
        if (input.scope === "space") return true;
        return !!input.currentUserId && expense.paid_by === input.currentUserId;
    });

    const spendingByCategory = new Map<string, number>();
    for (const expense of scopedExpenses) {
        if (!expense.category_id) continue;
        if (!isInRange(expense.paid_at, range.start, range.end)) continue;

        const value = getExpenseBaseAmount(expense);
        if (typeof value !== "number") continue;

        spendingByCategory.set(
            expense.category_id,
            (spendingByCategory.get(expense.category_id) ?? 0) + value,
        );
    }

    const rows = scopedBudgets
        .map((budget) => {
            const category = categoryById.get(budget.category_id);
            const spent = roundMoney(spendingByCategory.get(budget.category_id) ?? 0);
            const amount = roundMoney(budget.amount);
            const remaining = roundMoney(amount - spent);
            const percentage = amount > 0 ? (spent / amount) * 100 : 0;

            return {
                budget,
                categoryName: category?.name ?? budget.category_name,
                categoryColor: category?.color ?? budget.category_color,
                spent,
                remaining,
                percentage,
                isOverBudget: spent > amount,
            };
        })
        .sort((a, b) => {
            const categoryA = categoryById.get(a.budget.category_id);
            const categoryB = categoryById.get(b.budget.category_id);
            const orderA = categoryA?.sort_order ?? Number.MAX_SAFE_INTEGER;
            const orderB = categoryB?.sort_order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return a.categoryName.localeCompare(b.categoryName);
        });

    const totalBudget = rows.reduce((sum, row) => sum + row.budget.amount, 0);
    const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    return {
        month,
        scope: input.scope,
        totalBudget: roundMoney(totalBudget),
        totalSpent: roundMoney(totalSpent),
        totalRemaining: roundMoney(totalRemaining),
        percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        rows,
    };
}
