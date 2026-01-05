import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { fetchSpaceInvite } from "@/api/endpoints";
import { SpaceInvite } from "@/api/endpoints/types";

import CustomText from "../CustomText";
import { GeneralButton } from "../GeneralButton";

export const InviteCode = () => {
    const [invite, setInvite] = useState<SpaceInvite | null>(null);

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
    };

    const getCode = async () => {
        const fetchedInvite = await fetchSpaceInvite();
        setInvite(fetchedInvite);
    };

    useEffect(() => {
        getCode();
    }, []);

    return (
        <View style={styles.container}>
            <CustomText>Get your partner to join your Space!</CustomText>
            <CustomText weight="bold" style={styles.inviteCodeText}>
                {invite ? invite.code : "Loading..."}
            </CustomText>
            <GeneralButton
                label="Copy Code"
                onPress={() => copyToClipboard(invite ? invite.code : "")}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
    },
    inviteCodeText: {
        marginVertical: 10,
    },
});
