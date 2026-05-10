import React from "react";
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

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
            <CustomText weight="medium" style={[styles.label, labelStyle]}>
                {label}
            </CustomText>
            <TextInput
                style={[styles.input, style]}
                allowFontScaling={false}
                {...props}
            />
        </>
    );
};

export default AuthField;

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        marginBottom: 5,
        color: "#797878",
        paddingHorizontal: 10,
    },
    input: {
        width: "100%",
        height: 40,
        paddingHorizontal: 20,
        backgroundColor: Colors.white,
        borderRadius: 38,
        fontFamily: "Raleway-Regular",
        color: "#AFAFAF",
        fontSize: 14,
    },
});
