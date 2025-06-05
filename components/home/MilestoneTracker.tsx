import { getDaysUntilNextBirthday } from "@/utils/home";
import { Image } from "expo-image";
import React, { FC } from "react";
import { View, Text, StyleSheet } from "react-native";

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
            <Text style={styles.date}>{daysToNextBirthday}</Text>
            <Text style={styles.daysText}>days</Text>
            <Text style={styles.title}>{title}</Text>
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
        fontWeight: 700,
        marginBottom: -10,
    },
    title: {
        fontSize: 17,
        fontWeight: 700,
        marginTop: 10,
    },
    daysText: {
        fontSize: 17,
        fontWeight: 600,
    },
});
