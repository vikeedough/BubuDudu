import React, { memo, useEffect, useState } from "react";
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
import { EXPENSE_CATEGORY_COLORS } from "@/utils/expenses";

import type { ExpenseCategory } from "@/api/endpoints/types";

type CategoryManagerModalProps = {
    isOpen: boolean;
    categories: ExpenseCategory[];
    isSaving: boolean;
    onClose: () => void;
    onAddCategory: (name: string, color: string) => Promise<void>;
    onUpdateCategory: (
        categoryId: string,
        patch: Pick<ExpenseCategory, "name" | "color">,
    ) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
};

type CategoryEditorProps = {
    category: ExpenseCategory;
    isSaving: boolean;
    onUpdate: (
        categoryId: string,
        patch: Pick<ExpenseCategory, "name" | "color">,
    ) => Promise<void>;
    onDelete: (categoryId: string) => Promise<void>;
};

const CategoryEditor = memo(
    ({ category, isSaving, onUpdate, onDelete }: CategoryEditorProps) => {
        const [name, setName] = useState(category.name);
        const [color, setColor] = useState(category.color);

        useEffect(() => {
            setName(category.name);
            setColor(category.color);
        }, [category]);

        const isDirty = name.trim() !== category.name || color !== category.color;

        const handleSave = async () => {
            if (name.trim().length === 0) {
                Alert.alert("Name needed", "Please enter a category name.");
                return;
            }
            await onUpdate(category.id, { name: name.trim(), color });
        };

        const handleDelete = () => {
            Alert.alert(
                "Delete category?",
                "Existing expenses will keep their category label.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            void onDelete(category.id);
                        },
                    },
                ],
            );
        };

        return (
            <View style={styles.editor}>
                <View style={styles.editorHeader}>
                    <TextInput
                        style={styles.nameInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="Category"
                        placeholderTextColor={Colors.gray}
                        allowFontScaling={false}
                    />
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={isSaving}
                        style={styles.deletePill}
                    >
                        <CustomText weight="semibold" style={styles.deleteText}>
                            Delete
                        </CustomText>
                    </TouchableOpacity>
                </View>
                <View style={styles.colorRow}>
                    {EXPENSE_CATEGORY_COLORS.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[
                                styles.colorSwatch,
                                { backgroundColor: item },
                                color === item && styles.selectedSwatch,
                            ]}
                            onPress={() => setColor(item)}
                        />
                    ))}
                    {isDirty ? (
                        <TouchableOpacity
                            style={styles.saveSmallButton}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <CustomText
                                weight="semibold"
                                style={styles.saveSmallText}
                            >
                                Save
                            </CustomText>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        );
    },
);

CategoryEditor.displayName = "CategoryEditor";

export default function CategoryManagerModal({
    isOpen,
    categories,
    isSaving,
    onClose,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
}: CategoryManagerModalProps) {
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState<string>(EXPENSE_CATEGORY_COLORS[0]);

    useEffect(() => {
        if (!isOpen) return;
        setNewName("");
        setNewColor(EXPENSE_CATEGORY_COLORS[0]);
    }, [isOpen]);

    const handleAdd = async () => {
        if (newName.trim().length === 0) {
            Alert.alert("Name needed", "Please enter a category name.");
            return;
        }

        await onAddCategory(newName.trim(), newColor);
        setNewName("");
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
                        <CustomText weight="extrabold" style={styles.title}>
                            Categories
                        </CustomText>
                        <View style={styles.addPanel}>
                            <TextInput
                                style={styles.addInput}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="New category"
                                placeholderTextColor={Colors.gray}
                                allowFontScaling={false}
                            />
                            <View style={styles.colorRow}>
                                {EXPENSE_CATEGORY_COLORS.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={[
                                            styles.colorSwatch,
                                            { backgroundColor: item },
                                            newColor === item &&
                                                styles.selectedSwatch,
                                        ]}
                                        onPress={() => setNewColor(item)}
                                    />
                                ))}
                            </View>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleAdd}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" />
                                ) : (
                                    <CustomText
                                        weight="semibold"
                                        style={styles.addButtonText}
                                    >
                                        Add
                                    </CustomText>
                                )}
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.list}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {categories.map((category) => (
                                <CategoryEditor
                                    key={category.id}
                                    category={category}
                                    isSaving={isSaving}
                                    onUpdate={onUpdateCategory}
                                    onDelete={onDeleteCategory}
                                />
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <CustomText
                                weight="semibold"
                                style={styles.closeText}
                            >
                                Done
                            </CustomText>
                        </TouchableOpacity>
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
    title: {
        color: Colors.darkGreenText,
        fontSize: 22,
        marginBottom: 16,
    },
    addPanel: {
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        gap: 10,
    },
    addInput: {
        color: Colors.black,
        fontFamily: "Raleway-Regular",
        fontSize: 14,
        minHeight: 38,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
    },
    list: {
        maxHeight: 360,
    },
    editor: {
        borderBottomWidth: 1,
        borderBottomColor: "#EBEAEC",
        paddingVertical: 12,
        gap: 10,
    },
    editorHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    nameInput: {
        flex: 1,
        color: Colors.black,
        fontFamily: "Raleway-SemiBold",
        fontSize: 14,
        minHeight: 38,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
    },
    colorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        flexWrap: "wrap",
    },
    colorSwatch: {
        width: 24,
        height: 24,
        borderRadius: 999,
        opacity: 0.65,
    },
    selectedSwatch: {
        opacity: 1,
        borderWidth: 2,
        borderColor: Colors.brownText,
    },
    addButton: {
        alignSelf: "flex-start",
        backgroundColor: "#FFCC7D",
        height: 36,
        borderRadius: 10,
        minWidth: 82,
        alignItems: "center",
        justifyContent: "center",
    },
    addButtonText: {
        color: Colors.brownText,
        fontSize: 14,
    },
    saveSmallButton: {
        backgroundColor: "#FFCC7D",
        height: 30,
        borderRadius: 999,
        paddingHorizontal: 13,
        justifyContent: "center",
    },
    saveSmallText: {
        color: Colors.brownText,
        fontSize: 12,
    },
    deletePill: {
        height: 32,
        justifyContent: "center",
    },
    deleteText: {
        color: Colors.red,
        fontSize: 12,
    },
    closeButton: {
        alignSelf: "center",
        marginTop: 16,
        backgroundColor: "#AFAFAF",
        minWidth: 110,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    closeText: {
        color: Colors.brownText,
        fontSize: 14,
    },
});
