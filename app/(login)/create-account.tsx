import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, View } from "react-native";

import { signUpWithEmail } from "@/api/endpoints";
import AuthCredentialsFields from "@/components/auth/AuthCredentialsFields";
import AuthField from "@/components/auth/AuthField";
import { authScreenStyles } from "@/components/auth/authScreenStyles";
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
        <View style={authScreenStyles.container}>
            <AuthField
                label="Name"
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

            <AuthCredentialsFields
                email={email}
                password={password}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                emailLabelStyle={authScreenStyles.fieldSpacing}
                includeConfirmPassword
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={setConfirmPassword}
            />

            <Button title="Create Account" onPress={handleSignUp} />
        </View>
    );
}
