import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import {
    DEFAULT_EXPENSE_CURRENCY,
    formatCurrency,
    getExpensePeriodLabel,
    type ExpenseAnalytics,
    type ExpensePeriod,
} from "@/utils/expenses";

type ExpenseBreakdownViewProps = {
    analytics: ExpenseAnalytics;
    period: ExpensePeriod;
    anchorDate: Date;
    onPeriodChange: (period: ExpensePeriod) => void;
    onPreviousPeriod: () => void;
    onNextPeriod: () => void;
    onCategoryPress: (category: ExpenseAnalytics["breakdown"][number]) => void;
};

const PERIODS: { value: ExpensePeriod; label: string }[] = [
    { value: "daily", label: "Day" },
    { value: "weekly", label: "Week" },
    { value: "monthly", label: "Month" },
    { value: "yearly", label: "Year" },
];

function formatPercentChange(value: number | null) {
    if (value === null) return "New";
    if (value === 0) return "0%";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
}

export default function ExpenseBreakdownView({
    analytics,
    period,
    anchorDate,
    onPeriodChange,
    onPreviousPeriod,
    onNextPeriod,
    onCategoryPress,
}: ExpenseBreakdownViewProps) {
    const chartData = analytics.breakdown.map((item) => ({
        value: item.total,
        color: item.color,
        text: `${Math.round(item.percentage)}%`,
    }));

    return (
        <View style={styles.container}>
            <View style={styles.periodTabs}>
                {PERIODS.map((item) => {
                    const selected = period === item.value;
                    return (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.periodButton,
                                selected && styles.selectedPeriodButton,
                            ]}
                            onPress={() => onPeriodChange(item.value)}
                        >
                            <CustomText
                                weight="semibold"
                                style={[
                                    styles.periodText,
                                    selected && styles.selectedPeriodText,
                                ]}
                            >
                                {item.label}
                            </CustomText>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.periodNavigator}>
                <TouchableOpacity
                    style={styles.periodArrowButton}
                    onPress={onPreviousPeriod}
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
                    {getExpensePeriodLabel(period, anchorDate)}
                </CustomText>
                <TouchableOpacity
                    style={styles.periodArrowButton}
                    onPress={onNextPeriod}
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
                        Total spend
                    </CustomText>
                    <CustomText weight="extrabold" style={styles.totalText}>
                        {formatCurrency(
                            analytics.total,
                            DEFAULT_EXPENSE_CURRENCY,
                        )}
                    </CustomText>
                </View>
                <View style={styles.changePill}>
                    <CustomText weight="extrabold" style={styles.changeText}>
                        {formatPercentChange(analytics.percentChange)}
                    </CustomText>
                    <CustomText weight="medium" style={styles.changeLabel}>
                        vs previous
                    </CustomText>
                </View>
            </View>

            <View style={styles.chartPanel}>
                {chartData.length > 0 ? (
                    <PieChart
                        data={chartData}
                        donut
                        radius={88}
                        innerRadius={54}
                        showText
                        textColor={Colors.white}
                        textSize={11}
                        centerLabelComponent={() => (
                            <View style={styles.centerLabel}>
                                <CustomText
                                    weight="extrabold"
                                    style={styles.centerAmount}
                                >
                                    {analytics.transactionCount}
                                </CustomText>
                                <CustomText
                                    weight="medium"
                                    style={styles.centerCaption}
                                >
                                    expenses
                                </CustomText>
                            </View>
                        )}
                    />
                ) : (
                    <View style={styles.emptyChart}>
                        <CustomText weight="semibold" style={styles.emptyText}>
                            No expenses yet
                        </CustomText>
                    </View>
                )}
            </View>

            <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Daily avg
                    </CustomText>
                    <CustomText weight="extrabold" style={styles.metricValue}>
                        {formatCurrency(
                            analytics.averageDailySpend,
                            DEFAULT_EXPENSE_CURRENCY,
                        )}
                    </CustomText>
                </View>
                <View style={styles.metricBox}>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Top category
                    </CustomText>
                    <CustomText
                        weight="extrabold"
                        style={styles.metricValue}
                        numberOfLines={1}
                    >
                        {analytics.topCategory?.label ?? "--"}
                    </CustomText>
                </View>
                <View style={styles.metricBox}>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Largest
                    </CustomText>
                    <CustomText
                        weight="extrabold"
                        style={styles.metricValue}
                        numberOfLines={1}
                    >
                        {analytics.largestExpense
                            ? formatCurrency(
                                  analytics.largestExpense.base_amount ??
                                      analytics.largestExpense.amount,
                                  DEFAULT_EXPENSE_CURRENCY,
                              )
                            : "--"}
                    </CustomText>
                </View>
                <View style={styles.metricBox}>
                    <CustomText weight="medium" style={styles.metricLabel}>
                        Conversion pending
                    </CustomText>
                    <CustomText weight="extrabold" style={styles.metricValue}>
                        {analytics.pendingConversionCount}
                    </CustomText>
                </View>
            </View>

            <View style={styles.legend}>
                {analytics.breakdown.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={styles.legendRow}
                        onPress={() => onCategoryPress(item)}
                        activeOpacity={0.8}
                    >
                        <View
                            style={[
                                styles.legendDot,
                                { backgroundColor: item.color },
                            ]}
                        />
                        <CustomText weight="semibold" style={styles.legendName}>
                            {item.label}
                        </CustomText>
                        <CustomText weight="medium" style={styles.legendMeta}>
                            {item.percentage.toFixed(0)}%
                        </CustomText>
                        <CustomText weight="extrabold" style={styles.legendSum}>
                            {formatCurrency(
                                item.total,
                                DEFAULT_EXPENSE_CURRENCY,
                            )}
                        </CustomText>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
        paddingBottom: 95,
    },
    periodTabs: {
        flexDirection: "row",
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 4,
        gap: 4,
    },
    periodButton: {
        flex: 1,
        height: 34,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    selectedPeriodButton: {
        backgroundColor: Colors.yellow,
    },
    periodText: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    selectedPeriodText: {
        color: Colors.brownText,
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
    metricLabel: {
        color: Colors.gray,
        fontSize: 11,
        marginBottom: 6,
    },
    totalText: {
        color: Colors.black,
        fontSize: 24,
    },
    changePill: {
        backgroundColor: "#FFCC7D40",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
        alignItems: "flex-end",
    },
    changeText: {
        color: Colors.brownText,
        fontSize: 16,
    },
    changeLabel: {
        color: Colors.brownText,
        fontSize: 10,
    },
    chartPanel: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
    },
    centerLabel: {
        alignItems: "center",
    },
    centerAmount: {
        color: Colors.darkGreenText,
        fontSize: 22,
    },
    centerCaption: {
        color: Colors.gray,
        fontSize: 10,
    },
    emptyChart: {
        width: 176,
        height: 176,
        borderRadius: 88,
        backgroundColor: "#F4F5EF",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        color: Colors.gray,
        fontSize: 14,
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    metricBox: {
        width: "48%",
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 13,
        minHeight: 74,
    },
    metricValue: {
        color: Colors.darkGreenText,
        fontSize: 14,
    },
    legend: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    legendRow: {
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#EBEAEC",
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    legendName: {
        flex: 1,
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    legendMeta: {
        color: Colors.gray,
        fontSize: 11,
        width: 38,
        textAlign: "right",
    },
    legendSum: {
        color: Colors.black,
        fontSize: 12,
        width: 92,
        textAlign: "right",
    },
});
