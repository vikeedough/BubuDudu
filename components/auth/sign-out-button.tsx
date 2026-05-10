import { Button } from "react-native";

import { supabase } from "@/api/clients/supabaseClient";
import { clearOfflineData } from "@/utils/offline/local-db";
import { deleteSpaceId } from "@/utils/secure-store";

export default function SignOutButton() {
    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        await clearOfflineData();
        await deleteSpaceId();
        if (error) {
            console.error("Error signing out:", error.message);
        }
    };

    return <Button title="Sign Out" onPress={handleSignOut} />;
}
