import { signInWithEmail } from "@/api/endpoints/auth";
import CustomText from "@/components/CustomText";
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

export default function NewLogin() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

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

            <Button
                title="Login"
                onPress={() => signInWithEmail(email, password)}
            />
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
