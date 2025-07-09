import Colors from "@/constants/colors";
import { getDaysUntilNextBirthday } from "@/utils/home";
import { Image } from "expo-image";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "../CustomText";

interface MilestoneTrackerProps {
    id: number;
    title: string;
    date: string;
    image: any;
    milestoneKey: number;
}
const MilestoneTracker: FC<MilestoneTrackerProps> = ({
    id,
    title,
    date,
    image,
    milestoneKey,
}) => {
    const daysToNextBirthday = getDaysUntilNextBirthday(date);

    return (
        // <View style={styles.shadowContainer}>
        <View
            style={[
                styles.container,
                milestoneKey === 0 && { backgroundColor: Colors.lightBlue },
                milestoneKey === 1 && { backgroundColor: Colors.pink },
                milestoneKey === 2 && styles.anniversaryContainer,
            ]}
        >
            <View
                style={[
                    styles.imageContainer,
                    milestoneKey === 2 && styles.anniversaryImageContainer,
                ]}
            >
                <Image
                    source={image}
                    style={[StyleSheet.absoluteFill, { opacity: 0.8 }]}
                    contentFit="cover"
                />
                <View style={styles.dateContainer}>
                    <CustomText weight="bold" style={styles.date}>
                        {daysToNextBirthday}
                    </CustomText>
                    <CustomText weight="semibold" style={styles.daysText}>
                        days
                    </CustomText>
                </View>
            </View>

            <CustomText weight="bold" style={styles.title}>
                {title}
            </CustomText>
        </View>
        // </View>
    );
};

export default MilestoneTracker;

const styles = StyleSheet.create({
    shadowContainer: {
        backgroundColor: "white",
        borderRadius: 15,
        width: 159,
        height: 105,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
    },
    container: {
        alignItems: "center",
        justifyContent: "center",
        borderColor: "black",
        borderRadius: 15,
        padding: 25,
        paddingHorizontal: 5,
        overflow: "hidden",
        width: 160,
        height: 110,
    },
    date: {
        fontSize: 24,
        zIndex: 100,
        textAlign: "center",
    },
    title: {
        fontSize: 14,
        position: "absolute",
        bottom: 7,
        zIndex: 100,
        color: Colors.white,
    },
    daysText: {
        fontSize: 12,
        zIndex: 100,
        textAlign: "center",
    },
    anniversaryContainer: {
        width: 225,
        backgroundColor: Colors.hotPink,
    },
    imageContainer: {
        height: 72,
        width: 149,
        position: "absolute",
        top: 5,
        borderRadius: 15,
        overflow: "hidden",
    },
    anniversaryImageContainer: {
        width: 215,
    },
    dateContainer: {
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        zIndex: 100,
    },
});
