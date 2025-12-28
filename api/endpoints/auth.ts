import { deleteSpaceId, setSpaceId } from "@/utils/secure-store";
import { Alert } from "react-native";
import { supabase } from "../clients/supabaseClient";

export async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        Alert.alert("Login Error", error.message);
        return null;
    }

    const userId = data.user?.id;
    if (!userId) {
        Alert.alert("Login Error", "No user returned after login.");
        return null;
    }

    const { data: membership, error: membershipError } = await supabase
        .from("space_members")
        .select("space_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

    if (membershipError) {
        Alert.alert("Space Error", membershipError.message);
        return data;
    }

    if (!membership?.space_id) {
        await deleteSpaceId(); // user has no space yet → show create/join screen
        return data;
    }

    await setSpaceId(membership.space_id);
    return data;
}

export async function signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        Alert.alert("Sign Up Error", error.message);
        return null;
    }
    if (!data.user) {
        Alert.alert("Sign Up Error", "User data is missing after sign up.");
        return null;
    }

    const { data: s } = await supabase.auth.getSession();
    console.log("session uid", s.session?.user?.id);
    console.log("signup uid", data.user?.id);

    const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id });

    if (profileError) {
        Alert.alert("Profile Error", profileError.message);
        return null;
    }

    return data;
}
