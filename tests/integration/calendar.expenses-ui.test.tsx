import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";

import FloatingAddButton from "@/components/common/FloatingAddButton";
import PickerWheel from "@/components/common/PickerWheel";
import WheelTimePicker from "@/components/common/WheelTimePicker";
import ExpenseDatePicker from "@/components/expenses/ExpenseDatePicker";
import ExpenseFloatingActionMenu from "@/components/expenses/ExpenseFloatingActionMenu";
import ExpenseModal from "@/components/expenses/ExpenseModal";

import type { ExpenseCategory } from "@/api/endpoints/types";

jest.mock("react-native-gesture-handler", () => ({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ScrollView: require("react-native").ScrollView,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Native: () => ({ simultaneousWithExternalGesture: jest.fn() }) },
}));
jest.mock("@/assets/svgs/plus.svg", () => "SvgMock");
function settle(view: ReturnType<typeof render>, wheelIndex: number, itemIndex: number) {
    const wheel = view.UNSAFE_getAllByType(PickerWheel)[wheelIndex];
    fireEvent(wheel.findByType(ScrollView), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: itemIndex * 30 } } });
}
it("Expenses retains its default wheel dimensions, Today label, leap-day clamping, year range and interaction callbacks", () => {
    jest.useFakeTimers(); jest.setSystemTime(new Date(2024, 0, 31, 12));
    const onChange = jest.fn(), start = jest.fn(), end = jest.fn();
    const view = render(<ExpenseDatePicker value={new Date(2024, 0, 31)} minYear={2024} maxYear={2025} onChange={onChange} onInteractionStart={start} onInteractionEnd={end} />);
    expect(view.getByText("Today")).toBeTruthy();
    const wheels = view.UNSAFE_getAllByType(PickerWheel);
    expect(wheels.map((wheel) => wheel.props.width)).toEqual([86, 92, 90]);
    fireEvent(wheels[0].findByType(ScrollView), "scrollBeginDrag");
    settle(view, 0, 1); // February clamps Jan 31 to leap day
    expect(start).toHaveBeenCalledTimes(1); expect(end).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 1, 29));
    settle(view, 2, 1); // 2025 clamps Feb 29 to Feb 28
    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 1, 28));
});
it("Expenses add modal still saves the picked local date and existing form fields", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined), onClose = jest.fn();
    const category: ExpenseCategory = { id: "food", name: "Food", color: "#FFCC7D", space_id: "space", created_by: "member", sort_order: 0, is_default: true, created_at: "" };
    const view = render(<ExpenseModal isOpen mode="create" expenses={[]} categories={[category]}
        currentUserId="member" currentUserProfile={null} partnerProfile={null} isLoadingCategories={false}
        isSaving={false} initialPaidAt={new Date(2026, 9, 3)} onSave={onSave} onClose={onClose} />);
    fireEvent.changeText(view.getByPlaceholderText("What was it for?"), "Dinner");
    const amountInput = view.UNSAFE_getAllByType(TextInput).find((input) => input.props.keyboardType === "decimal-pad");
    expect(amountInput).toBeDefined();
    fireEvent.changeText(amountInput!, "12.50");
    settle(view, 1, 3);
    fireEvent.press(view.getByText("Save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Dinner", amount: 12.5, currency: "SGD", categoryId: "food", paidBy: "member", description: null, paidAt: new Date(2026, 9, 4).toISOString() })));
    fireEvent.press(view.getByText("Cancel")); expect(onClose).toHaveBeenCalledTimes(1);
});
it("Expenses floating + still expands its action menu, executes the selected action and collapses", () => {
    jest.useFakeTimers();
    const addExpense = jest.fn(), categories = jest.fn();
    const view = render(<ExpenseFloatingActionMenu actions={[
        { key: "expense", label: "Add expense", shortLabel: "E", accessibilityLabel: "Add expense", onPress: addExpense },
        { key: "categories", label: "Categories", shortLabel: "C", accessibilityLabel: "Manage categories", onPress: categories },
    ]} />);
    expect(view.UNSAFE_getByType(FloatingAddButton).props.floating).toBe(false);
    const buttonStyle = StyleSheet.flatten(view.getByLabelText("Expense actions").props.style);
    expect(buttonStyle).toEqual(expect.objectContaining({ width: 54, height: 54, shadowOpacity: 0.22, shadowRadius: 5, elevation: 6 }));
    expect(view.queryByLabelText("Add expense")).toBeNull();
    fireEvent.press(view.getByLabelText("Expense actions"));
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(view.getByLabelText("Add expense"));
    expect(addExpense).toHaveBeenCalledTimes(1); expect(categories).not.toHaveBeenCalled();
    expect(view.queryByLabelText("Add expense")).toBeNull();
    fireEvent.press(view.getByLabelText("Expense actions"));
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(view.getByLabelText("Manage categories"));
    expect(categories).toHaveBeenCalledTimes(1);
});
it("the single floating + retains Expenses budget positioning and direct press behaviour", () => {
    const onPress = jest.fn();
    const view = render(<FloatingAddButton accessibilityLabel="Add budget" onPress={onPress} />);
    expect(StyleSheet.flatten(view.getByLabelText("Add budget").props.style)).toEqual(expect.objectContaining({ right: 22, bottom: 120, width: 54, height: 54 }));
    fireEvent.press(view.getByLabelText("Add budget")); expect(onPress).toHaveBeenCalledTimes(1);
});
it("24-hour time wheels support zero and upper bounds through scroll and accessibility actions", () => {
    function Controlled() {
        const [value, setValue] = useState("00:00");
        return <WheelTimePicker value={value} onChange={setValue} />;
    }
    const view = render(<Controlled />);
    expect(view.getByLabelText("Hour").props.accessibilityValue.text).toBe("00");
    expect(view.getByLabelText("Minute").props.accessibilityValue.text).toBe("00");
    fireEvent(view.getByLabelText("Hour"), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(view.getByLabelText("Hour").props.accessibilityValue.now).toBe(0);
    fireEvent(view.getByLabelText("Hour"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 23 * 30 } } });
    fireEvent(view.getByLabelText("Minute"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 59 * 30 } } });
    expect(view.getByLabelText("Hour").props.accessibilityValue.text).toBe("23");
    expect(view.getByLabelText("Minute").props.accessibilityValue.text).toBe("59");
    fireEvent(view.getByLabelText("Minute"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(view.getByLabelText("Minute").props.accessibilityValue.now).toBe(59);
});
