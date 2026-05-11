import { create } from "zustand";

import { supabase } from "@/api/clients/supabaseClient";
import {
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_EXPENSE_CURRENCY,
    EXPENSE_CATEGORY_COLORS,
    getExpenseMonthStart,
    normalizeCurrencyCode,
    roundMoney,
    shiftExpenseMonth,
} from "@/utils/expenses";
import { createLocalId } from "@/utils/offline/id";
import {
    enqueueOutbox,
    getCachedExchangeRate,
    getCachedExpenseBudgets,
    getCachedExpenseCategories,
    getCachedExpenses,
    markCachedExpenseBudgetDeleted,
    markCachedExpenseCategoryDeleted,
    markCachedExpenseDeleted,
    replaceCachedExpenseBudgets,
    replaceCachedExpenseCategories,
    replaceCachedExpenses,
    upsertCachedExchangeRate,
    upsertCachedExpenseBudget,
    upsertCachedExpense,
    upsertCachedExpenseCategory,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { flushOutbox, refreshPendingSyncCount } from "@/utils/offline/sync";
import { getSpaceId } from "@/utils/secure-store";

import type {
    Expense,
    ExpenseBudget,
    ExpenseBudgetScope,
    ExpenseCategory,
    ExpenseConversionStatus,
} from "@/api/endpoints/types";

type ExpenseDraftInput = {
    title: string;
    amount: number;
    currency: string;
    categoryId: string;
    paidBy: string;
    description?: string | null;
    paidAt: string;
};

type ExpenseUpdateInput = Partial<ExpenseDraftInput>;

type BudgetDraftInput = {
    scope: "space" | "me";
    categoryId: string;
    amount: number;
    month: string;
};

type ConversionResult = Pick<
    Expense,
    "base_amount" | "base_currency" | "exchange_rate" | "exchange_rate_date"
> & {
    conversion_status: ExpenseConversionStatus;
};

type ExpenseStore = {
    expenses: Expense[];
    categories: ExpenseCategory[];
    budgets: ExpenseBudget[];
    currentUserId: string | null;
    isLoadingExpenses: boolean;
    isLoadingCategories: boolean;
    isLoadingBudgets: boolean;
    isSavingExpense: boolean;
    isSavingCategory: boolean;
    isSavingBudget: boolean;
    error: string | null;

    refreshAll: () => Promise<void>;
    fetchExpenses: () => Promise<void>;
    fetchCategories: () => Promise<void>;
    fetchBudgets: () => Promise<void>;
    retryPendingConversions: () => Promise<void>;

    addExpense: (input: ExpenseDraftInput) => Promise<Expense>;
    updateExpense: (
        expenseId: string,
        input: ExpenseUpdateInput,
    ) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;

    addCategory: (name: string, color?: string) => Promise<ExpenseCategory>;
    updateCategory: (
        categoryId: string,
        patch: Pick<ExpenseCategory, "name" | "color">,
    ) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;
    setBudget: (input: BudgetDraftInput) => Promise<ExpenseBudget>;
    deleteBudget: (budgetId: string) => Promise<void>;
    ensureBudgetsForMonth: (
        scope: "space" | "me",
        anchorDate: Date,
    ) => Promise<void>;
    clear: () => void;
};

function sortExpenses(expenses: Expense[]) {
    return expenses.slice().sort((a, b) => {
        const paidDiff =
            new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
        if (paidDiff !== 0) return paidDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function sortCategories(categories: ExpenseCategory[]) {
    return categories.slice().sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
    });
}

function sortBudgets(budgets: ExpenseBudget[]) {
    return budgets.slice().sort((a, b) => {
        const monthDiff = b.month.localeCompare(a.month);
        if (monthDiff !== 0) return monthDiff;
        return a.category_name.localeCompare(b.category_name);
    });
}

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCategory(row: any): ExpenseCategory {
    return {
        id: String(row.id),
        space_id: String(row.space_id),
        created_by: row.created_by ?? null,
        name: String(row.name),
        color: String(row.color),
        sort_order: Number(row.sort_order ?? 0),
        is_default: Boolean(row.is_default),
        created_at: String(row.created_at),
        updated_at: row.updated_at ?? null,
        deleted_at: row.deleted_at ?? null,
    };
}

function normalizeExpense(row: any): Expense {
    return {
        id: String(row.id),
        space_id: String(row.space_id),
        created_by: String(row.created_by),
        paid_by: String(row.paid_by ?? row.created_by),
        category_id: row.category_id ?? null,
        category_name: String(row.category_name),
        category_color: String(row.category_color),
        title: String(row.title),
        description: row.description ?? null,
        amount: toNumber(row.amount) ?? 0,
        currency: normalizeCurrencyCode(String(row.currency)),
        base_amount: toNumber(row.base_amount),
        base_currency: normalizeCurrencyCode(
            String(row.base_currency ?? DEFAULT_EXPENSE_CURRENCY),
        ),
        exchange_rate: toNumber(row.exchange_rate),
        exchange_rate_date: row.exchange_rate_date ?? null,
        conversion_status:
            row.conversion_status === "failed" ||
            row.conversion_status === "pending"
                ? row.conversion_status
                : "converted",
        paid_at: String(row.paid_at),
        created_at: String(row.created_at),
        updated_at: row.updated_at ?? null,
        deleted_at: row.deleted_at ?? null,
    };
}

function normalizeBudget(row: any): ExpenseBudget {
    return {
        id: String(row.id),
        space_id: String(row.space_id),
        created_by: String(row.created_by),
        scope: row.scope === "user" ? "user" : "space",
        owner_user_id: row.owner_user_id ?? null,
        category_id: String(row.category_id),
        category_name: String(row.category_name),
        category_color: String(row.category_color),
        month: String(row.month),
        amount: toNumber(row.amount) ?? 0,
        currency: normalizeCurrencyCode(
            String(row.currency ?? DEFAULT_EXPENSE_CURRENCY),
        ),
        created_at: String(row.created_at),
        updated_at: row.updated_at ?? null,
        deleted_at: row.deleted_at ?? null,
    };
}

async function getCurrentUserId() {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) return session.user.id;

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user?.id) throw new Error("No authenticated user");
    return user.id;
}

async function enqueueExpenseOperation(
    operation: "insert" | "update" | "delete",
    expenseId: string,
    payload: unknown,
) {
    await enqueueOutbox({
        id: createLocalId(),
        entity: "expenses",
        entity_id: expenseId,
        operation,
        payload_json: JSON.stringify(payload),
        created_at: new Date().toISOString(),
    });
    await refreshPendingSyncCount();
}

async function enqueueCategoryOperation(
    operation: "insert" | "update" | "delete",
    categoryId: string,
    payload: unknown,
) {
    await enqueueOutbox({
        id: createLocalId(),
        entity: "expense_categories",
        entity_id: categoryId,
        operation,
        payload_json: JSON.stringify(payload),
        created_at: new Date().toISOString(),
    });
    await refreshPendingSyncCount();
}

async function enqueueBudgetOperation(
    operation: "insert" | "update" | "delete",
    budgetId: string,
    payload: unknown,
) {
    await enqueueOutbox({
        id: createLocalId(),
        entity: "expense_budgets",
        entity_id: budgetId,
        operation,
        payload_json: JSON.stringify(payload),
        created_at: new Date().toISOString(),
    });
    await refreshPendingSyncCount();
}

function getBudgetScope(inputScope: "space" | "me"): ExpenseBudgetScope {
    return inputScope === "me" ? "user" : "space";
}

function getBudgetOwnerId(inputScope: "space" | "me", userId: string) {
    return inputScope === "me" ? userId : null;
}

function isBudgetMatch(
    budget: ExpenseBudget,
    input: {
        scope: "space" | "me";
        ownerUserId: string | null;
        categoryId: string;
        month: string;
    },
) {
    return (
        budget.scope === getBudgetScope(input.scope) &&
        budget.owner_user_id === input.ownerUserId &&
        budget.category_id === input.categoryId &&
        budget.month === input.month &&
        !budget.deleted_at
    );
}

function isBudgetInScopeAndMonth(
    budget: ExpenseBudget,
    scope: "space" | "me",
    ownerUserId: string | null,
    month: string,
) {
    return (
        budget.scope === getBudgetScope(scope) &&
        budget.owner_user_id === ownerUserId &&
        budget.month === month &&
        !budget.deleted_at
    );
}

async function fetchSgdRate(fromCurrency: string) {
    const response = await fetch(
        `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(
            fromCurrency,
        )}/${DEFAULT_EXPENSE_CURRENCY}`,
    );

    if (!response.ok) {
        throw new Error("Failed to fetch exchange rate");
    }

    const body = (await response.json()) as {
        date?: string;
        rate?: number;
    };

    if (typeof body.rate !== "number" || !Number.isFinite(body.rate)) {
        throw new Error("Exchange rate response was invalid");
    }

    return {
        rate: body.rate,
        rateDate: body.date ?? new Date().toISOString().slice(0, 10),
    };
}

async function resolveConversion(
    amount: number,
    currencyInput: string,
): Promise<ConversionResult> {
    const currency = normalizeCurrencyCode(currencyInput);

    if (currency === DEFAULT_EXPENSE_CURRENCY) {
        return {
            base_amount: roundMoney(amount),
            base_currency: DEFAULT_EXPENSE_CURRENCY,
            exchange_rate: 1,
            exchange_rate_date: new Date().toISOString().slice(0, 10),
            conversion_status: "converted",
        };
    }

    if (getIsOnline()) {
        try {
            const fetched = await fetchSgdRate(currency);
            await upsertCachedExchangeRate({
                from_currency: currency,
                to_currency: DEFAULT_EXPENSE_CURRENCY,
                rate: fetched.rate,
                rate_date: fetched.rateDate,
                fetched_at: new Date().toISOString(),
            });

            return {
                base_amount: roundMoney(amount * fetched.rate),
                base_currency: DEFAULT_EXPENSE_CURRENCY,
                exchange_rate: fetched.rate,
                exchange_rate_date: fetched.rateDate,
                conversion_status: "converted",
            };
        } catch {
            // Fall through to cached rate, then pending.
        }
    }

    const cached = await getCachedExchangeRate(currency, DEFAULT_EXPENSE_CURRENCY);
    if (cached) {
        return {
            base_amount: roundMoney(amount * cached.rate),
            base_currency: DEFAULT_EXPENSE_CURRENCY,
            exchange_rate: cached.rate,
            exchange_rate_date: cached.rate_date,
            conversion_status: "converted",
        };
    }

    return {
        base_amount: null,
        base_currency: DEFAULT_EXPENSE_CURRENCY,
        exchange_rate: null,
        exchange_rate_date: null,
        conversion_status: "pending",
    };
}

function buildDefaultCategories(spaceId: string, userId: string) {
    const now = new Date().toISOString();
    return DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
        id: createLocalId(),
        space_id: spaceId,
        created_by: userId,
        name: category.name,
        color: category.color,
        sort_order: index,
        is_default: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
    }));
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
    expenses: [],
    categories: [],
    budgets: [],
    currentUserId: null,
    isLoadingExpenses: false,
    isLoadingCategories: false,
    isLoadingBudgets: false,
    isSavingExpense: false,
    isSavingCategory: false,
    isSavingBudget: false,
    error: null,

    clear: () =>
        set({
            expenses: [],
            categories: [],
            budgets: [],
            currentUserId: null,
            isLoadingExpenses: false,
            isLoadingCategories: false,
            isLoadingBudgets: false,
            isSavingExpense: false,
            isSavingCategory: false,
            isSavingBudget: false,
            error: null,
        }),

    refreshAll: async () => {
        await get().fetchCategories();
        await get().fetchBudgets();
        await get().fetchExpenses();
    },

    fetchCategories: async () => {
        if (get().isLoadingCategories) return;

        const spaceId = await getSpaceId();
        if (!spaceId) return;

        set({ isLoadingCategories: true, error: null });

        try {
            const cached = await getCachedExpenseCategories(spaceId);
            if (cached.length > 0) {
                set({ categories: sortCategories(cached) });
            }

            const userId = await getCurrentUserId();
            set({ currentUserId: userId });

            if (!getIsOnline()) {
                if (cached.length === 0) {
                    const defaults = buildDefaultCategories(spaceId, userId);
                    for (const category of defaults) {
                        await upsertCachedExpenseCategory(category);
                        await enqueueCategoryOperation(
                            "insert",
                            category.id,
                            category,
                        );
                    }
                    set({ categories: sortCategories(defaults) });
                }
                return;
            }

            await flushOutbox();

            const { data, error } = await supabase
                .from("expense_categories")
                .select("*")
                .eq("space_id", spaceId)
                .order("sort_order", { ascending: true })
                .order("name", { ascending: true });

            if (error) {
                if (cached.length > 0) return;
                throw error;
            }

            let categories = ((data ?? []) as any[])
                .map(normalizeCategory)
                .filter((category) => !category.deleted_at);

            if (categories.length === 0) {
                const defaults = buildDefaultCategories(spaceId, userId);
                const { data: inserted, error: insertError } = await supabase
                    .from("expense_categories")
                    .insert(defaults)
                    .select("*");

                if (insertError) {
                    const { data: fresh } = await supabase
                        .from("expense_categories")
                        .select("*")
                        .eq("space_id", spaceId)
                        .order("sort_order", { ascending: true })
                        .order("name", { ascending: true });
                    categories = ((fresh ?? []) as any[])
                        .map(normalizeCategory)
                        .filter((category) => !category.deleted_at);
                } else {
                    categories = inserted
                        ? (inserted as any[]).map(normalizeCategory)
                        : defaults;
                }

                if (categories.length === 0) {
                    categories = defaults;
                }
            }

            await replaceCachedExpenseCategories(spaceId, categories);
            set({ categories: sortCategories(categories) });
        } finally {
            set({ isLoadingCategories: false });
        }
    },

    fetchExpenses: async () => {
        if (get().isLoadingExpenses) return;

        const spaceId = await getSpaceId();
        if (!spaceId) return;

        set({ isLoadingExpenses: true, error: null });

        try {
            const cached = await getCachedExpenses(spaceId);
            if (cached.length > 0) {
                set({ expenses: sortExpenses(cached) });
            }

            const userId = await getCurrentUserId();
            set({ currentUserId: userId });

            if (!getIsOnline()) return;

            await flushOutbox();

            const { data, error } = await supabase
                .from("expenses")
                .select("*")
                .eq("space_id", spaceId)
                .order("paid_at", { ascending: false })
                .order("created_at", { ascending: false });

            if (error) {
                if (cached.length > 0) return;
                throw error;
            }

            const expenses = ((data ?? []) as any[])
                .map(normalizeExpense)
                .filter((expense) => !expense.deleted_at);

            await replaceCachedExpenses(spaceId, expenses);
            set({ expenses: sortExpenses(expenses) });
            await get().retryPendingConversions();
        } finally {
            set({ isLoadingExpenses: false });
        }
    },

    fetchBudgets: async () => {
        if (get().isLoadingBudgets) return;

        const spaceId = await getSpaceId();
        if (!spaceId) return;

        set({ isLoadingBudgets: true, error: null });

        try {
            const cached = await getCachedExpenseBudgets(spaceId);
            if (cached.length > 0) {
                set({ budgets: sortBudgets(cached) });
            }

            const userId = await getCurrentUserId();
            set({ currentUserId: userId });

            if (!getIsOnline()) return;

            await flushOutbox();

            const { data, error } = await supabase
                .from("expense_budgets")
                .select("*")
                .eq("space_id", spaceId)
                .order("month", { ascending: false })
                .order("category_name", { ascending: true });

            if (error) {
                if (cached.length > 0) return;
                throw error;
            }

            const budgets = ((data ?? []) as any[])
                .map(normalizeBudget)
                .filter((budget) => !budget.deleted_at);

            await replaceCachedExpenseBudgets(spaceId, budgets);
            set({ budgets: sortBudgets(budgets) });
        } finally {
            set({ isLoadingBudgets: false });
        }
    },

    retryPendingConversions: async () => {
        if (!getIsOnline()) return;

        const pending = get().expenses.filter(
            (expense) =>
                expense.currency !== DEFAULT_EXPENSE_CURRENCY &&
                expense.conversion_status !== "converted",
        );

        for (const expense of pending) {
            const conversion = await resolveConversion(
                expense.amount,
                expense.currency,
            );
            if (conversion.conversion_status !== "converted") continue;

            const patch = {
                base_amount: conversion.base_amount,
                base_currency: conversion.base_currency,
                exchange_rate: conversion.exchange_rate,
                exchange_rate_date: conversion.exchange_rate_date,
                conversion_status: conversion.conversion_status,
            };

            const { error } = await supabase
                .from("expenses")
                .update(patch)
                .eq("id", expense.id);

            if (error) continue;

            const updated = {
                ...expense,
                ...patch,
                updated_at: new Date().toISOString(),
            };
            await upsertCachedExpense(updated);
            set((state) => ({
                expenses: sortExpenses(
                    state.expenses.map((item) =>
                        item.id === expense.id ? updated : item,
                    ),
                ),
            }));
        }
    },

    addExpense: async (input) => {
        const spaceId = await getSpaceId();
        if (!spaceId) throw new Error("No active spaceId");

        const userId = await getCurrentUserId();
        set({ currentUserId: userId, isSavingExpense: true, error: null });

        try {
            if (!input.paidBy) {
                throw new Error("Please select who paid");
            }

            const category = get().categories.find(
                (item) => item.id === input.categoryId,
            );
            if (!category) throw new Error("Please select a category");

            const now = new Date().toISOString();
            const currency = normalizeCurrencyCode(input.currency);
            const conversion = await resolveConversion(input.amount, currency);
            const expense: Expense = {
                id: createLocalId(),
                space_id: spaceId,
                created_by: userId,
                paid_by: input.paidBy,
                category_id: category.id,
                category_name: category.name,
                category_color: category.color,
                title: input.title.trim(),
                description: input.description?.trim() || null,
                amount: input.amount,
                currency,
                ...conversion,
                paid_at: input.paidAt,
                created_at: now,
                updated_at: now,
                deleted_at: null,
            };

            await upsertCachedExpense(expense);
            set((state) => ({
                expenses: sortExpenses([expense, ...state.expenses]),
            }));

            if (!getIsOnline()) {
                await enqueueExpenseOperation("insert", expense.id, expense);
                return expense;
            }

            const { data, error } = await supabase
                .from("expenses")
                .insert(expense)
                .select("*")
                .single();

            if (error) throw error;

            const saved = data ? normalizeExpense(data) : expense;
            await upsertCachedExpense(saved);
            set((state) => ({
                expenses: sortExpenses(
                    state.expenses.map((item) =>
                        item.id === expense.id ? saved : item,
                    ),
                ),
            }));
            return saved;
        } finally {
            set({ isSavingExpense: false });
        }
    },

    updateExpense: async (expenseId, input) => {
        const existing = get().expenses.find((item) => item.id === expenseId);
        if (!existing) throw new Error("Expense not found");

        set({ isSavingExpense: true, error: null });

        try {
            if (input.paidBy !== undefined && input.paidBy.length === 0) {
                throw new Error("Please select who paid");
            }

            const category = input.categoryId
                ? get().categories.find((item) => item.id === input.categoryId)
                : null;
            const amount = input.amount ?? existing.amount;
            const currency = normalizeCurrencyCode(
                input.currency ?? existing.currency,
            );
            const needsConversion =
                amount !== existing.amount || currency !== existing.currency;
            const conversion = needsConversion
                ? await resolveConversion(amount, currency)
                : {
                      base_amount: existing.base_amount,
                      base_currency: existing.base_currency,
                      exchange_rate: existing.exchange_rate,
                      exchange_rate_date: existing.exchange_rate_date,
                      conversion_status: existing.conversion_status,
                  };
            const now = new Date().toISOString();
            const updated: Expense = {
                ...existing,
                title: input.title?.trim() ?? existing.title,
                paid_by: input.paidBy ?? existing.paid_by,
                description:
                    input.description === undefined
                        ? existing.description
                        : input.description?.trim() || null,
                amount,
                currency,
                ...conversion,
                category_id: category?.id ?? existing.category_id,
                category_name: category?.name ?? existing.category_name,
                category_color: category?.color ?? existing.category_color,
                paid_at: input.paidAt ?? existing.paid_at,
                updated_at: now,
            };

            await upsertCachedExpense(updated);
            set((state) => ({
                expenses: sortExpenses(
                    state.expenses.map((item) =>
                        item.id === expenseId ? updated : item,
                    ),
                ),
            }));

            const payload = {
                id: expenseId,
                paid_by: updated.paid_by,
                category_id: updated.category_id,
                category_name: updated.category_name,
                category_color: updated.category_color,
                title: updated.title,
                description: updated.description,
                amount: updated.amount,
                currency: updated.currency,
                base_amount: updated.base_amount,
                base_currency: updated.base_currency,
                exchange_rate: updated.exchange_rate,
                exchange_rate_date: updated.exchange_rate_date,
                conversion_status: updated.conversion_status,
                paid_at: updated.paid_at,
            };

            if (!getIsOnline()) {
                await enqueueExpenseOperation("update", expenseId, payload);
                return;
            }

            const { id: _id, ...patch } = payload;
            const { error } = await supabase
                .from("expenses")
                .update(patch)
                .eq("id", expenseId);
            if (error) throw error;
        } finally {
            set({ isSavingExpense: false });
        }
    },

    deleteExpense: async (expenseId) => {
        const deletedAt = new Date().toISOString();
        await markCachedExpenseDeleted(expenseId, deletedAt);
        set((state) => ({
            expenses: state.expenses.filter((item) => item.id !== expenseId),
        }));

        if (!getIsOnline()) {
            await enqueueExpenseOperation("delete", expenseId, {
                id: expenseId,
                deleted_at: deletedAt,
            });
            return;
        }

        const { error } = await supabase
            .from("expenses")
            .update({ deleted_at: deletedAt })
            .eq("id", expenseId);
        if (error) throw error;
    },

    addCategory: async (name, color) => {
        const spaceId = await getSpaceId();
        if (!spaceId) throw new Error("No active spaceId");

        const userId = await getCurrentUserId();
        const now = new Date().toISOString();
        const nextIndex = get().categories.length;
        const category: ExpenseCategory = {
            id: createLocalId(),
            space_id: spaceId,
            created_by: userId,
            name: name.trim(),
            color:
                color ??
                EXPENSE_CATEGORY_COLORS[
                    nextIndex % EXPENSE_CATEGORY_COLORS.length
                ],
            sort_order: nextIndex,
            is_default: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
        };

        set({ isSavingCategory: true, error: null });

        try {
            await upsertCachedExpenseCategory(category);
            set((state) => ({
                categories: sortCategories([...state.categories, category]),
            }));

            if (!getIsOnline()) {
                await enqueueCategoryOperation("insert", category.id, category);
                return category;
            }

            const { data, error } = await supabase
                .from("expense_categories")
                .insert(category)
                .select("*")
                .single();

            if (error) throw error;

            const saved = data ? normalizeCategory(data) : category;
            await upsertCachedExpenseCategory(saved);
            set((state) => ({
                categories: sortCategories(
                    state.categories.map((item) =>
                        item.id === category.id ? saved : item,
                    ),
                ),
            }));
            return saved;
        } finally {
            set({ isSavingCategory: false });
        }
    },

    updateCategory: async (categoryId, patch) => {
        const existing = get().categories.find((item) => item.id === categoryId);
        if (!existing) throw new Error("Category not found");

        const updated: ExpenseCategory = {
            ...existing,
            name: patch.name.trim(),
            color: patch.color,
            updated_at: new Date().toISOString(),
        };

        await upsertCachedExpenseCategory(updated);
        set((state) => ({
            categories: sortCategories(
                state.categories.map((item) =>
                    item.id === categoryId ? updated : item,
                ),
            ),
        }));

        const payload = {
            id: categoryId,
            name: updated.name,
            color: updated.color,
        };

        if (!getIsOnline()) {
            await enqueueCategoryOperation("update", categoryId, payload);
            return;
        }

        const { id: _id, ...remotePatch } = payload;
        const { error } = await supabase
            .from("expense_categories")
            .update(remotePatch)
            .eq("id", categoryId);
        if (error) throw error;
    },

    deleteCategory: async (categoryId) => {
        const deletedAt = new Date().toISOString();
        await markCachedExpenseCategoryDeleted(categoryId, deletedAt);
        set((state) => ({
            categories: state.categories.filter((item) => item.id !== categoryId),
        }));

        if (!getIsOnline()) {
            await enqueueCategoryOperation("delete", categoryId, {
                id: categoryId,
                deleted_at: deletedAt,
            });
            return;
        }

        const { error } = await supabase
            .from("expense_categories")
            .update({ deleted_at: deletedAt })
            .eq("id", categoryId);
        if (error) throw error;
    },

    setBudget: async (input) => {
        const spaceId = await getSpaceId();
        if (!spaceId) throw new Error("No active spaceId");

        const userId = await getCurrentUserId();
        const ownerUserId = getBudgetOwnerId(input.scope, userId);
        const month = getExpenseMonthStart(new Date(input.month));
        const category = get().categories.find(
            (item) => item.id === input.categoryId,
        );
        if (!category) throw new Error("Please select a category");
        if (!Number.isFinite(input.amount) || input.amount <= 0) {
            throw new Error("Please enter a valid budget amount");
        }

        const existing = get().budgets.find((budget) =>
            isBudgetMatch(budget, {
                scope: input.scope,
                ownerUserId,
                categoryId: input.categoryId,
                month,
            }),
        );
        const now = new Date().toISOString();

        set({ currentUserId: userId, isSavingBudget: true, error: null });

        try {
            const budget: ExpenseBudget = existing
                ? {
                      ...existing,
                      category_name: category.name,
                      category_color: category.color,
                      amount: roundMoney(input.amount),
                      currency: DEFAULT_EXPENSE_CURRENCY,
                      updated_at: now,
                  }
                : {
                      id: createLocalId(),
                      space_id: spaceId,
                      created_by: userId,
                      scope: getBudgetScope(input.scope),
                      owner_user_id: ownerUserId,
                      category_id: category.id,
                      category_name: category.name,
                      category_color: category.color,
                      month,
                      amount: roundMoney(input.amount),
                      currency: DEFAULT_EXPENSE_CURRENCY,
                      created_at: now,
                      updated_at: now,
                      deleted_at: null,
                  };

            await upsertCachedExpenseBudget(budget);
            set((state) => ({
                budgets: sortBudgets(
                    existing
                        ? state.budgets.map((item) =>
                              item.id === budget.id ? budget : item,
                          )
                        : [budget, ...state.budgets],
                ),
            }));

            if (!getIsOnline()) {
                await enqueueBudgetOperation(
                    existing ? "update" : "insert",
                    budget.id,
                    budget,
                );
                return budget;
            }

            if (existing) {
                const patch = {
                    category_name: budget.category_name,
                    category_color: budget.category_color,
                    amount: budget.amount,
                    currency: budget.currency,
                };
                const { error } = await supabase
                    .from("expense_budgets")
                    .update(patch)
                    .eq("id", budget.id);
                if (error) throw error;
                return budget;
            }

            const { data, error } = await supabase
                .from("expense_budgets")
                .insert(budget)
                .select("*")
                .single();
            if (error) throw error;

            const saved = data ? normalizeBudget(data) : budget;
            await upsertCachedExpenseBudget(saved);
            set((state) => ({
                budgets: sortBudgets(
                    state.budgets.map((item) =>
                        item.id === budget.id ? saved : item,
                    ),
                ),
            }));
            return saved;
        } finally {
            set({ isSavingBudget: false });
        }
    },

    deleteBudget: async (budgetId) => {
        const deletedAt = new Date().toISOString();
        await markCachedExpenseBudgetDeleted(budgetId, deletedAt);
        set((state) => ({
            budgets: state.budgets.filter((item) => item.id !== budgetId),
        }));

        if (!getIsOnline()) {
            await enqueueBudgetOperation("delete", budgetId, {
                id: budgetId,
                deleted_at: deletedAt,
            });
            return;
        }

        const { error } = await supabase
            .from("expense_budgets")
            .update({ deleted_at: deletedAt })
            .eq("id", budgetId);
        if (error) throw error;
    },

    ensureBudgetsForMonth: async (scope, anchorDate) => {
        const spaceId = await getSpaceId();
        if (!spaceId) return;

        const userId = await getCurrentUserId();
        const ownerUserId = getBudgetOwnerId(scope, userId);
        const month = getExpenseMonthStart(anchorDate);
        const previousMonth = getExpenseMonthStart(
            shiftExpenseMonth(anchorDate, -1),
        );

        const currentBudgets = get().budgets.filter((budget) =>
            isBudgetInScopeAndMonth(budget, scope, ownerUserId, month),
        );
        if (currentBudgets.length > 0) return;

        const activeCategoryIds = new Set(get().categories.map((item) => item.id));
        const previousBudgets = get().budgets.filter(
            (budget) =>
                isBudgetInScopeAndMonth(
                    budget,
                    scope,
                    ownerUserId,
                    previousMonth,
                ) && activeCategoryIds.has(budget.category_id),
        );
        if (previousBudgets.length === 0) return;

        const now = new Date().toISOString();
        const copies = previousBudgets.map((budget) => ({
            ...budget,
            id: createLocalId(),
            created_by: userId,
            month,
            created_at: now,
            updated_at: now,
            deleted_at: null,
        }));

        for (const budget of copies) {
            await upsertCachedExpenseBudget(budget);
        }
        set((state) => ({
            budgets: sortBudgets([...copies, ...state.budgets]),
        }));

        if (!getIsOnline()) {
            for (const budget of copies) {
                await enqueueBudgetOperation("insert", budget.id, budget);
            }
            return;
        }

        const { data, error } = await supabase
            .from("expense_budgets")
            .insert(copies)
            .select("*");
        if (error) throw error;

        const savedBudgets = data
            ? (data as any[]).map(normalizeBudget)
            : copies;
        for (const budget of savedBudgets) {
            await upsertCachedExpenseBudget(budget);
        }
        set((state) => ({
            budgets: sortBudgets(
                state.budgets.map((item) => {
                    const saved = savedBudgets.find(
                        (budget) => budget.id === item.id,
                    );
                    return saved ?? item;
                }),
            ),
        }));
    },
}));
