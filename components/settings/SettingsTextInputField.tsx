import React from "react";
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
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
        <>
            <CustomText weight="bold">{label}</CustomText>
            <TouchableOpacity style={styles.fieldContainer}>
                <TextInput style={[styles.textInput, style]} {...props} />
            </TouchableOpacity>
        </>
    );
};

const styles = StyleSheet.create({
    fieldContainer: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.black,
        borderRadius: 12,
        padding: "1%",
        marginBottom: "5%",
    },
    textInput: {
        fontSize: 16,
        fontFamily: "Raleway-Regular",
    },
});
