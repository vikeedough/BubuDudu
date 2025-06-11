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
}
const MilestoneTracker: FC<MilestoneTrackerProps> = ({
    id,
    title,
    date,
    image,
}) => {
    const daysToNextBirthday = getDaysUntilNextBirthday(date);

    return (
        <View style={styles.container}>
            <Image
                source={image}
                style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
                contentFit="cover"
            />
            <CustomText weight="bold" style={styles.date}>
                {daysToNextBirthday}
            </CustomText>
            <CustomText weight="regular" style={styles.daysText}>
                days
            </CustomText>
            <CustomText weight="bold" style={styles.title}>
                {title}
            </CustomText>
        </View>
    );
};

export default MilestoneTracker;

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "black",
        borderRadius: 15,
        padding: 10,
        paddingHorizontal: 20,
        overflow: "hidden",
        width: 160,
        height: 110,
    },
    date: {
        fontSize: 40,
        marginBottom: -15,
    },
    title: {
        fontSize: 17,
        marginTop: 10,
    },
    daysText: {
        fontSize: 17,
    },
});
