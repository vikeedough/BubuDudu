import { supabase } from "@/api/clients/supabaseClient";
import { Button } from "react-native";

async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Error signing out:", error.message);
    }
}

export default function SignOutButton() {
    return <Button title="Sign Out" onPress={signOut} />;
}
