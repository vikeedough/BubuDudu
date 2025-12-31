import CustomText from "@/components/CustomText";
import { GeneralButton } from "@/components/GeneralButton";
import { Colors } from "@/constants/colors";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
export default function Name() {
    const { profile, updateProfile } = useAuthContext();
    const [name, setName] = useState(profile?.name || "");

    useEffect(() => {
        setName(profile?.name || "");
    }, [profile]);

    const handleSave = async () => {
        if (name.trim() === "") {
            Alert.alert("Name cannot be empty.");
            return;
        }

        if (name !== profile?.name) {
            try {
                await updateProfile({ name });
                Alert.alert("Name saved successfully.");
            } catch (error) {
                Alert.alert("Failed to save name.");
            }
        }
    };

    return (
        <View style={styles.container}>
            <CustomText weight="bold">Name</CustomText>
            <TouchableOpacity style={styles.fieldContainer}>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    style={styles.textInput}
                />
            </TouchableOpacity>
            <GeneralButton
                label="Save"
                onPress={handleSave}
                disabled={name.trim() === "" || name === profile?.name}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: "10%",
    },
    fieldContainer: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.black,
        borderRadius: 12,
        padding: "1%",
        marginBottom: "5%",
    },
    textInput: {
        fontSize: 16,
        fontFamily: "Raleway-Regular",
    },
});
