import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";

import CustomText from "../CustomText";

interface SettingsFieldProps {
    label: string;
    value: string;
    onPress: () => void;
    placeholder?: string;
    disabled?: boolean;
}

export const SettingsField = (props: SettingsFieldProps) => {
    const displayValue = props.value.trim() || props.placeholder || "Not set";

    return (
        <TouchableOpacity
            activeOpacity={0.78}
            disabled={props.disabled}
            onPress={props.onPress}
            style={[styles.fieldContainer, props.disabled && styles.disabled]}
        >
            <View style={styles.copy}>
                <CustomText weight="semibold" style={styles.label}>
                    {props.label}
                </CustomText>
                <CustomText
                    weight="medium"
                    style={[
                        styles.value,
                        !props.value.trim() && styles.placeholder,
                    ]}
                    numberOfLines={2}
                >
                    {displayValue}
                </CustomText>
            </View>
            <CustomText weight="bold" style={styles.chevron}>
                {">"}
            </CustomText>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    fieldContainer: {
        minHeight: 64,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 12,
        backgroundColor: Colors.white,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    copy: {
        flex: 1,
        gap: 5,
    },
    label: {
        color: Colors.darkGreenText,
        fontSize: 13,
    },
    value: {
        color: Colors.black,
        fontSize: 15,
        lineHeight: 19,
    },
    placeholder: {
        color: Colors.gray,
    },
    chevron: {
        color: Colors.brownText,
        fontSize: 16,
    },
    disabled: {
        opacity: 0.55,
    },
});
