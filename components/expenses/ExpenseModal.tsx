import React, { useEffect, useMemo, useRef, useState } from "react";
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
import ExpenseDatePicker from "@/components/expenses/ExpenseDatePicker";
import { Colors } from "@/constants/colors";
import {
    getReadableAccentTextColor,
    getReadableTextColor,
    normalizeHexColor,
} from "@/utils/colors";
import {
    DEFAULT_EXPENSE_CURRENCY,
    getExpenseTitleSuggestions,
    parseExpenseAmount,
    POPULAR_CURRENCIES,
} from "@/utils/expenses";

import type { Expense, ExpenseCategory, Profile } from "@/api/endpoints/types";

const CURRENCY_DROPDOWN_WIDTH = 96;
const CURRENCY_DROPDOWN_GAP = 6;
const CATEGORY_DROPDOWN_WIDTH = 220;
const CATEGORY_DROPDOWN_GAP = 6;

type ExpenseModalSaveInput = {
    title: string;
    amount: number;
    currency: string;
    categoryId: string;
    paidBy: string;
    description: string | null;
    paidAt: string;
};

type ExpenseModalProps = {
    isOpen: boolean;
    mode: "create" | "edit";
    expenses: Expense[];
    categories: ExpenseCategory[];
    expense?: Expense | null;
    initialPaidAt?: Date;
    currentUserId: string | null;
    currentUserProfile: Profile | null;
    partnerProfile: Profile | null;
    isLoadingCategories: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSave: (input: ExpenseModalSaveInput) => Promise<void>;
    onDelete?: () => Promise<void>;
};

function getInitialDate(expense?: Expense | null, fallbackDate?: Date) {
    if (!expense?.paid_at) {
        return fallbackDate && !Number.isNaN(fallbackDate.getTime())
            ? new Date(fallbackDate)
            : new Date();
    }
    const parsed = new Date(expense.paid_at);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getProfileColor(profile: Profile | null, fallback: string) {
    return normalizeHexColor(profile?.avatar_border_color) ?? fallback;
}

function getPartnerLabel(profile: Profile | null) {
    return profile?.name?.trim() || "Partner";
}

export default function ExpenseModal({
    isOpen,
    mode,
    expenses,
    categories,
    expense,
    initialPaidAt,
    currentUserId,
    currentUserProfile,
    partnerProfile,
    isLoadingCategories,
    isSaving,
    onClose,
    onSave,
    onDelete,
}: ExpenseModalProps) {
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState(DEFAULT_EXPENSE_CURRENCY);
    const [categoryId, setCategoryId] = useState("");
    const [paidBy, setPaidBy] = useState("");
    const [paidAt, setPaidAt] = useState(new Date());
    const [isTitleInputFocused, setIsTitleInputFocused] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const [currencyDropdownPosition, setCurrencyDropdownPosition] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [categoryDropdownPosition, setCategoryDropdownPosition] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const currencyButtonRef =
        useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
    const categoryButtonRef =
        useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
    const titleBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const currentUserColor = getProfileColor(
        currentUserProfile,
        Colors.darkBlue,
    );
    const partnerColor = getProfileColor(partnerProfile, Colors.hotPink);
    const currentUserTextColor = getReadableAccentTextColor(currentUserColor);
    const partnerTextColor = getReadableAccentTextColor(partnerColor);
    const currentUserSelectedTextColor = getReadableTextColor(currentUserColor);
    const partnerSelectedTextColor = getReadableTextColor(partnerColor);
    const partnerLabel = getPartnerLabel(partnerProfile);
    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === categoryId) ?? null,
        [categories, categoryId],
    );
    const titleSuggestions = useMemo(
        () =>
            getExpenseTitleSuggestions({
                expenses,
                query: title,
                currentUserId,
                excludeExpenseId: expense?.id,
            }),
        [currentUserId, expense?.id, expenses, title],
    );
    const showTitleSuggestions =
        isTitleInputFocused && titleSuggestions.length > 0;

    useEffect(() => {
        if (!isOpen) return;

        setTitle(expense?.title ?? "");
        setAmount(expense ? String(expense.amount) : "");
        setCurrency(expense?.currency ?? DEFAULT_EXPENSE_CURRENCY);
        setCategoryId(expense?.category_id ?? "");
        setPaidBy(expense?.paid_by ?? currentUserId ?? "");
        setPaidAt(getInitialDate(expense, initialPaidAt));
        setIsTitleInputFocused(false);
        setIsCurrencyDropdownOpen(false);
        setCurrencyDropdownPosition(null);
        setIsCategoryDropdownOpen(false);
        setCategoryDropdownPosition(null);

        requestAnimationFrame(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        });
    }, [currentUserId, expense, initialPaidAt, isOpen]);

    useEffect(() => {
        return () => {
            if (titleBlurTimerRef.current) {
                clearTimeout(titleBlurTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen || categoryId || categories.length === 0) return;
        setCategoryId(categories[0].id);
    }, [categories, categoryId, isOpen]);

    const closeCurrencyDropdown = () => {
        setIsCurrencyDropdownOpen(false);
        setCurrencyDropdownPosition(null);
    };

    const closeCategoryDropdown = () => {
        setIsCategoryDropdownOpen(false);
        setCategoryDropdownPosition(null);
    };

    const closeDropdowns = () => {
        closeCurrencyDropdown();
        closeCategoryDropdown();
    };

    const handleToggleCurrencyDropdown = () => {
        if (isCurrencyDropdownOpen) {
            closeCurrencyDropdown();
            return;
        }

        closeCategoryDropdown();
        currencyButtonRef.current?.measureInWindow((x, y, width, height) => {
            setCurrencyDropdownPosition({
                top: y + height + CURRENCY_DROPDOWN_GAP,
                left: Math.max(12, x + width - CURRENCY_DROPDOWN_WIDTH),
            });
            setIsCurrencyDropdownOpen(true);
        });
    };

    const handleToggleCategoryDropdown = () => {
        if (isCategoryDropdownOpen) {
            closeCategoryDropdown();
            return;
        }

        closeCurrencyDropdown();
        categoryButtonRef.current?.measureInWindow((x, y, width, height) => {
            setCategoryDropdownPosition({
                top: y + height + CATEGORY_DROPDOWN_GAP,
                left: Math.max(12, x + width - CATEGORY_DROPDOWN_WIDTH),
            });
            setIsCategoryDropdownOpen(true);
        });
    };

    const handleSelectCurrency = (code: string) => {
        setCurrency(code);
        closeCurrencyDropdown();
    };

    const handleSelectCategory = (nextCategoryId: string) => {
        setCategoryId(nextCategoryId);
        closeCategoryDropdown();
    };

    const handleSelectTitleSuggestion = (suggestion: string) => {
        setTitle(suggestion);
        setIsTitleInputFocused(false);
        if (titleBlurTimerRef.current) {
            clearTimeout(titleBlurTimerRef.current);
            titleBlurTimerRef.current = null;
        }
    };

    const handleBackdropPress = () => {
        if (isCurrencyDropdownOpen || isCategoryDropdownOpen) {
            closeDropdowns();
            return;
        }

        onClose();
    };

    const handleSave = async () => {
        const parsedAmount = parseExpenseAmount(amount);
        if (!parsedAmount) {
            Alert.alert("Amount needed", "Please enter a valid amount.");
            return;
        }

        if (title.trim().length === 0) {
            Alert.alert("Title needed", "Please enter a title.");
            return;
        }

        if (!categoryId) {
            Alert.alert("Category needed", "Please select a category.");
            return;
        }

        if (!paidBy) {
            Alert.alert("Payer needed", "Please select who paid.");
            return;
        }

        await onSave({
            title: title.trim(),
            amount: parsedAmount,
            currency,
            categoryId,
            paidBy,
            description: expense?.description ?? null,
            paidAt: paidAt.toISOString(),
        });
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        Alert.alert("Delete expense?", "This expense will be removed.", [
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
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleBackdropPress}
                />
                <KeyboardAvoidingView
                    style={styles.centered}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={styles.modal}>
                        <ScrollView
                            ref={scrollViewRef}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                        >
                            <CustomText
                                weight="extrabold"
                                style={styles.modalTitle}
                            >
                                {mode === "create"
                                    ? "Add expense"
                                    : "Expense details"}
                            </CustomText>

                            <CustomText weight="semibold" style={styles.label}>
                                Title
                            </CustomText>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={(nextTitle) => {
                                    setTitle(nextTitle);
                                    setIsTitleInputFocused(true);
                                }}
                                onFocus={() => {
                                    if (titleBlurTimerRef.current) {
                                        clearTimeout(titleBlurTimerRef.current);
                                        titleBlurTimerRef.current = null;
                                    }
                                    setIsTitleInputFocused(true);
                                }}
                                onBlur={() => {
                                    titleBlurTimerRef.current = setTimeout(
                                        () => {
                                            setIsTitleInputFocused(false);
                                        },
                                        120,
                                    );
                                }}
                                placeholder="What was it for?"
                                placeholderTextColor={Colors.gray}
                                allowFontScaling={false}
                            />
                            {showTitleSuggestions ? (
                                <View style={styles.titleSuggestions}>
                                    {titleSuggestions.map((suggestion) => (
                                        <TouchableOpacity
                                            key={suggestion}
                                            style={styles.titleSuggestionOption}
                                            onPress={() =>
                                                handleSelectTitleSuggestion(
                                                    suggestion,
                                                )
                                            }
                                        >
                                            <CustomText
                                                weight="semibold"
                                                style={
                                                    styles.titleSuggestionText
                                                }
                                                numberOfLines={1}
                                            >
                                                {suggestion}
                                            </CustomText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : null}

                            <CustomText weight="semibold" style={styles.label}>
                                Amount
                            </CustomText>
                            <View style={styles.amountField}>
                                <View style={styles.amountRow}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.amountInput,
                                        ]}
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0.00"
                                        placeholderTextColor={Colors.gray}
                                        keyboardType="decimal-pad"
                                        allowFontScaling={false}
                                    />
                                    <TouchableOpacity
                                        ref={currencyButtonRef}
                                        style={styles.currencyDropdownButton}
                                        onPress={handleToggleCurrencyDropdown}
                                    >
                                        <CustomText
                                            weight="extrabold"
                                            style={styles.currencyDropdownText}
                                        >
                                            {currency}
                                        </CustomText>
                                        <CustomText
                                            weight="semibold"
                                            style={styles.currencyChevron}
                                        >
                                            {isCurrencyDropdownOpen ? "^" : "v"}
                                        </CustomText>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.labelRow}>
                                <CustomText
                                    weight="semibold"
                                    style={[styles.label, styles.labelInRow]}
                                >
                                    Category
                                </CustomText>
                                <TouchableOpacity
                                    ref={categoryButtonRef}
                                    style={styles.categoryDropdownButton}
                                    onPress={handleToggleCategoryDropdown}
                                >
                                    <CustomText
                                        weight="extrabold"
                                        style={styles.categoryDropdownText}
                                        numberOfLines={1}
                                    >
                                        {isLoadingCategories &&
                                        categories.length === 0
                                            ? "Loading"
                                            : (selectedCategory?.name ??
                                              "Select")}
                                    </CustomText>
                                    <CustomText
                                        weight="semibold"
                                        style={styles.currencyChevron}
                                    >
                                        {isCategoryDropdownOpen ? "^" : "v"}
                                    </CustomText>
                                </TouchableOpacity>
                            </View>
                            {!isLoadingCategories && categories.length === 0 ? (
                                <View style={styles.categoryEmptyState}>
                                    <CustomText
                                        weight="semibold"
                                        style={styles.categoryEmptyText}
                                    >
                                        No categories yet.
                                    </CustomText>
                                </View>
                            ) : null}

                            <CustomText weight="semibold" style={styles.label}>
                                Date and time
                            </CustomText>
                            <ExpenseDatePicker
                                value={paidAt}
                                onChange={setPaidAt}
                                maxYear={new Date().getFullYear() + 1}
                                nestedScrollEnabled
                                showTime
                            />

                            <CustomText weight="semibold" style={styles.label}>
                                Paid by
                            </CustomText>
                            <View style={styles.paidByRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.paidByButton,
                                        { borderColor: currentUserColor },
                                        paidBy === currentUserId && {
                                            backgroundColor: currentUserColor,
                                        },
                                        !currentUserId && styles.disabledPaidBy,
                                    ]}
                                    onPress={() =>
                                        currentUserId &&
                                        setPaidBy(currentUserId)
                                    }
                                    disabled={!currentUserId}
                                >
                                    <CustomText
                                        weight="semibold"
                                        style={[
                                            styles.paidByText,
                                            {
                                                color:
                                                    paidBy === currentUserId
                                                        ? currentUserSelectedTextColor
                                                        : currentUserTextColor,
                                            },
                                            !currentUserId &&
                                                styles.disabledPaidByText,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        Me
                                    </CustomText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.paidByButton,
                                        {
                                            borderColor: partnerProfile
                                                ? partnerColor
                                                : "#EBEAEC",
                                        },
                                        !partnerProfile &&
                                            styles.disabledPaidBy,
                                        paidBy === partnerProfile?.id && {
                                            backgroundColor: partnerColor,
                                        },
                                    ]}
                                    onPress={() =>
                                        partnerProfile &&
                                        setPaidBy(partnerProfile.id)
                                    }
                                    disabled={!partnerProfile}
                                >
                                    <CustomText
                                        weight="semibold"
                                        style={[
                                            styles.paidByText,
                                            {
                                                color:
                                                    paidBy ===
                                                    partnerProfile?.id
                                                        ? partnerSelectedTextColor
                                                        : partnerProfile
                                                          ? partnerTextColor
                                                          : Colors.gray,
                                            },
                                            !partnerProfile &&
                                                styles.disabledPaidByText,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {partnerLabel}
                                    </CustomText>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                {mode === "edit" && onDelete ? (
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
                                    disabled={isSaving}
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
                {isCurrencyDropdownOpen && currencyDropdownPosition ? (
                    <>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={closeCurrencyDropdown}
                        />
                        <View
                            style={[
                                styles.currencyDropdown,
                                currencyDropdownPosition,
                            ]}
                        >
                            <ScrollView
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                                style={styles.currencyDropdownScroll}
                                contentContainerStyle={
                                    styles.currencyDropdownContent
                                }
                                showsVerticalScrollIndicator
                            >
                                {POPULAR_CURRENCIES.map((code) => (
                                    <TouchableOpacity
                                        key={code}
                                        style={[
                                            styles.currencyOption,
                                            currency === code &&
                                                styles.selectedCurrencyOption,
                                        ]}
                                        onPress={() =>
                                            handleSelectCurrency(code)
                                        }
                                    >
                                        <CustomText
                                            weight="semibold"
                                            style={[
                                                styles.currencyOptionText,
                                                currency === code &&
                                                    styles.selectedCurrencyOptionText,
                                            ]}
                                        >
                                            {code}
                                        </CustomText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </>
                ) : null}
                {isCategoryDropdownOpen && categoryDropdownPosition ? (
                    <>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={closeCategoryDropdown}
                        />
                        <View
                            style={[
                                styles.categoryDropdown,
                                categoryDropdownPosition,
                            ]}
                        >
                            <ScrollView
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                                style={styles.categoryDropdownScroll}
                                contentContainerStyle={
                                    styles.categoryDropdownContent
                                }
                                showsVerticalScrollIndicator
                            >
                                {isLoadingCategories &&
                                categories.length === 0 ? (
                                    <View style={styles.categoryOption}>
                                        <ActivityIndicator size="small" />
                                    </View>
                                ) : categories.length === 0 ? (
                                    <View style={styles.categoryOption}>
                                        <CustomText
                                            weight="semibold"
                                            style={styles.categoryOptionText}
                                        >
                                            No categories
                                        </CustomText>
                                    </View>
                                ) : (
                                    categories.map((category) => (
                                        <TouchableOpacity
                                            key={category.id}
                                            style={[
                                                styles.categoryOption,
                                                categoryId === category.id &&
                                                    styles.selectedCategoryOption,
                                            ]}
                                            onPress={() =>
                                                handleSelectCategory(
                                                    category.id,
                                                )
                                            }
                                        >
                                            <CustomText
                                                weight="semibold"
                                                style={[
                                                    styles.categoryOptionText,
                                                    categoryId ===
                                                        category.id &&
                                                        styles.selectedCategoryOptionText,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {category.name}
                                            </CustomText>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </>
                ) : null}
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
        maxHeight: "92%",
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
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 12,
        marginBottom: 7,
    },
    labelInRow: {
        flex: 1,
        marginTop: 0,
        marginBottom: 0,
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
    titleSuggestions: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: Colors.white,
    },
    titleSuggestionOption: {
        minHeight: 38,
        justifyContent: "center",
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F1F3",
    },
    titleSuggestionText: {
        color: Colors.darkGreenText,
        fontSize: 13,
    },
    amountField: {
        position: "relative",
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
    currencyDropdownButton: {
        width: 88,
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    currencyDropdownText: {
        color: Colors.darkGreenText,
        fontSize: 13,
    },
    currencyChevron: {
        color: Colors.gray,
        fontSize: 14,
        marginBottom: 2,
    },
    currencyDropdown: {
        position: "absolute",
        width: CURRENCY_DROPDOWN_WIDTH,
        height: 176,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        backgroundColor: Colors.white,
        overflow: "hidden",
        zIndex: 100,
        elevation: 100,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    currencyDropdownScroll: {
        height: 174,
    },
    currencyDropdownContent: {
        paddingBottom: 1,
    },
    currencyOption: {
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#F2F1F3",
    },
    selectedCurrencyOption: {
        backgroundColor: Colors.yellow,
    },
    currencyOptionText: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    selectedCurrencyOptionText: {
        color: Colors.brownText,
    },
    categoryEmptyState: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    categoryEmptyText: {
        color: Colors.gray,
        fontSize: 12,
    },
    categoryDropdownButton: {
        width: 180,
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    categoryDropdownText: {
        flex: 1,
        color: Colors.darkGreenText,
        fontSize: 13,
        textAlign: "center",
    },
    categoryDropdown: {
        position: "absolute",
        width: CATEGORY_DROPDOWN_WIDTH,
        maxHeight: 220,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        backgroundColor: Colors.white,
        overflow: "hidden",
        zIndex: 100,
        elevation: 100,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    categoryDropdownScroll: {
        maxHeight: 218,
    },
    categoryDropdownContent: {
        paddingBottom: 1,
    },
    categoryOption: {
        minHeight: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F1F3",
    },
    selectedCategoryOption: {
        backgroundColor: Colors.yellow,
    },
    categoryOptionText: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    selectedCategoryOptionText: {
        color: Colors.brownText,
    },
    paidByRow: {
        flexDirection: "row",
        gap: 10,
    },
    paidByButton: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    disabledPaidBy: {
        opacity: 0.45,
    },
    paidByText: {
        color: Colors.darkGreenText,
        fontSize: 13,
        maxWidth: "100%",
        textAlign: "center",
    },
    disabledPaidByText: {
        color: Colors.gray,
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
