import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import CustomText from "@/components/CustomText";
import InlineWheelDatePicker from "@/components/InlineWheelDatePicker";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";
import { dateToYYYYMMDD } from "@/utils/settings";

function resolveName(nameParam?: string | string[]): string {
    if (Array.isArray(nameParam)) {
        return nameParam[0] ?? "";
    }
    return nameParam ?? "";
}

export default function OnboardingBirthday() {
    const router = useRouter();
    const params = useLocalSearchParams<{ name?: string }>();
    const name = resolveName(params.name).trim();

    const [date, setDate] = useState<Date>(new Date());

    const handleNext = async () => {
        if (!name) {
            Alert.alert("Name Missing", "Please enter your name first.");
            router.replace("/(onboarding)/name");
            return;
        }

        router.push({
            pathname: "/(onboarding)",
            params: { name, date: dateToYYYYMMDD(date) },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <CustomText weight="bold" style={styles.title}>
                    Your Birthday?
                </CustomText>

                <View style={[styles.datePickerContainer, shadowStyle]}>
                    <InlineWheelDatePicker
                        value={date}
                        onChange={setDate}
                        minYear={1900}
                        maxYear={new Date().getFullYear()}
                        cardColor="#FFFFFF"
                        highlightColor="#EEF0EB"
                        textColor={Colors.darkGreenText}
                        dimTextColor="rgba(80,87,57,0.28)"
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
    datePickerContainer: {
        width: "100%",
        maxWidth: 330,
        borderRadius: 10,
        backgroundColor: Colors.white,
        padding: 10,
        marginBottom: 34,
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
