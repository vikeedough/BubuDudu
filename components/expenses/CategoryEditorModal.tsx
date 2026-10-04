import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import ModalActionButtons from "@/components/common/ModalActionButtons";
import CustomText from "@/components/CustomText";
import CategoryIconPicker from "@/components/expenses/CategoryIconPicker";
import { Colors } from "@/constants/colors";
import { getExpenseCategoryIcon, type ExpenseCategoryIcon } from "@/utils/expense-category-icons";
import { EXPENSE_CATEGORY_COLORS } from "@/utils/expenses";

import type { ExpenseCategory } from "@/api/endpoints/types";

type CategoryEditorModalProps = {
    mode: "create" | "edit";
    category?: ExpenseCategory;
    isSaving: boolean;
    onClose: () => void;
    onSave: (input: { name: string; color: string; icon: string }) => Promise<void>;
    onDelete?: () => Promise<void>;
    onBusyChange: (busy: boolean) => void;
};

// Dedicated editor dialog inside CategoryManagerModal's single native Modal host.
export default function CategoryEditorModal({
    mode, category, isSaving, onClose, onSave, onDelete, onBusyChange,
}: CategoryEditorModalProps) {
    const [name, setName] = useState(category?.name ?? "");
    const [color, setColor] = useState<string>(category?.color ?? EXPENSE_CATEGORY_COLORS[0]);
    const [icon, setIcon] = useState<ExpenseCategoryIcon | null>(
        category ? getExpenseCategoryIcon(category.icon, category.name) : null,
    );
    const mutationRef = useRef(false);
    const isEditing = mode === "edit";

    useEffect(() => {
        // Load refreshed data, but do not reset a draft during its own optimistic save.
        if (!category || mutationRef.current) return;
        setName(category.name);
        setColor(category.color);
        setIcon(getExpenseCategoryIcon(category.icon, category.name));
    }, [category]);

    const mutate = async (action: () => Promise<void>) => {
        if (mutationRef.current || isSaving) return;
        mutationRef.current = true;
        onBusyChange(true);
        try {
            await action();
            onClose();
        } catch (error) {
            const message = error && typeof error === "object" && "message" in error
                ? String(error.message) : "Please try again later.";
            Alert.alert("Category failed", message);
        } finally {
            mutationRef.current = false;
            onBusyChange(false);
        }
    };

    const save = () => {
        if (name.trim().length === 0) {
            Alert.alert("Name needed", "Please enter a category name.");
            return;
        }
        void mutate(() => onSave({ name: name.trim(), color, icon: getExpenseCategoryIcon(icon, name) }));
    };

    const confirmDelete = () => {
        if (!onDelete || isSaving) return;
        Alert.alert("Delete category?", "Existing expenses will keep their category label.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => { void mutate(onDelete); } },
        ]);
    };

    return (
        <KeyboardAvoidingView
            pointerEvents="box-none"
            style={styles.centered}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.modal}>
                <CustomText weight="extrabold" style={styles.title}>
                    {isEditing ? "Edit Category" : "Add Category"}
                </CustomText>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.form}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <CustomText weight="semibold" style={styles.label}>Name</CustomText>
                    <TextInput
                        accessibilityLabel="Category name"
                        placeholder="Category name"
                        placeholderTextColor={Colors.gray}
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        editable={!isSaving}
                        allowFontScaling={false}
                    />
                    <CustomText weight="semibold" style={styles.label}>Colour</CustomText>
                    <View style={styles.colorRow}>
                        {EXPENSE_CATEGORY_COLORS.map((item) => (
                            <TouchableOpacity
                                key={item}
                                accessibilityRole="button"
                                accessibilityLabel={`Category colour ${item}`}
                                accessibilityState={{ selected: color === item }}
                                disabled={isSaving}
                                style={styles.colorButton}
                                onPress={() => setColor(item)}
                            >
                                <View style={[
                                    styles.swatch,
                                    { backgroundColor: item },
                                    color === item && styles.selectedSwatch,
                                ]} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <CategoryIconPicker
                        value={icon}
                        categoryName={name}
                        color={color}
                        disabled={isSaving}
                        onChange={setIcon}
                    />
                </ScrollView>
                {isEditing && onDelete && (
                    <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} disabled={isSaving}>
                        <CustomText weight="semibold" style={styles.deleteText}>Delete Category</CustomText>
                    </TouchableOpacity>
                )}
                <ModalActionButtons
                    formLayout
                    onConfirm={save}
                    onCancel={onClose}
                    confirmLabel={isEditing ? "Save Changes" : "Add Category"}
                    cancelLabel="Cancel"
                    isConfirming={isSaving}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
    modal: { width: "100%", maxHeight: "86%", backgroundColor: Colors.white, borderRadius: 15, padding: 22 },
    title: { color: Colors.darkGreenText, fontSize: 22, marginBottom: 16 },
    scroll: { flexShrink: 1 },
    form: { gap: 12, paddingBottom: 12 },
    label: { color: Colors.darkGreenText, fontSize: 12 },
    input: { minHeight: 44, borderWidth: 1, borderColor: "#EBEAEC", borderRadius: 10, paddingHorizontal: 12, color: Colors.darkGreenText, fontFamily: "Raleway-Regular", fontSize: 14 },
    colorRow: { flexDirection: "row", flexWrap: "wrap" },
    colorButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    swatch: { width: 28, height: 28, borderRadius: 999, opacity: 0.65 },
    selectedSwatch: { opacity: 1, borderWidth: 2, borderColor: Colors.brownText },
    deleteButton: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
    deleteText: { color: Colors.red, fontSize: 12 },
});
