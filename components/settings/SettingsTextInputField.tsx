import React from "react";
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface SettingsTextInputFieldProps extends TextInputProps {
    label: string;
}

export const SettingsTextInputField: React.FC<SettingsTextInputFieldProps> = ({
    label,
    style,
    ...props
}) => {
    return (
        <View style={styles.container}>
            <CustomText weight="semibold" style={styles.label}>
                {label}
            </CustomText>
            <View style={styles.fieldContainer}>
                <TextInput
                    allowFontScaling={false}
                    placeholderTextColor={Colors.gray}
                    style={[styles.textInput, style]}
                    {...props}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    label: {
        color: Colors.darkGreenText,
        fontSize: 14,
    },
    fieldContainer: {
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 12,
        backgroundColor: Colors.white,
        minHeight: 46,
        justifyContent: "center",
    },
    textInput: {
        fontSize: 16,
        fontFamily: "Raleway-Regular",
        color: Colors.black,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
});
