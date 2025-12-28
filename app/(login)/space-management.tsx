import CustomText from "@/components/CustomText";
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

export default function SpaceManagementPage() {
    const [inviteCode, setInviteCode] = useState<string>("");

    return (
        <View style={styles.container}>
            <CustomText weight="bold" style={{ fontSize: 24 }}>
                Already have a Space? Enter your partner's invite code to join
                them!
            </CustomText>
            <TextInput
                style={styles.inviteCodeInput}
                placeholder="Enter invite code"
                value={inviteCode}
                onChangeText={setInviteCode}
            />
            <Button
                title="Join Space"
                onPress={() => {
                    /* handle join space logic */
                }}
            />
            <CustomText weight="bold" style={{ fontSize: 24, marginTop: 40 }}>
                Or create a new Space to get started!
            </CustomText>
            <Button
                title="Create New Space"
                onPress={() => {
                    /* handle create space logic */
                }}
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
    inviteCodeInput: {
        width: "80%",
        height: 50,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 10,
    },
});
