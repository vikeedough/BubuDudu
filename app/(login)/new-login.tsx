import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, View } from "react-native";

import { signInWithEmail } from "@/api/endpoints/auth";
import AuthField from "@/components/auth/AuthField";

export default function NewLogin() {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleLogin = async () => {
        const result = await signInWithEmail(email, password);
        if (result) {
            router.replace("/(tabs)/initial");
        }
    };

    return (
        <View style={styles.container}>
            <AuthField
                label="Email"
                labelStyle={styles.formEmail}
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

            <Button title="Login" onPress={handleLogin} />
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
