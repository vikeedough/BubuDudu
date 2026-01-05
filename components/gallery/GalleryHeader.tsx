import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import Back from "@/assets/svgs/back.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface GalleryHeaderProps {
    onBack: () => void;
    currentDate: string;
}

const GalleryHeader: React.FC<GalleryHeaderProps> = ({
    onBack,
    currentDate,
}) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Back />
            </TouchableOpacity>
            <View>
                <CustomText weight="extrabold" style={styles.headerTitle}>
                    Gallery
                </CustomText>
                <CustomText weight="medium" style={styles.headerDate}>
                    {currentDate}
                </CustomText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
        flexDirection: "row",
        gap: 10,
    },
    backButton: {
        height: 28,
        width: 28,
        backgroundColor: Colors.white,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
        marginTop: 3,
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

export default GalleryHeader;
