import React from "react";
import { StyleSheet, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface WheelHeaderProps {
    currentDate: string;
}

const WheelHeader: React.FC<WheelHeaderProps> = ({ currentDate }) => {
    return (
        <View style={styles.header}>
            <CustomText weight="extrabold" style={styles.headerTitle}>
                Wheel
            </CustomText>
            <CustomText weight="medium" style={styles.headerDate}>
                {currentDate}
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        marginLeft: 15,
        paddingHorizontal: 25,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    headerDate: {
        fontSize: 12,
        color: Colors.darkGreenText,
    },
});

export default WheelHeader;
