import { signUpWithEmail } from "@/api/endpoints";
import CustomText from "@/components/CustomText";
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

export default function NewLogin() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const handleSignUp = () => {
        if (password.length === 0 || password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        signUpWithEmail(email, password);
    };

    return (
        <View style={styles.container}>
            <CustomText weight="bold" style={styles.formEmail}>
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
