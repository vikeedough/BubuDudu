import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

export default function OnboardingName() {
    const router = useRouter();
    const [name, setName] = useState<string>("");

    const handleNext = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            Alert.alert("Name Required", "Please enter your name.");
            return;
        }

        router.push({
            pathname: "/(onboarding)/birthday",
            params: { name: trimmedName },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <CustomText weight="bold" style={styles.title}>
                    Who are you?
                </CustomText>

                <View style={[styles.nameInputContainer, shadowStyle]}>
                    <TextInput
                        allowFontScaling={false}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your Name"
                        placeholderTextColor="#4E6266"
                        style={styles.nameInput}
                        autoCapitalize="words"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, shadowStyle]}
                    onPress={handleNext}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        Next
                    </CustomText>
                </TouchableOpacity>
            </View>

            <DebonLyingDown width={220} height={170} style={styles.debon} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 20,
        color: Colors.darkGreenText,
        marginBottom: 28,
    },
    nameInputContainer: {
        width: "50%",
        height: 46,
        borderRadius: 15,
        backgroundColor: "#8DBBC6",
        justifyContent: "center",
        marginBottom: 34,
    },
    nameInput: {
        paddingHorizontal: 22,
        fontFamily: "Raleway-Bold",
        fontSize: 20,
        color: "#2A4B51",
        textAlign: "center",
    },
    button: {
        backgroundColor: "#FFBA50",
        borderRadius: 15,
        paddingVertical: 14,
        width: "70%",
        alignItems: "center",
    },
    buttonText: {
        color: Colors.brownText,
        fontSize: 20,
    },
    debon: {
        position: "absolute",
        left: -18,
        bottom: -8,
    },
});
