import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import {
    DEFAULT_EXPENSE_CURRENCY,
    formatCurrency,
} from "@/utils/expenses";

import type { Expense } from "@/api/endpoints/types";

type ExpenseRowProps = {
    expense: Expense;
    currentUserId: string | null;
    onPress: (expense: Expense) => void;
};

export default function ExpenseRow({
    expense,
    currentUserId,
    onPress,
}: ExpenseRowProps) {
    const isMine = !!currentUserId && expense.paid_by === currentUserId;
    const showConverted =
        expense.currency !== DEFAULT_EXPENSE_CURRENCY &&
        expense.conversion_status === "converted" &&
        typeof expense.base_amount === "number";
    const showPending =
        expense.currency !== DEFAULT_EXPENSE_CURRENCY &&
        expense.conversion_status !== "converted";

    return (
        <TouchableOpacity
            style={styles.row}
            onPress={() => onPress(expense)}
            activeOpacity={0.82}
        >
            <View
                style={[
                    styles.categoryMark,
                    { backgroundColor: expense.category_color },
                ]}
            >
                <CustomText weight="extrabold" style={styles.categoryInitial}>
                    {expense.category_name.slice(0, 1).toUpperCase()}
                </CustomText>
            </View>
            <View style={styles.rowBody}>
                <CustomText
                    weight="extrabold"
                    style={styles.title}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {expense.title}
                </CustomText>
                <CustomText
                    weight="medium"
                    style={styles.subtitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    Paid by {isMine ? "me" : "partner"} ·{" "}
                    {expense.category_name}
                </CustomText>
            </View>
            <View style={styles.amountBlock}>
                <CustomText weight="extrabold" style={styles.amountText}>
                    {formatCurrency(expense.amount, expense.currency)}
                </CustomText>
                {showConverted && (
                    <CustomText weight="semibold" style={styles.convertedText}>
                        {formatCurrency(
                            expense.base_amount,
                            DEFAULT_EXPENSE_CURRENCY,
                        )}
                    </CustomText>
                )}
                {showPending && (
                    <CustomText weight="semibold" style={styles.pendingText}>
                        Conversion pending
                    </CustomText>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        minHeight: 84,
        borderRadius: 15,
        backgroundColor: Colors.white,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
        marginBottom: 12,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 3,
    },
    categoryMark: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    categoryInitial: {
        color: Colors.white,
        fontSize: 20,
    },
    rowBody: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 18,
        color: Colors.black,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.gray,
    },
    amountBlock: {
        alignItems: "flex-end",
        maxWidth: 128,
    },
    amountText: {
        fontSize: 17,
        color: Colors.black,
        textAlign: "right",
    },
    convertedText: {
        marginTop: 5,
        fontSize: 11,
        color: Colors.darkGreenText,
        textAlign: "right",
    },
    pendingText: {
        marginTop: 5,
        fontSize: 11,
        color: Colors.orangeText,
        textAlign: "right",
    },
});
