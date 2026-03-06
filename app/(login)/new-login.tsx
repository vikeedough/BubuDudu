import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, View } from "react-native";

import { signInWithEmail } from "@/api/endpoints/auth";
import AuthCredentialsFields from "@/components/auth/AuthCredentialsFields";
import { authScreenStyles } from "@/components/auth/authScreenStyles";

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
        <View style={authScreenStyles.container}>
            <AuthCredentialsFields
                email={email}
                password={password}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
            />

            <Button title="Login" onPress={handleLogin} />
        </View>
    );
}
