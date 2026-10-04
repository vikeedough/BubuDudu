import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert, Modal, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import Expenses from "@/app/(tabs)/(expenses)/expenses";
import BudgetModal from "@/components/expenses/BudgetModal";
import CategoryManagerModal from "@/components/expenses/CategoryManagerModal";
import ExpenseBreakdownView from "@/components/expenses/ExpenseBreakdownView";
import ExpenseModal from "@/components/expenses/ExpenseModal";
import ExpenseRow from "@/components/expenses/ExpenseRow";
import { useExpenseStore } from "@/stores/ExpenseStore";
import { buildExpenseAnalytics, getExpenseMonthStart } from "@/utils/expenses";

import type { Expense, ExpenseBudget, ExpenseCategory } from "@/api/endpoints/types";

jest.mock("react-native-gesture-handler", () => ({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ScrollView: require("react-native").ScrollView,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Native: () => ({ simultaneousWithExternalGesture: jest.fn() }) },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("react-native-gifted-charts", () => ({ PieChart: "PieChart" }));
jest.mock("@/assets/svgs/plus.svg", () => "SvgMock");
jest.mock("@/hooks/useAuthContext", () => ({ useAuthContext: () => ({ session: { user: { id: "member" } } }) }));
jest.mock("@/api/endpoints/profiles", () => ({ fetchProfiles: jest.fn().mockResolvedValue([]) }));

const category: ExpenseCategory = {
    id: "food", name: "Food", color: "#F04770", icon: "silverware-fork-knife",
    space_id: "space", created_by: "member", sort_order: 0, is_default: true, created_at: "",
};
const expense: Expense = {
    id: "expense", space_id: "space", created_by: "member", paid_by: "member", category_id: "food",
    category_name: "Food", category_color: category.color, title: "Dinner", description: null,
    amount: 12.5, currency: "SGD", base_amount: 12.5, base_currency: "SGD", exchange_rate: 1,
    exchange_rate_date: null, conversion_status: "converted", paid_at: new Date().toISOString(), created_at: new Date().toISOString(),
};

function openExpense(existing?: Expense) {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const view = render(<ExpenseModal isOpen mode={existing ? "edit" : "create"} expense={existing}
        expenses={[]} categories={[category]} currentUserId="member" currentUserProfile={null} partnerProfile={null}
        isLoadingCategories={false} isSaving={false} onClose={jest.fn()} onSave={onSave} />);
    return { view, onSave };
}

function renderedText(node: unknown): string {
    if (typeof node === "string") return `"${node}"`;
    if (Array.isArray(node)) return node.map(renderedText).join("|");
    if (node && typeof node === "object" && "children" in node) return renderedText(node.children);
    return "";
}

it("puts Amount before Title and applies only calculator results to an editable expense", async () => {
    const { view, onSave } = openExpense(expense);
    const output = renderedText(view.toJSON());
    expect(output.indexOf('"Amount"')).toBeLessThan(output.indexOf('"Title"'));
    expect(view.getByPlaceholderText("0.00").props.value).toBe("12.5");
    fireEvent.press(view.getByLabelText("Open calculator"));
    for (const key of ["+", "4", ".", "9", "0", "="]) fireEvent.press(view.getByLabelText(`Calculator ${key}`));
    expect(view.getByPlaceholderText("0.00").props.value).toBe("17.40");
    fireEvent.press(view.getByText("Save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ amount: 17.4, title: "Dinner", currency: "SGD", paidBy: "member" })));
    expect(Object.values(onSave.mock.calls[0][0])).not.toContain("12.5+4.90");
    fireEvent.press(view.getByLabelText("Close calculator"));
    expect(view.queryByLabelText("Calculator expression")).toBeNull();
    fireEvent.changeText(view.getByPlaceholderText("0.00"), "22.50");
    fireEvent.press(view.getByText("Save"));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 22.5 })));
});

it("clear/backspace and invalid division leave the saved amount intact", () => {
    const { view } = openExpense(expense);
    fireEvent.press(view.getByLabelText("Open calculator"));
    fireEvent.press(view.getByLabelText("Calculator clear"));
    fireEvent.press(view.getByLabelText("Calculator backspace"));
    expect(view.getByLabelText("Calculator expression").props.children).toBe("0");
    for (const key of ["2", "0", "÷", "0", "="]) fireEvent.press(view.getByLabelText(`Calculator ${key}`));
    expect(view.getByText("Cannot divide by zero.")).toBeTruthy();
    expect(view.getByPlaceholderText("0.00").props.value).toBe("12.5");
});

it("creates a category with a selected icon and its independent colour", async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    const view = render(<CategoryManagerModal isOpen categories={[]} isSaving={false} onClose={jest.fn()}
        onAddCategory={onAdd} onUpdateCategory={jest.fn()} onDeleteCategory={jest.fn()} />);
    fireEvent.press(view.getByLabelText("Add Category"));
    fireEvent.changeText(view.getByPlaceholderText("Category name"), "Travel");
    expect(view.getByLabelText("Icon airplane").props.accessibilityState.selected).toBe(true);
    fireEvent.press(view.getByLabelText("Icon gift"));
    expect(view.getByLabelText("Icon gift").props.accessibilityState.selected).toBe(true);
    fireEvent.press(view.getAllByText("Add Category").at(-1)!);
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("Travel", "#F04770", "gift"));
});

it("loads and edits an existing category icon without changing colour", async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const view = render(<CategoryManagerModal isOpen categories={[category]} isSaving={false} onClose={jest.fn()}
        onAddCategory={jest.fn()} onUpdateCategory={onUpdate} onDeleteCategory={jest.fn()} />);
    fireEvent.press(view.getByLabelText("Edit category Food"));
    expect(view.getByLabelText("Icon silverware-fork-knife").props.accessibilityState.selected).toBe(true);
    fireEvent.press(view.getByLabelText("Icon gift"));
    fireEvent.press(view.getByText("Save Changes"));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("food", { name: "Food", color: category.color, icon: "gift" }));
});

it("renders category icons on coloured expense cards with safe legacy fallbacks", () => {
    const props = { expense, category: { ...category, icon: "gift" }, currentUserId: "member", partnerProfile: null, onPress: jest.fn() };
    const view = render(<ExpenseRow {...props} />);
    const icon = view.UNSAFE_getByType(MaterialCommunityIcons);
    expect(icon.props.name).toBe("gift");
    expect(StyleSheet.flatten(icon.parent?.props.style).backgroundColor).toBe(category.color);
    view.rerender(<ExpenseRow {...props} category={{ ...category, icon: "invalid-icon" }} />);
    expect(view.UNSAFE_getByType(MaterialCommunityIcons).props.name).toBe("silverware-fork-knife");
    view.rerender(<ExpenseRow {...props} category={undefined} />);
    expect(view.UNSAFE_getByType(MaterialCommunityIcons).props.name).toBe("silverware-fork-knife");
});

it("keeps the Breakdown pie chart driven by category colours", () => {
    const analytics = buildExpenseAnalytics({ expenses: [expense], categories: [category], scope: "space", currentUserId: "member", period: "daily", anchorDate: new Date() });
    const view = render(<ExpenseBreakdownView analytics={analytics} onCategoryPress={jest.fn()} />);
    expect(view.UNSAFE_getByType(PieChart).props.data[0].color).toBe(category.color);
});

it("orders screen controls and opens Budget above the original floating menu entries", async () => {
    const refreshAll = jest.fn().mockResolvedValue(undefined);
    const ensureBudgetsForMonth = jest.fn().mockResolvedValue(undefined);
    const setBudget = jest.fn().mockResolvedValue(undefined);
    const deleteBudget = jest.fn().mockResolvedValue(undefined);
    const original = useExpenseStore.getState();
    useExpenseStore.setState({ expenses: [], categories: [category], budgets: [], currentUserId: "member", refreshAll, ensureBudgetsForMonth, setBudget, deleteBudget });
    const view = render(<Expenses />);
    await waitFor(() => expect(refreshAll).toHaveBeenCalled());
    let output = renderedText(view.toJSON());
    expect(output.indexOf('"Today"')).toBeLessThan(output.indexOf('"Day"'));
    expect(output.indexOf('"Day"')).toBeLessThan(output.indexOf('"Log"'));
    expect(view.queryByText("Budget")).toBeNull();
    fireEvent.press(view.getByText("Breakdown"));
    output = renderedText(view.toJSON());
    expect(output.indexOf('"Month"')).toBeLessThan(output.indexOf('"Log"'));
    expect(view.getByText("Year")).toBeTruthy();
    jest.useFakeTimers();
    fireEvent.press(view.getByLabelText("Expense actions"));
    act(() => jest.advanceTimersByTime(200));
    const menu = renderedText(view.toJSON());
    expect(menu.indexOf('"Budget"')).toBeLessThan(menu.indexOf('"Categories"'));
    fireEvent.press(view.getByLabelText("Open budget"));
    expect(view.UNSAFE_getByType(BudgetModal).props.isOpen).toBe(true);
    expect(view.UNSAFE_getByType(BudgetModal).props.isEditing).toBe(false);
    expect(view.getByText("Monthly budget")).toBeTruthy();
    expect(ensureBudgetsForMonth).toHaveBeenCalledWith("space", expect.any(Date));
    fireEvent.press(view.getByLabelText("Add budget"));
    expect(view.getByText("Set budget")).toBeTruthy();
    expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
    fireEvent.changeText(view.getByPlaceholderText("0.00"), "100");
    fireEvent.press(view.getByText("Save"));
    await act(async () => {});
    expect(setBudget).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, categoryId: "food", scope: "space" }));
    expect(view.getByText("Monthly budget")).toBeTruthy();
    const budget: ExpenseBudget = {
        id: "budget", space_id: "space", created_by: "member", scope: "space", owner_user_id: null,
        category_id: "food", category_name: "Food", category_color: category.color,
        month: getExpenseMonthStart(new Date()), amount: 100, currency: "SGD", created_at: new Date().toISOString(),
    };
    act(() => useExpenseStore.setState({ budgets: [budget] }));
    fireEvent.press(view.getByText("Food"));
    expect(view.getByText("Budget details")).toBeTruthy();
    expect(view.getByPlaceholderText("0.00").props.value).toBe("100");
    fireEvent.press(view.getByText("Cancel"));
    expect(view.getByText("Monthly budget")).toBeTruthy();
    fireEvent.press(view.getByText("Food"));
    const alert = jest.spyOn(Alert, "alert");
    fireEvent.press(view.getByText("Delete"));
    await act(async () => { alert.mock.calls[0][2]?.find((button) => button.text === "Delete")?.onPress?.(); });
    expect(deleteBudget).toHaveBeenCalledWith("budget");
    expect(view.UNSAFE_getByType(BudgetModal).props.isEditing).toBe(false);
    fireEvent.press(view.getAllByText("Me").at(-1)!);
    expect(ensureBudgetsForMonth).toHaveBeenCalledWith("me", expect.any(Date));
    fireEvent.press(view.getByText("Done"));
    expect(view.UNSAFE_getByType(BudgetModal).props.isOpen).toBe(false);
    fireEvent.press(view.getByLabelText("Expense actions"));
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(view.getByLabelText("Manage categories"));
    expect(view.UNSAFE_getByType(CategoryManagerModal).props.isOpen).toBe(true);
    fireEvent.press(view.getByText("Done"));
    fireEvent.press(view.getByLabelText("Expense actions"));
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(view.getByLabelText("Add expense"));
    expect(view.UNSAFE_getByType(ExpenseModal).props.isOpen).toBe(true);
    view.unmount();
    useExpenseStore.setState(original);
});
