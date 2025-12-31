import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import { supabase } from "../clients/supabaseClient";
import { Profile } from "./types";

type SpaceMemberWithProfile = {
    user_id: string;
    profiles: Profile | null;
};

export const fetchProfiles = async (spaceId: string): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from("space_members")
        .select(
            "user_id, profiles:profiles(id, name, avatar_url, created_at, note, note_updated_at, date_of_birth)"
        )
        .eq("space_id", spaceId);

    if (error) {
        Alert.alert("Error fetching profiles:", error.message);
        return [];
    }

    const rows = (data ?? []) as unknown as SpaceMemberWithProfile[];
    return rows.map((r) => r.profiles).filter((p): p is Profile => Boolean(p));
};

export const updateProfileName = async (name: string) => {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
        console.error("Error getting user:", userErr?.message);
        return null;
    }

    const userId = userRes.user.id;

    const { error: updateError } = await supabase
        .from("profiles")
        .update({ name: name })
        .eq("id", userId);

    if (updateError) {
        console.error("Error updating user name:", updateError.message);
        return null;
    }

    return true;
};

export const uploadAvatarAndUpdateUser = async (fileUri: string) => {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
        console.error("Error getting user:", userErr?.message);
        return null;
    }

    const userId = userRes.user.id;
    const fileName = `${userId}-${Date.now()}-avatar.jpg`;

    // Read the file as base64
    const file = new FileSystem.File(fileUri);
    const base64 = await file.base64();

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, arrayBuffer, {
            contentType: "image/jpeg",
        });

    if (uploadError) {
        console.error("Error uploading avatar:", uploadError.message);
        return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

    if (updateError) {
        console.error("Error updating user avatar:", updateError.message);
        return null;
    }

    return publicUrl;
};
