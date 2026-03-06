import React from "react";
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
} from "react-native";

import CustomText from "@/components/CustomText";

interface AuthFieldProps extends TextInputProps {
    label: string;
    labelStyle?: StyleProp<TextStyle>;
}

const AuthField: React.FC<AuthFieldProps> = ({
    label,
    labelStyle,
    style,
    ...props
}) => {
    return (
        <>
            <CustomText weight="bold" style={[styles.label, labelStyle]}>
                {label}
            </CustomText>
            <TextInput style={[styles.input, style]} {...props} />
        </>
    );
};

export default AuthField;

const styles = StyleSheet.create({
    label: {
        fontSize: 24,
        marginBottom: 20,
    },
    input: {
        width: "80%",
        height: 50,
        borderColor: "gray",
        borderWidth: 1,
        paddingHorizontal: 10,
    },
});
