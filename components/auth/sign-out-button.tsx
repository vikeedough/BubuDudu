import {
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from "react-native";

import { supabase } from "@/api/clients/supabaseClient";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { clearOfflineData } from "@/utils/offline/local-db";
import { deleteSpaceId } from "@/utils/secure-store";

interface SignOutButtonProps {
    style?: StyleProp<ViewStyle>;
}

export default function SignOutButton({ style }: SignOutButtonProps) {
    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        await clearOfflineData();
        await deleteSpaceId();
        if (error) {
            console.error("Error signing out:", error.message);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.78}
            onPress={handleSignOut}
            style={[styles.button, style]}
        >
            <CustomText weight="semibold" style={styles.text}>
                Sign Out
            </CustomText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: `${Colors.red}55`,
        borderRadius: 12,
        backgroundColor: Colors.white,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
    },
    text: {
        color: Colors.red,
        fontSize: 14,
    },
});
