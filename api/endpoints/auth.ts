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

export async function signUpWithEmail(
    name: string,
    date_of_birth: string,
    email: string,
    password: string
) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                date_of_birth,
            },
        },
    });

    if (error) {
        Alert.alert("Sign Up Error", error.message);
        return null;
    }

    if (!data.user) {
        Alert.alert("Sign Up Error", "User missing after signup");
        return null;
    }

    if (data.session) {
        await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });
    }

    const { data: s } = await supabase.auth.getSession();
    if (!s.session?.user?.id) {
        Alert.alert("Auth Error", "Session not active after signup");
        return null;
    }

    const userId = s.session.user.id;

    return data;
}
