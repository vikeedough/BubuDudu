import { FC } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Choice } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";

import CustomText from "../CustomText";

interface ChoiceItemProps {
    choice: Choice;
}

const ChoiceItem: FC<ChoiceItemProps> = ({ choice }) => {
    return (
        <View style={styles.container}>
            <CustomText>{choice.choice}</CustomText>
            <TouchableOpacity>
                <CustomText>X</CustomText>
            </TouchableOpacity>
        </View>
    );
};

export default ChoiceItem;

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: Colors.white,
        borderRadius: 15,
        marginHorizontal: 5,
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 5,
    },
});
