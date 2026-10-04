import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { getReadableTextColor } from "@/utils/colors";
import {
    getExpenseCategoryIcon,
    searchExpenseCategoryIcons,
    type ExpenseCategoryIcon,
} from "@/utils/expense-category-icons";

export default function CategoryIconPicker({ value, color, categoryName = "", disabled = false, onChange }: {
    value?: string | null;
    color: string;
    categoryName?: string;
    disabled?: boolean;
    onChange: (icon: ExpenseCategoryIcon) => void;
}) {
    const [query, setQuery] = useState("");
    const selectedIcon = getExpenseCategoryIcon(value, categoryName);
    const icons = useMemo(() => searchExpenseCategoryIcons(query), [query]);
    const foreground = getReadableTextColor(color);

    return (
        <View style={styles.container}>
            <View style={styles.previewRow}>
                <View
                    accessibilityLabel={`Selected category icon ${selectedIcon}`}
                    style={[styles.preview, { backgroundColor: color }]}
                >
                    <MaterialCommunityIcons name={selectedIcon} size={24} color={foreground} />
                </View>
                <CustomText weight="semibold" style={styles.label}>Icon</CustomText>
            </View>
            <TextInput
                accessibilityLabel="Search category icons"
                placeholder="Search icons"
                placeholderTextColor={Colors.gray}
                value={query}
                onChangeText={setQuery}
                style={styles.search}
                editable={!disabled}
                autoCorrect={false}
                allowFontScaling={false}
                returnKeyType="search"
            />
            {/* The editor owns scrolling, so the grid has no competing scroll gesture. */}
            <View style={styles.grid}>
                {icons.map((entry) => {
                    const selected = selectedIcon === entry.name;
                    return (
                        <TouchableOpacity
                            key={entry.name}
                            accessibilityRole="button"
                            accessibilityLabel={`Icon ${entry.name}`}
                            accessibilityHint={entry.label}
                            accessibilityState={{ selected }}
                            disabled={disabled}
                            style={[
                                styles.option,
                                selected && { borderColor: Colors.brownText, backgroundColor: color },
                            ]}
                            onPress={() => onChange(entry.name)}
                        >
                            <MaterialCommunityIcons
                                name={entry.name}
                                size={24}
                                color={selected ? foreground : Colors.darkGreenText}
                            />
                            {selected && (
                                <MaterialCommunityIcons name="check" size={12} color={foreground} style={styles.check} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            {icons.length === 0 && <CustomText style={styles.empty}>No matching icons</CustomText>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 10 },
    previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    label: { color: Colors.darkGreenText, fontSize: 12 },
    preview: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    search: {
        minHeight: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        backgroundColor: Colors.white,
        paddingHorizontal: 12,
        color: Colors.darkGreenText,
        fontFamily: "Raleway-Regular",
        fontSize: 14,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: { width: 48, height: 48, borderRadius: 10, borderWidth: 2, borderColor: "#EBEAEC", alignItems: "center", justifyContent: "center" },
    check: { position: "absolute", right: 2, bottom: 2 },
    empty: { color: Colors.gray, fontSize: 12, paddingVertical: 12 },
});
