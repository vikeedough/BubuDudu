import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";

import CustomText from "../CustomText";

interface SettingsFieldProps {
    label: string;
    value: string;
    onPress: () => void;
}

export const SettingsField = (props: SettingsFieldProps) => {
    return (
        <View style={styles.mainContainer}>
            <CustomText weight="semibold">{props.label}</CustomText>
            <TouchableOpacity
                style={styles.fieldContainer}
                onPress={props.onPress}
            >
                <CustomText>{props.value}</CustomText>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: "5%",
    },
    fieldContainer: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.black,
        borderRadius: 12,
        padding: "2%",
    },
});
