import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

interface CustomTextProps extends TextProps {
    weight?: "regular" | "medium" | "semibold" | "bold" | "extrabold";
}

const fontMap = {
    regular: "Baloo2-Regular",
    medium: "Baloo2-Medium",
    semibold: "Baloo2-SemiBold",
    bold: "Baloo2-Bold",
    extrabold: "Baloo2-ExtraBold",
};

const CustomText: React.FC<CustomTextProps> = ({
    children,
    style,
    weight = "regular",
    ...props
}) => {
    return (
        <Text
            style={[styles.text, { fontFamily: fontMap[weight] }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    text: {
        fontSize: 16,
        color: "#000",
    },
});

export default CustomText;
