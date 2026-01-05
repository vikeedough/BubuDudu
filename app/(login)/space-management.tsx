import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

import CustomText from "@/components/CustomText";
import { getSpaceId } from "@/utils/secure-store";
import { createSpace, joinSpace } from "@/utils/space-management";

export default function SpaceManagementPage() {
    const router = useRouter();
    const [inviteCode, setInviteCode] = useState<string>("");

    const handleCreateSpace = async () => {
        const result = await createSpace("BubuDudu");
        if (result) {
            router.replace("/(tabs)/initial");
        }
    };

    const handleJoinSpace = async () => {
        const result = await joinSpace(inviteCode);
        if (result) {
            router.replace("/(tabs)/initial");
        }
    };

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
                    handleJoinSpace();
                }}
            />
            <CustomText weight="bold" style={{ fontSize: 24, marginTop: 40 }}>
                Or create a new Space to get started!
            </CustomText>
            <Button
                title="Create New Space"
                onPress={() => {
                    // rmb to change
                    handleCreateSpace();
                }}
            />
            <Button
                title="check current space id"
                onPress={async () => {
                    const spaceId = await getSpaceId();
                    alert(`Current space ID: ${spaceId}`);
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
