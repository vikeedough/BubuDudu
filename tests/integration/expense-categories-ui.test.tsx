import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, TextInput } from "react-native";

import CategoryEditorModal from "@/components/expenses/CategoryEditorModal";
import CategoryIconPicker from "@/components/expenses/CategoryIconPicker";
import CategoryManagerModal from "@/components/expenses/CategoryManagerModal";
import { getExpenseCategoryIcon } from "@/utils/expense-category-icons";

import type { ExpenseCategory } from "@/api/endpoints/types";

const food: ExpenseCategory = {
    id: "food", name: "Food", color: "#F04770", icon: "silverware-fork-knife",
    space_id: "space", created_by: "member", sort_order: 8, is_default: true, created_at: "",
};
const initial = [
    { ...food, id: "zoo", name: "zoo", icon: "paw", sort_order: 0 },
    food,
    { ...food, id: "alpha", name: "alpha", icon: null, sort_order: 10 },
];

function managerProps(categories = initial) {
    return {
        isOpen: true, categories, isSaving: false, onClose: jest.fn(),
        onAddCategory: jest.fn().mockResolvedValue(undefined),
        onUpdateCategory: jest.fn().mockResolvedValue(undefined),
        onDeleteCategory: jest.fn().mockResolvedValue(undefined),
    };
}

function rows(view: ReturnType<typeof render>) {
    return view.getAllByLabelText(/^Edit category /).map((row) => row.props.accessibilityLabel);
}

function openCreate(view: ReturnType<typeof render>) {
    fireEvent.press(view.getByLabelText("Add Category"));
}

function saveCreate(view: ReturnType<typeof render>) {
    fireEvent.press(view.getAllByText("Add Category").at(-1)!);
}

it("opens a clean alphabetical list with icon/colour rows and a fixed bottom Add Category button", () => {
    const original = initial.map((category) => ({ ...category }));
    const view = render(<CategoryManagerModal {...managerProps()} />);
    expect(rows(view)).toEqual(["Edit category alpha", "Edit category Food", "Edit category zoo"]);
    expect(initial).toEqual(original);
    expect(view.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
    expect(view.queryByText("Delete Category")).toBeNull();
    expect(view.UNSAFE_queryByType(CategoryIconPicker)).toBeNull();
    const scroll = view.UNSAFE_getByType(ScrollView);
    expect(scroll.findAll((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Add Category")).toHaveLength(0);
    const row = view.getByLabelText("Edit category Food");
    const icon = row.findAllByType(MaterialCommunityIcons)[0];
    expect(icon.props.name).toBe("silverware-fork-knife");
    expect(StyleSheet.flatten(icon.parent?.props.style).backgroundColor).toBe(food.color);
    expect(StyleSheet.flatten(row.props.style).minHeight).toBeGreaterThanOrEqual(44);
});

it("reuses the editor for create, immediately inserts alphabetically, and preserves category sort_order", async () => {
    const props = managerProps();
    function Controlled() {
        const [categories, setCategories] = useState(initial);
        return <CategoryManagerModal {...props} categories={categories} onAddCategory={async (name, color, icon) => {
            await props.onAddCategory(name, color, icon);
            setCategories((items) => [...items, { ...food, id: "new", name, color, icon, sort_order: 3 }]);
        }} />;
    }
    const view = render(<Controlled />);
    openCreate(view);
    expect(view.UNSAFE_getByType(CategoryEditorModal).props.mode).toBe("create");
    expect(view.queryByText("Delete Category")).toBeNull();
    expect(view.getByLabelText("Icon tag-outline").props.accessibilityState.selected).toBe(true);
    fireEvent.changeText(view.getByLabelText("Category name"), "  Dining  ");
    expect(view.getByLabelText("Icon silverware-fork-knife").props.accessibilityState.selected).toBe(true);
    fireEvent.press(view.getByLabelText("Category colour #FFD167"));
    fireEvent.press(view.getByLabelText("Icon coffee"));
    saveCreate(view);
    await waitFor(() => expect(rows(view)).toEqual(["Edit category alpha", "Edit category Dining", "Edit category Food", "Edit category zoo"]));
    expect(props.onAddCategory).toHaveBeenCalledWith("Dining", "#FFD167", "coffee");
    expect(view.UNSAFE_queryByType(CategoryEditorModal)).toBeNull();
    expect(view.UNSAFE_getByType(CategoryManagerModal).props.categories.map((item: ExpenseCategory) => item.sort_order)).toEqual([0, 8, 10, 3]);
    expect(props.onClose).not.toHaveBeenCalled();
});

it("loads current data, saves all fields, and immediately reorders a renamed category", async () => {
    const props = managerProps();
    function Controlled() {
        const [categories, setCategories] = useState(initial);
        return <CategoryManagerModal {...props} categories={categories} onUpdateCategory={async (id, patch) => {
            await props.onUpdateCategory(id, patch);
            setCategories((items) => items.map((category) => category.id === id ? { ...category, ...patch } : category));
        }} />;
    }
    const view = render(<Controlled />);
    fireEvent.press(view.getByLabelText("Edit category Food"));
    expect(view.getByText("Edit Category")).toBeTruthy();
    expect(view.getByLabelText("Category name").props.value).toBe("Food");
    expect(view.getByLabelText(`Category colour ${food.color}`).props.accessibilityState.selected).toBe(true);
    expect(view.getByLabelText("Icon silverware-fork-knife").props.accessibilityState.selected).toBe(true);
    fireEvent.changeText(view.getByLabelText("Category name"), "Zulu");
    fireEvent.press(view.getByLabelText("Icon bus"));
    fireEvent.press(view.getByLabelText("Category colour #06D7A0"));
    fireEvent.press(view.getByText("Save Changes"));
    await waitFor(() => expect(rows(view)).toEqual(["Edit category alpha", "Edit category zoo", "Edit category Zulu"]));
    expect(props.onUpdateCategory).toHaveBeenCalledWith("food", { name: "Zulu", color: "#06D7A0", icon: "bus" });
    expect(props.onClose).not.toHaveBeenCalled();
});

it("confirms deletion inside edit mode and returns to the list without changing historical data", async () => {
    const props = managerProps();
    const alert = jest.spyOn(Alert, "alert");
    function Controlled() {
        const [categories, setCategories] = useState(initial);
        return <CategoryManagerModal {...props} categories={categories} onDeleteCategory={async (id) => {
            await props.onDeleteCategory(id);
            setCategories((items) => items.filter((category) => category.id !== id));
        }} />;
    }
    const view = render(<Controlled />);
    fireEvent.press(view.getByLabelText("Edit category Food"));
    fireEvent.press(view.getByText("Delete Category"));
    expect(props.onDeleteCategory).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("Delete category?", "Existing expenses will keep their category label.", expect.any(Array));
    const buttons = alert.mock.calls[0][2]!;
    expect(buttons.find((button) => button.text === "Cancel")?.style).toBe("cancel");
    expect(buttons.find((button) => button.text === "Delete")?.style).toBe("destructive");
    await act(async () => buttons.find((button) => button.text === "Delete")?.onPress?.());
    expect(props.onDeleteCategory).toHaveBeenCalledWith("food");
    expect(rows(view)).toEqual(["Edit category alpha", "Edit category zoo"]);
    expect(view.queryByText("Edit Category")).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();
});

it.each(["back", "backdrop", "cancel"])("%s closes the editor first and retains a single native modal", (method) => {
    const props = managerProps();
    const view = render(<CategoryManagerModal {...props} />);
    fireEvent.press(view.getByLabelText("Edit category Food"));
    expect(view.UNSAFE_getAllByType(Modal)).toHaveLength(1);
    if (method === "back") fireEvent(view.UNSAFE_getByType(Modal), "requestClose");
    else if (method === "backdrop") fireEvent.press(view.getByLabelText("Dismiss category dialog"));
    else fireEvent.press(view.getByText("Cancel"));
    expect(view.queryByText("Edit Category")).toBeNull();
    expect(rows(view)).toHaveLength(3);
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent(view.UNSAFE_getByType(Modal), "requestClose");
    expect(props.onClose).toHaveBeenCalledTimes(1);
});

it("loads live category changes and safely returns to the list if that category is removed", () => {
    const props = managerProps();
    const view = render(<CategoryManagerModal {...props} />);
    fireEvent.press(view.getByLabelText("Edit category Food"));
    view.rerender(<CategoryManagerModal {...props} categories={[{ ...food, name: "Dining", icon: "coffee", color: "#073A4B" }]} />);
    expect(view.getByLabelText("Category name").props.value).toBe("Dining");
    expect(view.getByLabelText("Icon coffee").props.accessibilityState.selected).toBe(true);
    expect(view.getByLabelText("Category colour #073A4B").props.accessibilityState.selected).toBe(true);
    view.rerender(<CategoryManagerModal {...props} categories={[]} />);
    expect(view.queryByText("Edit Category")).toBeNull();
    expect(view.getByText("No categories yet.")).toBeTruthy();
});

it("resets the editor on Categories close/reopen", () => {
    const props = managerProps();
    const view = render(<CategoryManagerModal {...props} />);
    openCreate(view);
    fireEvent.changeText(view.getByLabelText("Category name"), "Discarded");
    view.rerender(<CategoryManagerModal {...props} isOpen={false} />);
    view.rerender(<CategoryManagerModal {...props} />);
    expect(view.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
    expect(rows(view)).toHaveLength(3);
    fireEvent.press(view.getByText("Done"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
});

it("validates blank names and retains a failed draft with a useful error", async () => {
    const props = managerProps();
    const alert = jest.spyOn(Alert, "alert");
    props.onAddCategory.mockRejectedValue(new Error("Offline write failed"));
    const view = render(<CategoryManagerModal {...props} />);
    openCreate(view);
    saveCreate(view);
    expect(props.onAddCategory).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("Name needed", "Please enter a category name.");
    fireEvent.changeText(view.getByLabelText("Category name"), "Trip");
    saveCreate(view);
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Category failed", "Offline write failed"));
    expect(view.getByLabelText("Category name").props.value).toBe("Trip");
    expect(props.onClose).not.toHaveBeenCalled();
});

it("blocks duplicate writes and dismissal during a pending save", async () => {
    const props = managerProps();
    let finish: () => void = () => {};
    props.onAddCategory.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = render(<CategoryManagerModal {...props} />);
    openCreate(view);
    fireEvent.changeText(view.getByLabelText("Category name"), "Trip");
    saveCreate(view);
    fireEvent(view.UNSAFE_getByType(Modal), "requestClose");
    expect(view.getByLabelText("Category name").props.editable).toBe(false);
    expect(props.onAddCategory).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(rows(view)).toHaveLength(3);
});

it("uses one editor scroll surface for its form and searchable icon grid", () => {
    const view = render(<CategoryManagerModal {...managerProps()} />);
    openCreate(view);
    const editor = view.UNSAFE_getByType(CategoryEditorModal);
    expect(editor.findAllByType(ScrollView)).toHaveLength(1);
    expect(editor.findByType(ScrollView).props.keyboardShouldPersistTaps).toBe("handled");
    expect(editor.findByType(KeyboardAvoidingView).props.behavior).toBeDefined();
    expect(view.getAllByLabelText(/^Icon /)).toHaveLength(112);
});

it("searches the picker, retains selection across filtering, and previews colour independently", () => {
    function Picker() {
        const [icon, setIcon] = useState("gift");
        return <CategoryIconPicker value={icon} color="#FFD167" onChange={setIcon} />;
    }
    const view = render(<Picker />);
    fireEvent.changeText(view.getByLabelText("Search category icons"), "plane");
    expect(view.getByLabelText("Icon airplane")).toBeTruthy();
    expect(view.queryByLabelText("Icon gift")).toBeNull();
    expect(view.getByLabelText("Selected category icon gift")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Icon airplane"));
    expect(view.getByLabelText("Icon airplane").props.accessibilityState.selected).toBe(true);
    fireEvent.changeText(view.getByLabelText("Search category icons"), "no-match-xyz");
    expect(view.getByText("No matching icons")).toBeTruthy();
    fireEvent.changeText(view.getByLabelText("Search category icons"), "");
    expect(view.getAllByLabelText(/^Icon /)).toHaveLength(112);
    expect(view.getByLabelText("Icon airplane").props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(view.getByLabelText("Selected category icon airplane").props.style).backgroundColor).toBe("#FFD167");
});

it("updates preview colour without changing the selected icon", () => {
    const view = render(<CategoryManagerModal {...managerProps()} />);
    fireEvent.press(view.getByLabelText("Edit category Food"));
    fireEvent.press(view.getByLabelText("Category colour #073A4B"));
    expect(StyleSheet.flatten(view.getByLabelText("Selected category icon silverware-fork-knife").props.style).backgroundColor).toBe("#073A4B");
    expect(view.getByLabelText("Icon silverware-fork-knife").props.accessibilityState.selected).toBe(true);
});

it.each([null, undefined, "invalid-icon"])("safely selects a fallback for legacy icon %s", (icon) => {
    const view = render(<CategoryIconPicker value={icon} categoryName="Food" color={food.color} onChange={jest.fn()} />);
    expect(view.getByLabelText(`Icon ${getExpenseCategoryIcon(icon, "Food")}`).props.accessibilityState.selected).toBe(true);
});
