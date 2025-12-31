import { StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "./CustomText";

interface GeneralButtonProps {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

export const GeneralButton = ({
    label,
    onPress,
    disabled,
}: GeneralButtonProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.container}
            disabled={disabled}
        >
            <CustomText weight="semibold">{label}</CustomText>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFCC7D",
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        paddingHorizontal: "20%",
        paddingVertical: "3%",
    },
});
