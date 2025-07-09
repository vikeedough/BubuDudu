import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

interface CustomTextProps extends TextProps {
    weight?: "regular" | "medium" | "semibold" | "bold" | "extrabold";
}

const fontMap = {
    regular: "Raleway-Regular",
    medium: "Raleway-Medium",
    semibold: "Raleway-SemiBold",
    bold: "Raleway-Bold",
    extrabold: "Raleway-ExtraBold",
};

const CustomText: React.FC<CustomTextProps> = ({
    children,
    style,
    weight = "regular",
    ...props
}) => {
    return (
        <Text
            allowFontScaling={false}
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
