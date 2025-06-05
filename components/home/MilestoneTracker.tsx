import React, { FC } from "react";
import { View, Text } from "react-native";

interface MilestoneTrackerProps {
    id: number;
    title: string;
    date: string;
}
const MilestoneTracker: FC<MilestoneTrackerProps> = ({ id, title, date }) => {
    return (
        <View>
            <Text>{title}</Text>
            <Text>{date}</Text>
        </View>
    );
};

export default MilestoneTracker;
