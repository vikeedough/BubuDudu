import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import React from "react";
import { StyleSheet, View } from "react-native";

interface GalleryListHeaderProps {
    currentDate: string;
}

const GalleryListHeader: React.FC<GalleryListHeaderProps> = ({
    currentDate,
}) => {
    return (
        <View style={styles.header}>
            <CustomText weight="extrabold" style={styles.headerTitle}>
                Gallery
            </CustomText>
            <CustomText weight="medium" style={styles.headerDate}>
                {currentDate}
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
        marginLeft: 15,
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

export default GalleryListHeader;
