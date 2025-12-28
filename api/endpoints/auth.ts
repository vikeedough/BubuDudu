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

    const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id });

    if (profileError) {
        Alert.alert("Profile Error", profileError.message);
        return null;
    }

    return data;
}
