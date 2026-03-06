import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, View } from "react-native";

import { signUpWithEmail } from "@/api/endpoints";
import AuthField from "@/components/auth/AuthField";
import { DatePickerField } from "@/components/settings/DatePickerField";
import { convertToDisplayDate, dateToYYYYMMDD } from "@/utils/settings";

export default function NewLogin() {
    const router = useRouter();
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [date, setDate] = useState<Date>(new Date());

    const handleSignUp = async () => {
        if (password.length === 0 || password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        const selectedDate = dateToYYYYMMDD(date);
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
            <AuthField
                label="Name"
                labelStyle={styles.formEmail}
                placeholder="Enter your name"
                keyboardType="default"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
            />

            <DatePickerField
                label="Date of Birth"
                value={convertToDisplayDate(date)}
                date={date}
                onDateChange={setDate}
            />

            <AuthField
                label="Email"
                labelStyle={styles.formPassword}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <AuthField
                label="Password"
                labelStyle={styles.formPassword}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <AuthField
                label="Confirm Password"
                labelStyle={styles.formPassword}
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
        marginTop: 20,
    },
});
