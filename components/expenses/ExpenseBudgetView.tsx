import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import {
    DEFAULT_EXPENSE_CURRENCY,
    formatCurrency,
    getExpenseMonthLabel,
    type ExpenseBudgetAnalytics,
    type ExpenseBudgetRow,
} from "@/utils/expenses";

type ExpenseBudgetViewProps = {
    analytics: ExpenseBudgetAnalytics;
    anchorDate: Date;
    isLoading: boolean;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onAddBudget: () => void;
    onEditBudget: (row: ExpenseBudgetRow) => void;
};

function clampProgress(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
}

export default function ExpenseBudgetView({
    analytics,
    anchorDate,
    isLoading,
    onPreviousMonth,
    onNextMonth,
    onAddBudget,
    onEditBudget,
}: ExpenseBudgetViewProps) {
    return (
        <View style={styles.container}>
            <View style={styles.periodNavigator}>
                <TouchableOpacity
                    style={styles.periodArrowButton}
                    onPress={onPreviousMonth}
                >
                    <CustomText
                        weight="extrabold"
                        style={styles.periodArrowText}
                    >
                        {"<"}
                    </CustomText>
                </TouchableOpacity>
                <CustomText
                    weight="semibold"
                    style={styles.periodLabel}
                    numberOfLines={1}
                >
                    {getExpenseMonthLabel(anchorDate)}
                </CustomText>
                <TouchableOpacity
                    style={styles.periodArrowButton}
                    onPress={onNextMonth}
                >
                    <CustomText
                        weight="extrabold"
                        style={styles.periodArrowText}
                    >
                        {">"}
                    </CustomText>
                </TouchableOpacity>
            </View>

            <View style={styles.summaryBand}>
                <View>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Monthly budget
                    </CustomText>
                    <CustomText weight="extrabold" style={styles.totalText}>
                        {formatCurrency(
                            analytics.totalBudget,
                            DEFAULT_EXPENSE_CURRENCY,
                        )}
                    </CustomText>
                </View>
                <View style={styles.summaryMeta}>
                    <CustomText weight="extrabold" style={styles.percentText}>
                        {analytics.percentage.toFixed(0)}%
                    </CustomText>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        used
                    </CustomText>
                </View>
            </View>

            <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Spent
                    </CustomText>
                    <CustomText weight="extrabold" style={styles.metricValue}>
                        {formatCurrency(
                            analytics.totalSpent,
                            DEFAULT_EXPENSE_CURRENCY,
                        )}
                    </CustomText>
                </View>
                <View style={styles.metricBox}>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Remaining
                    </CustomText>
                    <CustomText
                        weight="extrabold"
                        style={[
                            styles.metricValue,
                            analytics.totalRemaining < 0 && styles.overText,
                        ]}
                    >
                        {formatCurrency(
                            analytics.totalRemaining,
                            DEFAULT_EXPENSE_CURRENCY,
                        )}
                    </CustomText>
                </View>
            </View>

            {analytics.rows.length === 0 ? (
                <View style={styles.emptyState}>
                    <CustomText weight="extrabold" style={styles.emptyTitle}>
                        {isLoading ? "Loading budgets" : "No budgets set"}
                    </CustomText>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={onAddBudget}
                    >
                        <CustomText
                            weight="semibold"
                            style={styles.emptyButtonText}
                        >
                            Set budget
                        </CustomText>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.budgetList}>
                    {analytics.rows.map((row) => {
                        const progress = clampProgress(row.percentage);
                        return (
                            <TouchableOpacity
                                key={row.budget.id}
                                style={styles.budgetRow}
                                onPress={() => onEditBudget(row)}
                            >
                                <View style={styles.rowHeader}>
                                    <View style={styles.categoryTitle}>
                                        <View
                                            style={[
                                                styles.categoryDot,
                                                {
                                                    backgroundColor:
                                                        row.categoryColor,
                                                },
                                            ]}
                                        />
                                        <CustomText
                                            weight="extrabold"
                                            style={styles.categoryName}
                                            numberOfLines={1}
                                        >
                                            {row.categoryName}
                                        </CustomText>
                                    </View>
                                    <CustomText
                                        weight="extrabold"
                                        style={[
                                            styles.rowPercent,
                                            row.isOverBudget && styles.overText,
                                        ]}
                                    >
                                        {row.percentage.toFixed(0)}%
                                    </CustomText>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${progress}%`,
                                                backgroundColor:
                                                    row.isOverBudget
                                                        ? Colors.red
                                                        : row.categoryColor,
                                            },
                                        ]}
                                    />
                                </View>
                                <View style={styles.rowFooter}>
                                    <CustomText
                                        weight="medium"
                                        style={styles.rowMeta}
                                        numberOfLines={1}
                                    >
                                        {formatCurrency(
                                            row.spent,
                                            DEFAULT_EXPENSE_CURRENCY,
                                        )}{" "}
                                        of{" "}
                                        {formatCurrency(
                                            row.budget.amount,
                                            DEFAULT_EXPENSE_CURRENCY,
                                        )}
                                    </CustomText>
                                    <CustomText
                                        weight="semibold"
                                        style={[
                                            styles.rowMeta,
                                            row.isOverBudget && styles.overText,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {row.isOverBudget
                                            ? `${formatCurrency(
                                                  Math.abs(row.remaining),
                                                  DEFAULT_EXPENSE_CURRENCY,
                                              )} over`
                                            : `${formatCurrency(
                                                  row.remaining,
                                                  DEFAULT_EXPENSE_CURRENCY,
                                              )} left`}
                                    </CustomText>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
        paddingBottom: 95,
    },
    periodNavigator: {
        height: 40,
        borderRadius: 15,
        backgroundColor: Colors.white,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        gap: 8,
    },
    periodArrowButton: {
        width: 34,
        height: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFCC7D40",
    },
    periodArrowText: {
        color: Colors.brownText,
        fontSize: 16,
    },
    periodLabel: {
        flex: 1,
        color: Colors.darkGreenText,
        fontSize: 13,
        textAlign: "center",
    },
    summaryBand: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryMeta: {
        alignItems: "flex-end",
    },
    metricLabel: {
        color: Colors.gray,
        fontSize: 11,
        marginBottom: 6,
    },
    totalText: {
        color: Colors.black,
        fontSize: 24,
    },
    percentText: {
        color: Colors.brownText,
        fontSize: 22,
    },
    metricsGrid: {
        flexDirection: "row",
        gap: 10,
    },
    metricBox: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 13,
        minHeight: 74,
    },
    metricValue: {
        color: Colors.darkGreenText,
        fontSize: 14,
    },
    budgetList: {
        gap: 10,
    },
    budgetRow: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 14,
        gap: 10,
    },
    rowHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    categoryTitle: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 999,
    },
    categoryName: {
        flex: 1,
        color: Colors.darkGreenText,
        fontSize: 14,
    },
    rowPercent: {
        color: Colors.darkGreenText,
        fontSize: 14,
    },
    progressTrack: {
        height: 10,
        borderRadius: 999,
        backgroundColor: "#F1F1F1",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
    },
    rowFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    rowMeta: {
        flex: 1,
        color: Colors.gray,
        fontSize: 11,
    },
    overText: {
        color: Colors.red,
    },
    emptyState: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 20,
        alignItems: "center",
        gap: 12,
    },
    emptyTitle: {
        color: Colors.darkGreenText,
        fontSize: 16,
    },
    emptyButton: {
        backgroundColor: "#FFCC7D",
        borderRadius: 10,
        minWidth: 112,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    emptyButtonText: {
        color: Colors.brownText,
        fontSize: 13,
    },
});
