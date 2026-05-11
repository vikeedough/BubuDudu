import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import {
    DEFAULT_EXPENSE_CURRENCY,
    parseExpenseAmount,
} from "@/utils/expenses";

import type { ExpenseBudget, ExpenseCategory } from "@/api/endpoints/types";

type BudgetModalSaveInput = {
    categoryId: string;
    amount: number;
};

type BudgetModalProps = {
    isOpen: boolean;
    budget?: ExpenseBudget | null;
    categories: ExpenseCategory[];
    isSaving: boolean;
    onClose: () => void;
    onSave: (input: BudgetModalSaveInput) => Promise<void>;
    onDelete?: () => Promise<void>;
};

export default function BudgetModal({
    isOpen,
    budget,
    categories,
    isSaving,
    onClose,
    onSave,
    onDelete,
}: BudgetModalProps) {
    const [categoryId, setCategoryId] = useState("");
    const [amount, setAmount] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setCategoryId(budget?.category_id ?? categories[0]?.id ?? "");
        setAmount(budget ? String(budget.amount) : "");
    }, [budget, categories, isOpen]);

    const handleSave = async () => {
        const parsedAmount = parseExpenseAmount(amount);
        if (!parsedAmount) {
            Alert.alert("Amount needed", "Please enter a valid budget amount.");
            return;
        }

        if (!categoryId) {
            Alert.alert("Category needed", "Please select a category.");
            return;
        }

        await onSave({ categoryId, amount: parsedAmount });
    };

    const handleDelete = () => {
        if (!onDelete) return;
        Alert.alert("Delete budget?", "This budget will be removed.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    void onDelete();
                },
            },
        ]);
    };

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <KeyboardAvoidingView
                    style={styles.centered}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={styles.modal}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <CustomText
                                weight="extrabold"
                                style={styles.modalTitle}
                            >
                                {budget ? "Budget details" : "Set budget"}
                            </CustomText>

                            <CustomText weight="semibold" style={styles.label}>
                                Category
                            </CustomText>
                            {categories.length === 0 ? (
                                <View style={styles.emptyCategory}>
                                    <CustomText
                                        weight="semibold"
                                        style={styles.emptyCategoryText}
                                    >
                                        No categories available
                                    </CustomText>
                                </View>
                            ) : (
                                <View style={styles.categoryList}>
                                    {categories.map((category) => {
                                        const selected =
                                            categoryId === category.id;
                                        return (
                                            <TouchableOpacity
                                                key={category.id}
                                                style={[
                                                    styles.categoryChip,
                                                    {
                                                        borderColor:
                                                            category.color,
                                                        backgroundColor:
                                                            selected
                                                                ? category.color
                                                                : Colors.white,
                                                    },
                                                    budget &&
                                                        !selected &&
                                                        styles.disabledCategory,
                                                ]}
                                                onPress={() =>
                                                    !budget &&
                                                    setCategoryId(category.id)
                                                }
                                                disabled={!!budget}
                                            >
                                                <CustomText
                                                    weight="semibold"
                                                    style={[
                                                        styles.categoryText,
                                                        selected &&
                                                            styles.selectedCategoryText,
                                                    ]}
                                                >
                                                    {category.name}
                                                </CustomText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            <CustomText weight="semibold" style={styles.label}>
                                Monthly budget
                            </CustomText>
                            <View style={styles.amountRow}>
                                <TextInput
                                    style={[styles.input, styles.amountInput]}
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholder="0.00"
                                    placeholderTextColor={Colors.gray}
                                    keyboardType="decimal-pad"
                                    allowFontScaling={false}
                                />
                                <View style={styles.currencyPill}>
                                    <CustomText
                                        weight="extrabold"
                                        style={styles.currencyText}
                                    >
                                        {DEFAULT_EXPENSE_CURRENCY}
                                    </CustomText>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                {budget && onDelete ? (
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={handleDelete}
                                        disabled={isSaving}
                                    >
                                        <CustomText
                                            weight="semibold"
                                            style={styles.deleteButtonText}
                                        >
                                            Delete
                                        </CustomText>
                                    </TouchableOpacity>
                                ) : null}
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={onClose}
                                    disabled={isSaving}
                                >
                                    <CustomText
                                        weight="semibold"
                                        style={styles.cancelText}
                                    >
                                        Cancel
                                    </CustomText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSave}
                                    disabled={isSaving || categories.length === 0}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" />
                                    ) : (
                                        <CustomText
                                            weight="semibold"
                                            style={styles.saveText}
                                        >
                                            Save
                                        </CustomText>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
    },
    modal: {
        width: "100%",
        maxHeight: "86%",
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 22,
    },
    modalTitle: {
        fontSize: 22,
        color: Colors.darkGreenText,
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        color: Colors.black,
        marginBottom: 7,
        marginTop: 12,
    },
    categoryList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    categoryChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        height: 34,
        justifyContent: "center",
    },
    disabledCategory: {
        opacity: 0.45,
    },
    categoryText: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    selectedCategoryText: {
        color: Colors.white,
    },
    emptyCategory: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        paddingHorizontal: 12,
        justifyContent: "center",
    },
    emptyCategoryText: {
        color: Colors.gray,
        fontSize: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        color: Colors.black,
        fontFamily: "Raleway-Regular",
        fontSize: 14,
        minHeight: 42,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    amountRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    amountInput: {
        flex: 1,
        fontFamily: "Raleway-ExtraBold",
        fontSize: 18,
    },
    currencyPill: {
        width: 88,
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    currencyText: {
        color: Colors.darkGreenText,
        fontSize: 13,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 10,
        marginTop: 18,
    },
    saveButton: {
        backgroundColor: "#FFCC7D",
        borderRadius: 10,
        minWidth: 88,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    cancelButton: {
        backgroundColor: "#AFAFAF",
        borderRadius: 10,
        minWidth: 88,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    deleteButton: {
        marginRight: "auto",
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    deleteButtonText: {
        color: Colors.red,
        fontSize: 13,
    },
    saveText: {
        color: Colors.brownText,
        fontSize: 14,
    },
    cancelText: {
        color: Colors.brownText,
        fontSize: 14,
    },
});
