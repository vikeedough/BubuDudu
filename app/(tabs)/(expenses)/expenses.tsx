import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchProfiles } from "@/api/endpoints/profiles";
import Plus from "@/assets/svgs/plus.svg";
import CustomText from "@/components/CustomText";
import BudgetModal from "@/components/expenses/BudgetModal";
import CategoryManagerModal from "@/components/expenses/CategoryManagerModal";
import ExpenseBreakdownView from "@/components/expenses/ExpenseBreakdownView";
import ExpenseBudgetView from "@/components/expenses/ExpenseBudgetView";
import ExpenseCategoryExpensesModal from "@/components/expenses/ExpenseCategoryExpensesModal";
import ExpenseFloatingActionMenu from "@/components/expenses/ExpenseFloatingActionMenu";
import ExpenseModal from "@/components/expenses/ExpenseModal";
import ExpenseRow from "@/components/expenses/ExpenseRow";
import { Colors } from "@/constants/colors";
import { useAuthContext } from "@/hooks/useAuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useExpenseStore } from "@/stores/ExpenseStore";
import {
    getReadableAccentTextColor,
    getReadableTextColor,
    normalizeHexColor,
} from "@/utils/colors";
import {
    buildExpenseAnalytics,
    buildExpenseBudgetAnalytics,
    getExpenseMonthStart,
    getExpensePeriodLabel,
    getExpensesForBreakdownCategory,
    isExpenseInPeriod,
    shiftExpenseMonth,
    shiftExpensePeriod,
    type ExpenseBreakdownItem,
    type ExpenseBudgetRow,
    type ExpenseLogPeriod,
    type ExpensePeriod,
    type ExpenseScope,
} from "@/utils/expenses";
import { getToday } from "@/utils/home";
import { getSpaceId } from "@/utils/secure-store";

import type { Expense, ExpenseBudget, Profile } from "@/api/endpoints/types";

type ViewMode = "log" | "breakdown" | "budget";

type SegmentOption<T extends string> = {
    value: T;
    label: string;
};

function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
    getOptionColor,
    selectedColor = Colors.green,
    selectedTextColor = Colors.white,
}: {
    value: T;
    options: SegmentOption<T>[];
    onChange: (value: T) => void;
    getOptionColor?: (value: T) => string | undefined;
    selectedColor?: string;
    selectedTextColor?: string;
}) {
    return (
        <View style={styles.segmentedControl}>
            {options.map((option) => {
                const selected = value === option.value;
                const optionColor = getOptionColor?.(option.value);
                const optionTextColor = optionColor
                    ? getReadableAccentTextColor(optionColor)
                    : undefined;
                const selectedOptionTextColor = optionColor
                    ? getReadableTextColor(optionColor)
                    : selectedTextColor;
                return (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.segmentButton,
                            selected && {
                                backgroundColor: optionColor ?? selectedColor,
                            },
                        ]}
                        onPress={() => onChange(option.value)}
                    >
                        <CustomText
                            weight="semibold"
                            style={[
                                styles.segmentText,
                                !selected &&
                                    optionTextColor && {
                                        color: optionTextColor,
                                    },
                                selected && {
                                    color: selectedOptionTextColor,
                                },
                            ]}
                        >
                            {option.label}
                        </CustomText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function getProfileColor(profile: Profile | null, fallback: string) {
    return normalizeHexColor(profile?.avatar_border_color) ?? fallback;
}

function PeriodNavigator({
    period,
    anchorDate,
    onPrevious,
    onNext,
}: {
    period: ExpensePeriod;
    anchorDate: Date;
    onPrevious: () => void;
    onNext: () => void;
}) {
    return (
        <View style={styles.periodNavigator}>
            <TouchableOpacity
                style={styles.periodArrowButton}
                onPress={onPrevious}
            >
                <CustomText weight="extrabold" style={styles.periodArrowText}>
                    {"<"}
                </CustomText>
            </TouchableOpacity>
            <CustomText
                weight="semibold"
                style={styles.periodNavigatorLabel}
                numberOfLines={1}
            >
                {getExpensePeriodLabel(period, anchorDate)}
            </CustomText>
            <TouchableOpacity style={styles.periodArrowButton} onPress={onNext}>
                <CustomText weight="extrabold" style={styles.periodArrowText}>
                    {">"}
                </CustomText>
            </TouchableOpacity>
        </View>
    );
}

const Expenses = () => {
    const date = getToday();
    const { session } = useAuthContext();

    const expenses = useExpenseStore((s) => s.expenses);
    const categories = useExpenseStore((s) => s.categories);
    const budgets = useExpenseStore((s) => s.budgets);
    const currentUserIdFromStore = useExpenseStore((s) => s.currentUserId);
    const isLoadingExpenses = useExpenseStore((s) => s.isLoadingExpenses);
    const isLoadingCategories = useExpenseStore((s) => s.isLoadingCategories);
    const isLoadingBudgets = useExpenseStore((s) => s.isLoadingBudgets);
    const isSavingExpense = useExpenseStore((s) => s.isSavingExpense);
    const isSavingCategory = useExpenseStore((s) => s.isSavingCategory);
    const isSavingBudget = useExpenseStore((s) => s.isSavingBudget);
    const refreshAll = useExpenseStore((s) => s.refreshAll);
    const addExpense = useExpenseStore((s) => s.addExpense);
    const updateExpense = useExpenseStore((s) => s.updateExpense);
    const deleteExpense = useExpenseStore((s) => s.deleteExpense);
    const addCategory = useExpenseStore((s) => s.addCategory);
    const updateCategory = useExpenseStore((s) => s.updateCategory);
    const deleteCategory = useExpenseStore((s) => s.deleteCategory);
    const setBudget = useExpenseStore((s) => s.setBudget);
    const deleteBudget = useExpenseStore((s) => s.deleteBudget);
    const ensureBudgetsForMonth = useExpenseStore(
        (s) => s.ensureBudgetsForMonth,
    );

    const currentUserId = currentUserIdFromStore ?? session?.user?.id ?? null;

    const [viewMode, setViewMode] = useState<ViewMode>("log");
    const [scope, setScope] = useState<ExpenseScope>("space");
    const [logPeriod, setLogPeriod] = useState<ExpenseLogPeriod>("daily");
    const [logAnchorDate, setLogAnchorDate] = useState(new Date());
    const [period, setPeriod] = useState<ExpensePeriod>("monthly");
    const [breakdownAnchorDate, setBreakdownAnchorDate] = useState(new Date());
    const [budgetAnchorDate, setBudgetAnchorDate] = useState(new Date());
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(
        null,
    );
    const [selectedBudget, setSelectedBudget] = useState<ExpenseBudget | null>(
        null,
    );
    const [selectedBreakdownCategory, setSelectedBreakdownCategory] =
        useState<ExpenseBreakdownItem | null>(null);

    const partnerProfile = useMemo(
        () =>
            currentUserId
                ? (profiles.find((item) => item.id !== currentUserId) ?? null)
                : null,
        [currentUserId, profiles],
    );
    const currentUserProfile = useMemo(
        () =>
            currentUserId
                ? (profiles.find((item) => item.id === currentUserId) ?? null)
                : null,
        [currentUserId, profiles],
    );
    const currentUserColor = getProfileColor(
        currentUserProfile,
        Colors.darkBlue,
    );
    const partnerColor = getProfileColor(partnerProfile, Colors.hotPink);

    const refreshProfiles = useCallback(async () => {
        const spaceId = await getSpaceId();
        if (!spaceId) {
            setProfiles([]);
            return;
        }

        const nextProfiles = await fetchProfiles(spaceId);
        setProfiles(nextProfiles);
    }, []);

    const refreshScreen = useCallback(async () => {
        await Promise.all([refreshAll(), refreshProfiles()]);
    }, [refreshAll, refreshProfiles]);

    const { refreshing, onRefresh } = usePullToRefresh(refreshScreen);

    useEffect(() => {
        void refreshScreen().catch((error) => {
            Alert.alert(
                "Expenses unavailable",
                error?.message ?? "Please try again later.",
            );
        });
    }, [refreshScreen]);

    useEffect(() => {
        if (viewMode !== "budget" || isLoadingBudgets) return;

        void ensureBudgetsForMonth(scope, budgetAnchorDate).catch((error) => {
            Alert.alert(
                "Budgets unavailable",
                error?.message ?? "Please try again later.",
            );
        });
    }, [
        budgetAnchorDate,
        ensureBudgetsForMonth,
        isLoadingBudgets,
        scope,
        viewMode,
    ]);

    const visibleExpenses = useMemo(() => {
        const scoped =
            scope === "space"
                ? expenses
                : currentUserId
                  ? expenses.filter(
                        (expense) => expense.paid_by === currentUserId,
                    )
                  : [];
        return scoped.filter((expense) =>
            isExpenseInPeriod(expense, logPeriod, logAnchorDate),
        );
    }, [currentUserId, expenses, logAnchorDate, logPeriod, scope]);

    const analytics = useMemo(
        () =>
            buildExpenseAnalytics({
                expenses,
                categories,
                period,
                scope,
                currentUserId,
                anchorDate: breakdownAnchorDate,
            }),
        [
            breakdownAnchorDate,
            categories,
            currentUserId,
            expenses,
            period,
            scope,
        ],
    );

    const budgetAnalytics = useMemo(
        () =>
            buildExpenseBudgetAnalytics({
                expenses,
                budgets,
                categories,
                scope,
                currentUserId,
                anchorDate: budgetAnchorDate,
            }),
        [budgetAnchorDate, budgets, categories, currentUserId, expenses, scope],
    );

    const budgetModalCategories = useMemo(() => {
        if (selectedBudget) {
            const activeCategory = categories.find(
                (category) => category.id === selectedBudget.category_id,
            );
            if (activeCategory) return [activeCategory];
            return [
                {
                    id: selectedBudget.category_id,
                    space_id: selectedBudget.space_id,
                    created_by: selectedBudget.created_by,
                    name: selectedBudget.category_name,
                    color: selectedBudget.category_color,
                    sort_order: 0,
                    is_default: false,
                    created_at: selectedBudget.created_at,
                    updated_at: selectedBudget.updated_at ?? null,
                    deleted_at: null,
                },
            ];
        }

        const budgetedCategoryIds = new Set(
            budgetAnalytics.rows.map((row) => row.budget.category_id),
        );
        return categories.filter(
            (category) => !budgetedCategoryIds.has(category.id),
        );
    }, [budgetAnalytics.rows, categories, selectedBudget]);

    const selectedBreakdownExpenses = useMemo(() => {
        if (!selectedBreakdownCategory) return [];

        return getExpensesForBreakdownCategory({
            expenses,
            categories,
            categoryKey: selectedBreakdownCategory.key,
            period,
            scope,
            currentUserId,
            anchorDate: breakdownAnchorDate,
        });
    }, [
        breakdownAnchorDate,
        categories,
        currentUserId,
        expenses,
        period,
        scope,
        selectedBreakdownCategory,
    ]);

    const handleOpenCreate = () => {
        setSelectedExpense(null);
        setSelectedBreakdownCategory(null);
        setIsCategoryModalOpen(false);
        setIsBudgetModalOpen(false);
        setIsExpenseModalOpen(true);
    };

    const handleOpenBudgetCreate = () => {
        setSelectedBudget(null);
        setIsExpenseModalOpen(false);
        setIsBudgetModalOpen(true);
    };

    const handleOpenCategories = () => {
        setSelectedExpense(null);
        setSelectedBreakdownCategory(null);
        setIsExpenseModalOpen(false);
        setIsBudgetModalOpen(false);
        setIsCategoryModalOpen(true);
    };

    const handleSaveExpense = async (input: {
        title: string;
        amount: number;
        currency: string;
        categoryId: string;
        description: string | null;
        paidAt: string;
        paidBy: string;
    }) => {
        try {
            if (selectedExpense) {
                await updateExpense(selectedExpense.id, input);
            } else {
                await addExpense(input);
            }
            setSelectedExpense(null);
            setIsExpenseModalOpen(false);
        } catch (error: any) {
            Alert.alert(
                "Save failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleDeleteExpense = async () => {
        if (!selectedExpense) return;
        try {
            await deleteExpense(selectedExpense.id);
            setSelectedExpense(null);
            setIsExpenseModalOpen(false);
        } catch (error: any) {
            Alert.alert(
                "Delete failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleAddCategory = async (name: string, color: string) => {
        try {
            await addCategory(name, color);
        } catch (error: any) {
            Alert.alert(
                "Category failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleUpdateCategory = async (
        categoryId: string,
        patch: { name: string; color: string },
    ) => {
        try {
            await updateCategory(categoryId, patch);
        } catch (error: any) {
            Alert.alert(
                "Category failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await deleteCategory(categoryId);
        } catch (error: any) {
            Alert.alert(
                "Category failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleSaveBudget = async (input: {
        categoryId: string;
        amount: number;
    }) => {
        try {
            await setBudget({
                scope,
                categoryId: input.categoryId,
                amount: input.amount,
                month: getExpenseMonthStart(budgetAnchorDate),
            });
            setSelectedBudget(null);
            setIsBudgetModalOpen(false);
        } catch (error: any) {
            Alert.alert(
                "Budget failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleDeleteBudget = async () => {
        if (!selectedBudget) return;
        try {
            await deleteBudget(selectedBudget.id);
            setSelectedBudget(null);
            setIsBudgetModalOpen(false);
        } catch (error: any) {
            Alert.alert(
                "Budget failed",
                error?.message ?? "Please try again later.",
            );
        }
    };

    const handleBudgetRowPress = (row: ExpenseBudgetRow) => {
        setSelectedBudget(row.budget);
        setIsBudgetModalOpen(true);
    };

    const handleOpenExpenseDetails = (expense: Expense) => {
        setSelectedExpense(expense);
        setSelectedBreakdownCategory(null);
        setIsExpenseModalOpen(true);
    };

    const renderExpense = ({ item }: { item: Expense }) => (
        <ExpenseRow
            expense={item}
            currentUserId={currentUserId}
            partnerProfile={partnerProfile}
            onPress={handleOpenExpenseDetails}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <ExpenseModal
                isOpen={isExpenseModalOpen}
                mode={selectedExpense ? "edit" : "create"}
                expenses={expenses}
                categories={categories}
                expense={selectedExpense}
                initialPaidAt={
                    viewMode === "log" && logPeriod === "daily"
                        ? logAnchorDate
                        : undefined
                }
                currentUserId={currentUserId}
                currentUserProfile={currentUserProfile}
                partnerProfile={partnerProfile}
                isLoadingCategories={isLoadingCategories}
                isSaving={isSavingExpense}
                onClose={() => {
                    setSelectedExpense(null);
                    setIsExpenseModalOpen(false);
                }}
                onSave={handleSaveExpense}
                onDelete={selectedExpense ? handleDeleteExpense : undefined}
            />
            <ExpenseCategoryExpensesModal
                isOpen={!!selectedBreakdownCategory}
                category={selectedBreakdownCategory}
                expenses={selectedBreakdownExpenses}
                periodLabel={getExpensePeriodLabel(period, breakdownAnchorDate)}
                currentUserId={currentUserId}
                partnerProfile={partnerProfile}
                onClose={() => setSelectedBreakdownCategory(null)}
                onExpensePress={handleOpenExpenseDetails}
            />
            <CategoryManagerModal
                isOpen={isCategoryModalOpen}
                categories={categories}
                isSaving={isSavingCategory}
                onClose={() => setIsCategoryModalOpen(false)}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
            />
            <BudgetModal
                isOpen={isBudgetModalOpen}
                budget={selectedBudget}
                categories={budgetModalCategories}
                isSaving={isSavingBudget}
                onClose={() => {
                    setSelectedBudget(null);
                    setIsBudgetModalOpen(false);
                }}
                onSave={handleSaveBudget}
                onDelete={selectedBudget ? handleDeleteBudget : undefined}
            />

            <View style={styles.header}>
                <View>
                    <CustomText weight="extrabold" style={styles.headerTitle}>
                        Expenses
                    </CustomText>
                    <CustomText weight="medium" style={styles.headerDate}>
                        {date}
                    </CustomText>
                </View>
                <View style={styles.headerScopeControl}>
                    <SegmentedControl<ExpenseScope>
                        value={scope}
                        onChange={setScope}
                        getOptionColor={(value) =>
                            value === "me" ? currentUserColor : partnerColor
                        }
                        options={[
                            { value: "me", label: "Me" },
                            { value: "space", label: "Both" },
                        ]}
                    />
                </View>
            </View>

            <View style={styles.controls}>
                <SegmentedControl<ViewMode>
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                        { value: "log", label: "Log" },
                        { value: "breakdown", label: "Breakdown" },
                        { value: "budget", label: "Budget" },
                    ]}
                />
            </View>

            {viewMode === "log" ? (
                <View style={styles.listShell}>
                    <View style={styles.logPeriodControls}>
                        <SegmentedControl<ExpenseLogPeriod>
                            value={logPeriod}
                            onChange={setLogPeriod}
                            selectedColor={Colors.yellow}
                            selectedTextColor={Colors.brownText}
                            options={[
                                { value: "daily", label: "Day" },
                                { value: "weekly", label: "Week" },
                                { value: "monthly", label: "Month" },
                            ]}
                        />
                        <PeriodNavigator
                            period={logPeriod}
                            anchorDate={logAnchorDate}
                            onPrevious={() =>
                                setLogAnchorDate((current) =>
                                    shiftExpensePeriod(current, logPeriod, -1),
                                )
                            }
                            onNext={() =>
                                setLogAnchorDate((current) =>
                                    shiftExpensePeriod(current, logPeriod, 1),
                                )
                            }
                        />
                    </View>
                    {isLoadingExpenses && visibleExpenses.length === 0 ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator size="large" />
                        </View>
                    ) : (
                        <FlatList
                            data={visibleExpenses}
                            keyExtractor={(item) => item.id}
                            renderItem={renderExpense}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <CustomText
                                        weight="extrabold"
                                        style={styles.emptyTitle}
                                    >
                                        No expenses yet
                                    </CustomText>
                                    <CustomText
                                        weight="medium"
                                        style={styles.emptyBody}
                                    >
                                        Add your first expense to start
                                        tracking.
                                    </CustomText>
                                </View>
                            }
                        />
                    )}
                </View>
            ) : viewMode === "breakdown" ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    contentContainerStyle={styles.breakdownScroll}
                >
                    <ExpenseBreakdownView
                        analytics={analytics}
                        period={period}
                        onPeriodChange={setPeriod}
                        anchorDate={breakdownAnchorDate}
                        onPreviousPeriod={() =>
                            setBreakdownAnchorDate((current) =>
                                shiftExpensePeriod(current, period, -1),
                            )
                        }
                        onNextPeriod={() =>
                            setBreakdownAnchorDate((current) =>
                                shiftExpensePeriod(current, period, 1),
                            )
                        }
                        onCategoryPress={setSelectedBreakdownCategory}
                    />
                </ScrollView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    contentContainerStyle={styles.breakdownScroll}
                >
                    <ExpenseBudgetView
                        analytics={budgetAnalytics}
                        anchorDate={budgetAnchorDate}
                        isLoading={isLoadingBudgets}
                        onPreviousMonth={() =>
                            setBudgetAnchorDate((current) =>
                                shiftExpenseMonth(current, -1),
                            )
                        }
                        onNextMonth={() =>
                            setBudgetAnchorDate((current) =>
                                shiftExpenseMonth(current, 1),
                            )
                        }
                        onAddBudget={handleOpenBudgetCreate}
                        onEditBudget={handleBudgetRowPress}
                    />
                </ScrollView>
            )}
            {viewMode === "budget" ? (
                <TouchableOpacity
                    style={styles.floatingAddButton}
                    onPress={handleOpenBudgetCreate}
                    accessibilityRole="button"
                    accessibilityLabel="Add budget"
                >
                    <Plus />
                </TouchableOpacity>
            ) : (
                <ExpenseFloatingActionMenu
                    actions={[
                        {
                            key: "expense",
                            label: "Add expense",
                            shortLabel: "E",
                            accessibilityLabel: "Add expense",
                            onPress: handleOpenCreate,
                        },
                        {
                            key: "categories",
                            label: "Categories",
                            shortLabel: "C",
                            accessibilityLabel: "Manage categories",
                            onPress: handleOpenCategories,
                        },
                    ]}
                />
            )}
        </SafeAreaView>
    );
};

export default Expenses;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingTop: 20,
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        gap: 14,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    headerDate: {
        fontSize: 12,
        color: Colors.darkGreenText,
    },
    headerScopeControl: {
        width: 136,
    },
    floatingAddButton: {
        position: "absolute",
        right: 22,
        bottom: 120,
        zIndex: 10,
        width: 54,
        height: 54,
        borderRadius: 999,
        backgroundColor: "#FFCC7D",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 5,
        elevation: 6,
    },
    controls: {
        gap: 10,
        marginBottom: 10,
    },
    logPeriodControls: {
        gap: 10,
        marginBottom: 10,
    },
    segmentedControl: {
        flexDirection: "row",
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 4,
        gap: 4,
    },
    segmentButton: {
        flex: 1,
        height: 34,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    selectedSegmentButton: {
        backgroundColor: Colors.green,
    },
    segmentText: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    selectedSegmentText: {
        color: Colors.white,
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
    periodNavigatorLabel: {
        flex: 1,
        color: Colors.darkGreenText,
        fontSize: 13,
        textAlign: "center",
    },
    listShell: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 95,
    },
    loadingState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        marginTop: 70,
        alignItems: "center",
        paddingHorizontal: 24,
    },
    emptyTitle: {
        color: Colors.darkGreenText,
        fontSize: 18,
        marginBottom: 8,
    },
    emptyBody: {
        color: Colors.gray,
        fontSize: 13,
        textAlign: "center",
    },
    breakdownScroll: {
        paddingBottom: 95,
    },
});
