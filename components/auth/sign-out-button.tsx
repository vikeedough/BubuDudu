import { supabase } from "@/api/clients/supabaseClient";
import { deleteSpaceId } from "@/utils/secure-store";
import { useRouter } from "expo-router";
import { Button } from "react-native";

export default function SignOutButton() {
    const router = useRouter();

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        await deleteSpaceId();
        if (error) {
            console.error("Error signing out:", error.message);
        }
    };

    return <Button title="Sign Out" onPress={handleSignOut} />;
}
