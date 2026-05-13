import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { fetchSpaceInvite } from "@/api/endpoints";
import { SpaceInvite } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

import CustomText from "../CustomText";

export const InviteCode = () => {
    const [invite, setInvite] = useState<SpaceInvite | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        setIsCopied(true);
    };

    const getCode = async () => {
        const fetchedInvite = await fetchSpaceInvite();
        setInvite(fetchedInvite);
    };

    useEffect(() => {
        getCode();
    }, []);

    useEffect(() => {
        if (!isCopied) return;
        const timeoutId = setTimeout(() => setIsCopied(false), 1600);
        return () => clearTimeout(timeoutId);
    }, [isCopied]);

    return (
        <View style={styles.container}>
            <View style={styles.copy}>
                <CustomText weight="semibold" style={styles.title}>
                    Invite Code
                </CustomText>
                <CustomText weight="medium" style={styles.caption}>
                    Get your partner to join your Space.
                </CustomText>
            </View>
            <View style={styles.codeRow}>
                <View style={styles.codePill}>
                    <CustomText weight="bold" style={styles.inviteCodeText}>
                        {invite ? invite.code : "Loading..."}
                    </CustomText>
                </View>
                <TouchableOpacity
                    activeOpacity={0.78}
                    disabled={!invite}
                    style={[styles.copyButton, !invite && styles.disabled]}
                    onPress={() => copyToClipboard(invite ? invite.code : "")}
                >
                    <CustomText weight="semibold" style={styles.copyButtonText}>
                        {isCopied ? "Copied" : "Copy"}
                    </CustomText>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 16,
        gap: 14,
        ...shadowStyle,
    },
    copy: {
        gap: 4,
    },
    title: {
        color: Colors.darkGreenText,
        fontSize: 16,
    },
    caption: {
        color: Colors.darkGreenText,
        fontSize: 12,
        opacity: 0.68,
    },
    codeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    codePill: {
        flex: 1,
        minHeight: 42,
        borderRadius: 12,
        backgroundColor: "#FFF5E7",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    inviteCodeText: {
        color: Colors.brownText,
        fontSize: 18,
    },
    copyButton: {
        minHeight: 42,
        minWidth: 74,
        borderRadius: 12,
        backgroundColor: "#FFCC7D",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    copyButtonText: {
        color: Colors.brownText,
        fontSize: 13,
    },
    disabled: {
        opacity: 0.55,
    },
});
