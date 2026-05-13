import { useExpenseStore } from "@/stores/ExpenseStore";
import { resetAllStores } from "@/tests/helpers/resetStores";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { queueFrom, queueFromSingle, supabaseMock } from "@/tests/mocks/supabase";
import {
  buildExpenseAnalytics,
  buildExpenseBudgetAnalytics,
  getExpensePeriodLabel,
} from "@/utils/expenses";
import { setIsOnline } from "@/utils/offline/network";

import type { ExpenseBudget, ExpenseCategory } from "@/api/endpoints/types";

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

    expect(useExpenseStore.getState().categories).toEqual([CATEGORY_A]);
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
