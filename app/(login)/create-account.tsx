import { signUpWithEmail } from "@/api/endpoints";
import CustomText from "@/components/CustomText";
import { SettingsField } from "@/components/settings/SettingsField";
import { convertToDisplayDate, dateToYYYYMMDD } from "@/utils/settings";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

export default function NewLogin() {
    const router = useRouter();
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [date, setDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(
        dateToYYYYMMDD(new Date())
    );
    const [displayedDate, setDisplayedDate] = useState<string>(
        convertToDisplayDate(new Date())
    );
    const [showPicker, setShowPicker] = useState(false);

    const handleSignUp = async () => {
        if (password.length === 0 || password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        const result = await signUpWithEmail(
            name,
            selectedDate,
            email,
            password
        );

        if (result) {
            router.replace("/(login)/space-management");
        }
    };

    return (
        <View style={styles.container}>
            <CustomText weight="bold" style={styles.formEmail}>
                Name
            </CustomText>

            <TextInput
                style={styles.input}
                placeholder="Enter your name"
                keyboardType="default"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
            />

            <SettingsField
                label="Date of Birth"
                value={displayedDate}
                onPress={() => setShowPicker(true)}
            />

            {showPicker && (
                <DateTimePicker
                    value={date ? date : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        if (date) {
                            setDate(date);
                            setDisplayedDate(convertToDisplayDate(date));
                            setSelectedDate(dateToYYYYMMDD(date));
                            setShowPicker(false);
                        }
                    }}
                />
            )}

            <CustomText weight="bold" style={styles.formPassword}>
                Email
            </CustomText>

            <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <CustomText weight="bold" style={styles.formPassword}>
                Password
            </CustomText>
            <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <CustomText weight="bold" style={styles.formPassword}>
                Confirm Password
            </CustomText>
            <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            <Button title="Create Account" onPress={handleSignUp} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    formEmail: {
        fontSize: 24,
        marginBottom: 20,
    },
    formPassword: {
        fontSize: 24,
        marginTop: 20,
        marginBottom: 20,
    },
    input: {
        width: "80%",
        height: 50,
        borderColor: "gray",
        borderWidth: 1,
        paddingHorizontal: 10,
    },
});
