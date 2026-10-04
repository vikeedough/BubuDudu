import { useExpenseStore } from "@/stores/ExpenseStore";
import { resetAllStores } from "@/tests/helpers/resetStores";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { queueFrom, queueFromSingle, supabaseMock } from "@/tests/mocks/supabase";
import {
  buildExpenseAnalytics,
  buildExpenseBudgetAnalytics,
  getExpensesForBreakdownCategory,
  getExpensePeriodLabel,
  getExpenseTitleSuggestions,
  sortExpensesNewestFirst,
} from "@/utils/expenses";
import * as localDb from "@/utils/offline/local-db";
import { setIsOnline } from "@/utils/offline/network";

import type { Expense, ExpenseBudget, ExpenseCategory } from "@/api/endpoints/types";

const CATEGORY_A: ExpenseCategory = {
  id: "cat-1",
  space_id: "space-1",
  created_by: "user-1",
  name: "Food",
  color: "#F04770",
  sort_order: 0,
  is_default: true,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  deleted_at: null,
};

const EXPENSE_A = {
  id: "exp-1",
  space_id: "space-1",
  created_by: "user-1",
  paid_by: "user-1",
  category_id: "cat-1",
  category_name: "Food",
  category_color: "#F04770",
  title: "Dinner",
  description: null,
  amount: 12.5,
  currency: "SGD",
  base_amount: 12.5,
  base_currency: "SGD",
  exchange_rate: 1,
  exchange_rate_date: "2026-05-11",
  conversion_status: "converted",
  paid_at: "2026-05-11T10:00:00.000Z",
  created_at: "2026-05-11T10:00:00.000Z",
  updated_at: "2026-05-11T10:00:00.000Z",
  deleted_at: null,
};

const BUDGET_A: ExpenseBudget = {
  id: "budget-1",
  space_id: "space-1",
  created_by: "user-1",
  scope: "space",
  owner_user_id: null,
  category_id: "cat-1",
  category_name: "Food",
  category_color: "#F04770",
  month: "2026-05-01",
  amount: 100,
  currency: "SGD",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  deleted_at: null,
};

function mockSession(userId = "user-1") {
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
    error: null,
  });
}

describe("stores/ExpenseStore", () => {
  beforeEach(() => {
    resetAllStores();
    mockSession();
  });

  it("fetches categories successfully", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("expense_categories", "select", {
      data: [CATEGORY_A],
      error: null,
    });

    await useExpenseStore.getState().fetchCategories();

    expect(useExpenseStore.getState().categories).toEqual([{ ...CATEGORY_A, icon: "silverware-fork-knife" }]);
    expect(useExpenseStore.getState().isLoadingCategories).toBe(false);
  });

  it("seeds default categories when none exist online", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("expense_categories", "select", { data: [], error: null });

    await useExpenseStore.getState().fetchCategories();

    expect(useExpenseStore.getState().categories.map((c) => c.name)).toEqual([
      "Food",
      "Health",
      "Medical",
      "Bills",
      "Transport",
    ]);
  });

  it("persists a selected category icon online and reads it back", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space-1");
    const saved = { ...CATEGORY_A, icon: "gift" };
    queueFromSingle("expense_categories", "insert", { data: saved, error: null });
    const created = await useExpenseStore.getState().addCategory("Food", CATEGORY_A.color, "gift");
    expect(created.icon).toBe("gift");
    const insert = supabaseMock.from.mock.results.find((result) => result.value.insert.mock.calls.length)?.value.insert;
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ icon: "gift", color: CATEGORY_A.color }));
    useExpenseStore.setState({ categories: [] });
    queueFrom("expense_categories", "select", { data: [saved], error: null });
    await useExpenseStore.getState().fetchCategories();
    expect(useExpenseStore.getState().categories[0]).toEqual(saved);
  });

  it("updates the icon without changing the category colour", async () => {
    useExpenseStore.setState({ categories: [CATEGORY_A] });
    queueFrom("expense_categories", "update", { data: null, error: null });
    await useExpenseStore.getState().updateCategory(CATEGORY_A.id, { name: "Food", color: CATEGORY_A.color, icon: "coffee" });
    const update = supabaseMock.from.mock.results.find((result) => result.value.update.mock.calls.length)?.value.update;
    expect(update).toHaveBeenCalledWith({ name: "Food", color: CATEGORY_A.color, icon: "coffee" });
    expect(useExpenseStore.getState().categories[0]).toMatchObject({ color: CATEGORY_A.color, icon: "coffee" });
  });

  it("retains icons in offline category insert/update payloads and the SQLite cache", async () => {
    setIsOnline(false);
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space-1");
    const enqueue = jest.spyOn(localDb, "enqueueOutbox");
    const db = await localDb.getOfflineDb();
    const created = await useExpenseStore.getState().addCategory("Custom", CATEGORY_A.color, "gift");
    await useExpenseStore.getState().updateCategory(created.id, { name: "Custom", color: CATEGORY_A.color, icon: "home" });
    const payloads = enqueue.mock.calls.map(([item]) => JSON.parse(item.payload_json));
    expect(payloads[0]).toMatchObject({ icon: "gift", color: CATEGORY_A.color });
    expect(payloads[1]).toMatchObject({ icon: "home", color: CATEGORY_A.color });
    const cached = useExpenseStore.getState().categories[0];
    jest.spyOn(db, "getAllAsync").mockResolvedValueOnce([{ ...cached, is_default: 0 }]);
    expect(await localDb.getCachedExpenseCategories("space-1")).toEqual([{ ...cached, is_default: false }]);
    expect(db.runAsync).toHaveBeenCalledWith(expect.stringContaining("name, color, icon"), created.id, "space-1", "user-1", "Custom", CATEGORY_A.color, "home", 0, 0, expect.any(String), expect.any(String), null);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it.each([null, undefined, "invalid-legacy-icon"])("safely reads legacy category icon %s", async (icon) => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("expense_categories", "select", { data: [{ ...CATEGORY_A, icon }], error: null });
    await useExpenseStore.getState().fetchCategories();
    expect(useExpenseStore.getState().categories[0].icon).toBe("silverware-fork-knife");
  });

  it("adds an SGD expense online", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    useExpenseStore.setState({ categories: [CATEGORY_A] });
    queueFromSingle("expenses", "insert", { data: EXPENSE_A, error: null });

    const created = await useExpenseStore.getState().addExpense({
      title: "Dinner",
      amount: 12.5,
      currency: "SGD",
      categoryId: "cat-1",
      paidBy: "user-1",
      description: null,
      paidAt: "2026-05-11T10:00:00.000Z",
    });

    expect(created).toEqual(EXPENSE_A);
    expect(useExpenseStore.getState().expenses[0]).toEqual(EXPENSE_A);
  });

  it("adds a foreign expense as pending when offline without cached rate", async () => {
    setIsOnline(false);
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    useExpenseStore.setState({ categories: [CATEGORY_A] });

    const created = await useExpenseStore.getState().addExpense({
      title: "Hotel",
      amount: 250.8,
      currency: "GBP",
      categoryId: "cat-1",
      paidBy: "user-1",
      description: "Trip",
      paidAt: "2026-05-11T10:00:00.000Z",
    });

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(created).toMatchObject({
      title: "Hotel",
      currency: "GBP",
      base_amount: null,
      conversion_status: "pending",
      created_by: "user-1",
      paid_by: "user-1",
    });
    expect(useExpenseStore.getState().expenses[0]).toEqual(created);
  });

  it("soft deletes an expense from state", async () => {
    queueFrom("expenses", "update", { data: null, error: null });
    useExpenseStore.setState({ expenses: [EXPENSE_A as any] });

    await useExpenseStore.getState().deleteExpense("exp-1");

    expect(useExpenseStore.getState().expenses).toEqual([]);
  });

  it("soft deletes a referenced category while preserving historical expense snapshots", async () => {
    useExpenseStore.setState({ categories: [CATEGORY_A], expenses: [EXPENSE_A as Expense] });
    queueFrom("expense_categories", "update", { data: null, error: null });
    await useExpenseStore.getState().deleteCategory(CATEGORY_A.id);
    expect(useExpenseStore.getState().categories).toEqual([]);
    expect(useExpenseStore.getState().expenses).toEqual([EXPENSE_A]);
    const builder = supabaseMock.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(builder.delete).not.toHaveBeenCalled();
  });

  it("filters analytics by current user when scope is me", () => {
    const userPaidExpense = {
      ...EXPENSE_A,
      created_by: "partner-1",
      paid_by: "user-1",
    };
    const partnerExpense = {
      ...EXPENSE_A,
      id: "exp-2",
      created_by: "user-1",
      paid_by: "partner-1",
      amount: 20,
      base_amount: 20,
    };

    const analytics = buildExpenseAnalytics({
      expenses: [userPaidExpense as any, partnerExpense as any],
      categories: [CATEGORY_A],
      period: "monthly",
      scope: "me",
      currentUserId: "user-1",
      anchorDate: new Date("2026-05-11T12:00:00.000Z"),
    });

    expect(analytics.total).toBe(12.5);
    expect(analytics.transactionCount).toBe(1);
  });

  it("labels the current daily period as Today", () => {
    expect(getExpensePeriodLabel("daily", new Date())).toBe("Today");
    expect(
      getExpensePeriodLabel("daily", new Date("2026-05-11T12:00:00.000Z")),
    ).toBe("11 May 2026");
  });

  it("suggests previous titles created by the current user", () => {
    const suggestions = getExpenseTitleSuggestions({
      expenses: [
        {
          ...EXPENSE_A,
          id: "exp-mcd-new",
          title: "McDonalds",
          created_at: "2026-05-12T10:00:00.000Z",
        },
        {
          ...EXPENSE_A,
          id: "exp-mcd-old",
          title: "McDonalds",
          created_at: "2026-05-10T10:00:00.000Z",
        },
        {
          ...EXPENSE_A,
          id: "exp-burger",
          title: "Burger McD",
          created_at: "2026-05-13T10:00:00.000Z",
        },
        {
          ...EXPENSE_A,
          id: "exp-mcd-cafe",
          title: "McD Cafe",
          created_at: "2026-05-11T10:00:00.000Z",
        },
        {
          ...EXPENSE_A,
          id: "exp-mcd-delivery",
          title: "McD Delivery",
          created_at: "2026-05-09T10:00:00.000Z",
        },
        {
          ...EXPENSE_A,
          id: "exp-partner",
          created_by: "partner-1",
          title: "McCafe",
          created_at: "2026-05-14T10:00:00.000Z",
        },
      ] as any,
      query: "McD",
      currentUserId: "user-1",
    });

    expect(suggestions).toEqual(["McDonalds", "McD Cafe", "McD Delivery"]);
  });

  it("sorts expenses newest first by paid date then keyed-in time", () => {
    const localIso = (day: number, hour: number, minute = 0) =>
      new Date(2026, 4, day, hour, minute).toISOString();
    const earlierKeyedExpense = {
      ...EXPENSE_A,
      id: "exp-earlier-keyed",
      paid_at: localIso(11, 8),
      created_at: localIso(11, 20),
    } as Expense;
    const laterKeyedExpense = {
      ...EXPENSE_A,
      id: "exp-later-keyed",
      paid_at: localIso(11, 20),
      created_at: localIso(11, 20, 5),
    } as Expense;
    const newerDateExpense = {
      ...EXPENSE_A,
      id: "exp-newer-date",
      paid_at: localIso(12, 8),
      created_at: localIso(11, 8),
    } as Expense;

    expect(
      sortExpensesNewestFirst([
        earlierKeyedExpense,
        newerDateExpense,
        laterKeyedExpense,
      ]).map((expense) => expense.id),
    ).toEqual(["exp-newer-date", "exp-later-keyed", "exp-earlier-keyed"]);
  });

  it("returns category expenses for the selected breakdown period newest first", () => {
    const foodMorning = {
      ...EXPENSE_A,
      id: "exp-food-morning",
      paid_at: "2026-05-11T08:00:00.000Z",
      created_at: "2026-05-11T08:00:00.000Z",
    } as Expense;
    const foodEvening = {
      ...EXPENSE_A,
      id: "exp-food-evening",
      paid_at: "2026-05-11T14:00:00.000Z",
      created_at: "2026-05-11T14:00:00.000Z",
    } as Expense;
    const partnerFood = {
      ...EXPENSE_A,
      id: "exp-partner-food",
      paid_by: "partner-1",
      paid_at: "2026-05-11T15:00:00.000Z",
    } as Expense;
    const transport = {
      ...EXPENSE_A,
      id: "exp-transport",
      category_id: "cat-2",
      category_name: "Transport",
      paid_at: "2026-05-11T15:00:00.000Z",
    } as Expense;

    const categoryExpenses = getExpensesForBreakdownCategory({
      expenses: [foodMorning, partnerFood, transport, foodEvening],
      categories: [CATEGORY_A],
      categoryKey: "cat-1",
      period: "daily",
      scope: "me",
      currentUserId: "user-1",
      anchorDate: new Date("2026-05-11T12:00:00.000Z"),
    });

    expect(categoryExpenses.map((expense) => expense.id)).toEqual([
      "exp-food-evening",
      "exp-food-morning",
    ]);
  });

  it("sets a shared category budget online", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    useExpenseStore.setState({ categories: [CATEGORY_A] });
    queueFromSingle("expense_budgets", "insert", {
      data: BUDGET_A,
      error: null,
    });

    const created = await useExpenseStore.getState().setBudget({
      scope: "space",
      categoryId: "cat-1",
      amount: 100,
      month: "2026-05-01",
    });

    expect(created).toEqual(BUDGET_A);
    expect(useExpenseStore.getState().budgets[0]).toEqual(BUDGET_A);
  });

  it("builds personal budget analytics from expenses paid by current user", () => {
    const personalBudget: ExpenseBudget = {
      ...BUDGET_A,
      id: "budget-me",
      scope: "user",
      owner_user_id: "user-1",
    };
    const partnerExpense = {
      ...EXPENSE_A,
      id: "exp-2",
      paid_by: "partner-1",
      amount: 40,
      base_amount: 40,
    };

    const analytics = buildExpenseBudgetAnalytics({
      expenses: [EXPENSE_A as any, partnerExpense as any],
      budgets: [personalBudget],
      categories: [CATEGORY_A],
      scope: "me",
      currentUserId: "user-1",
      anchorDate: new Date("2026-05-11T12:00:00.000Z"),
    });

    expect(analytics.totalBudget).toBe(100);
    expect(analytics.totalSpent).toBe(12.5);
    expect(analytics.rows[0].percentage).toBe(12.5);
  });

  it("copies previous month budgets when a month has none", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    useExpenseStore.setState({
      categories: [CATEGORY_A],
      budgets: [{ ...BUDGET_A, month: "2026-04-01" }],
    });
    queueFrom("expense_budgets", "insert", { data: null, error: null });

    await useExpenseStore
      .getState()
      .ensureBudgetsForMonth("space", new Date("2026-05-11T12:00:00.000Z"));

    const copied = useExpenseStore
      .getState()
      .budgets.find((budget) => budget.month === "2026-05-01");

    expect(copied).toMatchObject({
      scope: "space",
      owner_user_id: null,
      category_id: "cat-1",
      amount: 100,
      currency: "SGD",
    });
  });
});
