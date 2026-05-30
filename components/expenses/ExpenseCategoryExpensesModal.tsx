import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import ExpenseRow from "@/components/expenses/ExpenseRow";
import { Colors } from "@/constants/colors";
import {
    DEFAULT_EXPENSE_CURRENCY,
    formatCurrency,
    type ExpenseBreakdownItem,
} from "@/utils/expenses";

import type { Expense, Profile } from "@/api/endpoints/types";

type ExpenseCategoryExpensesModalProps = {
    isOpen: boolean;
    category: ExpenseBreakdownItem | null;
    expenses: Expense[];
    periodLabel: string;
    currentUserId: string | null;
    partnerProfile: Profile | null;
    onClose: () => void;
    onExpensePress: (expense: Expense) => void;
};

export default function ExpenseCategoryExpensesModal({
    isOpen,
    category,
    expenses,
    periodLabel,
    currentUserId,
    partnerProfile,
    onClose,
    onExpensePress,
}: ExpenseCategoryExpensesModalProps) {
    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.centered}>
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <View style={styles.titleRow}>
                                <View
                                    style={[
                                        styles.categoryDot,
                                        {
                                            backgroundColor:
                                                category?.color ?? Colors.gray,
                                        },
                                    ]}
                                />
                                <CustomText
                                    weight="extrabold"
                                    style={styles.title}
                                    numberOfLines={1}
                                >
                                    {category?.label ?? "Category"}
                                </CustomText>
                            </View>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                            >
                                <CustomText
                                    weight="extrabold"
                                    style={styles.closeText}
                                >
                                    x
                                </CustomText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.summaryRow}>
                            <View>
                                <CustomText
                                    weight="medium"
                                    style={styles.summaryLabel}
                                >
                                    {periodLabel}
                                </CustomText>
                                <CustomText
                                    weight="extrabold"
                                    style={styles.summaryValue}
                                >
                                    {formatCurrency(
                                        category?.total ?? 0,
                                        DEFAULT_EXPENSE_CURRENCY,
                                    )}
                                </CustomText>
                            </View>
                            <View style={styles.countPill}>
                                <CustomText
                                    weight="extrabold"
                                    style={styles.countText}
                                >
                                    {expenses.length}
                                </CustomText>
                                <CustomText
                                    weight="medium"
                                    style={styles.countLabel}
                                >
                                    expenses
                                </CustomText>
                            </View>
                        </View>

                        <ScrollView
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {expenses.map((expense) => (
                                <ExpenseRow
                                    key={expense.id}
                                    expense={expense}
                                    currentUserId={currentUserId}
                                    partnerProfile={partnerProfile}
                                    onPress={onExpensePress}
                                />
                            ))}
                        </ScrollView>
                    </View>
                </View>
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
        maxHeight: "82%",
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 18,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
    },
    titleRow: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    categoryDot: {
        width: 14,
        height: 14,
        borderRadius: 999,
    },
    title: {
        flex: 1,
        color: Colors.darkGreenText,
        fontSize: 20,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: 999,
        backgroundColor: "#FFCC7D40",
        alignItems: "center",
        justifyContent: "center",
    },
    closeText: {
        color: Colors.brownText,
        fontSize: 16,
        lineHeight: 18,
    },
    summaryRow: {
        minHeight: 68,
        borderRadius: 12,
        backgroundColor: "#F4F5EF",
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
    },
    summaryLabel: {
        color: Colors.gray,
        fontSize: 11,
        marginBottom: 6,
    },
    summaryValue: {
        color: Colors.black,
        fontSize: 18,
    },
    countPill: {
        borderRadius: 12,
        backgroundColor: Colors.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: "flex-end",
    },
    countText: {
        color: Colors.brownText,
        fontSize: 16,
    },
    countLabel: {
        color: Colors.brownText,
        fontSize: 10,
    },
    list: {
        maxHeight: 420,
    },
    listContent: {
        paddingBottom: 2,
    },
});
