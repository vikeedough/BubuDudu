import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import CategoryEditorModal from "@/components/expenses/CategoryEditorModal";
import { Colors } from "@/constants/colors";
import { getReadableTextColor } from "@/utils/colors";
import { getExpenseCategoryIcon } from "@/utils/expense-category-icons";

import type { ExpenseCategory } from "@/api/endpoints/types";

type CategoryManagerModalProps = {
    isOpen: boolean;
    categories: ExpenseCategory[];
    isSaving: boolean;
    onClose: () => void;
    onAddCategory: (name: string, color: string, icon: string) => Promise<void>;
    onUpdateCategory: (
        categoryId: string,
        patch: Pick<ExpenseCategory, "name" | "color" | "icon">,
    ) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
};

export default function CategoryManagerModal({
    isOpen, categories, isSaving, onClose, onAddCategory, onUpdateCategory, onDeleteCategory,
}: CategoryManagerModalProps) {
    // Store identity only; the editor always receives the current category data.
    const [editor, setEditor] = useState<{ categoryId: string | null } | null>(null);
    const [isEditorBusy, setIsEditorBusy] = useState(false);
    const selectedCategory = editor?.categoryId
        ? categories.find((category) => category.id === editor.categoryId)
        : undefined;
    const sortedCategories = useMemo(() => categories.slice().sort((a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id),
    ), [categories]);

    useEffect(() => {
        if (!isOpen) setEditor(null);
    }, [isOpen]);

    useEffect(() => {
        if (editor?.categoryId && !selectedCategory && !isEditorBusy) setEditor(null);
    }, [editor, isEditorBusy, selectedCategory]);

    const closeEditor = () => setEditor(null);
    const closeTopDialog = () => {
        if (isEditorBusy || isSaving) return;
        if (editor) closeEditor();
        else onClose();
    };

    return (
        <Modal visible={isOpen} onRequestClose={closeTopDialog} transparent animationType="fade">
            <View style={styles.overlay}>
                <Pressable accessibilityLabel="Dismiss category dialog" style={StyleSheet.absoluteFill} onPress={closeTopDialog} />
                {/* Keep the list mounted while the editor is open, preserving its scroll position. */}
                <View
                    pointerEvents={editor ? "none" : "box-none"}
                    style={[styles.centered, editor && styles.hidden]}
                    accessibilityElementsHidden={!!editor}
                    importantForAccessibility={editor ? "no-hide-descendants" : "auto"}
                >
                    <View style={styles.modal}>
                        <CustomText weight="extrabold" style={styles.title}>Categories</CustomText>
                        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                            {sortedCategories.map((category) => (
                                <TouchableOpacity
                                    key={category.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Edit category ${category.name}`}
                                    style={styles.row}
                                    onPress={() => setEditor({ categoryId: category.id })}
                                >
                                    <View style={[styles.icon, { backgroundColor: category.color }]}>
                                        <MaterialCommunityIcons
                                            name={getExpenseCategoryIcon(category.icon, category.name)}
                                            size={22}
                                            color={getReadableTextColor(category.color)}
                                        />
                                    </View>
                                    <CustomText weight="semibold" style={styles.name} numberOfLines={1}>
                                        {category.name}
                                    </CustomText>
                                    <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.brownText} />
                                </TouchableOpacity>
                            ))}
                            {categories.length === 0 && <CustomText style={styles.empty}>No categories yet.</CustomText>}
                        </ScrollView>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Add Category"
                            style={styles.addButton}
                            onPress={() => setEditor({ categoryId: null })}
                        >
                            <CustomText weight="semibold" style={styles.buttonText}>Add Category</CustomText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeButton} onPress={closeTopDialog}>
                            <CustomText weight="semibold" style={styles.buttonText}>Done</CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
                {editor && (
                    <CategoryEditorModal
                        key={editor.categoryId ?? "create"}
                        mode={editor.categoryId ? "edit" : "create"}
                        category={selectedCategory}
                        isSaving={isSaving || isEditorBusy}
                        onBusyChange={setIsEditorBusy}
                        onClose={closeEditor}
                        onSave={async (input) => {
                            if (editor.categoryId) await onUpdateCategory(editor.categoryId, input);
                            else await onAddCategory(input.name, input.color, input.icon);
                        }}
                        onDelete={editor.categoryId ? () => onDeleteCategory(editor.categoryId!) : undefined}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
    hidden: { display: "none" },
    modal: { width: "100%", maxHeight: "86%", backgroundColor: Colors.white, borderRadius: 15, padding: 22 },
    title: { color: Colors.darkGreenText, fontSize: 22, marginBottom: 16 },
    list: { maxHeight: 360, flexShrink: 1 },
    row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#EBEAEC", paddingVertical: 10 },
    icon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    name: { flex: 1, color: Colors.darkGreenText, fontSize: 14 },
    empty: { color: Colors.gray, fontSize: 14, paddingVertical: 16 },
    addButton: { backgroundColor: Colors.yellow, minHeight: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 16 },
    closeButton: { alignSelf: "center", backgroundColor: "#AFAFAF", minWidth: 110, minHeight: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 10 },
    buttonText: { color: Colors.brownText, fontSize: 14 },
});
