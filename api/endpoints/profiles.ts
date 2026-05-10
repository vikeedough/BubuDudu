import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import { supabase } from "../clients/supabaseClient";
import { Profile } from "./types";

type SpaceMemberWithProfile = {
    user_id: string;
    profiles: Profile | null;
};

const upsertProfileFields = async (
    userId: string,
    patch: Partial<Profile>
): Promise<boolean> => {
    const { data: updatedRow, error: updateError } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select("id")
        .maybeSingle();

    if (updateError) {
        console.error("Error updating profile:", updateError.message);
        return false;
    }

    if (updatedRow) {
        return true;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        ...patch,
    });
    if (insertError) {
        console.error("Error creating missing profile:", insertError.message);
        return false;
    }

    return true;
};

export const fetchProfiles = async (spaceId: string): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from("space_members")
        .select(
            "user_id, profiles:profiles(id, name, avatar_url, avatar_border_color, created_at, note, note_updated_at, date_of_birth)"
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
    const saved = await upsertProfileFields(userId, { name });
    if (!saved) {
        console.error("Error updating user name");
        return null;
    }

    return true;
};

export const updateProfileNote = async (note: string) => {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
        console.error("Error getting user:", userErr?.message);
        return false;
    }

    const userId = userRes.user.id;
    const saved = await upsertProfileFields(userId, {
        note,
        note_updated_at: new Date().toISOString(),
    });
    if (!saved) {
        console.error("Error updating note");
        return false;
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

    const saved = await upsertProfileFields(userId, { avatar_url: publicUrl });
    if (!saved) {
        console.error("Error updating user avatar");
        return null;
    }

    return publicUrl;
};

export const updateProfileAvatarBorderColor = async (
    avatarBorderColor: string
) => {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
        console.error("Error getting user:", userErr?.message);
        return false;
    }

    const userId = userRes.user.id;
    const saved = await upsertProfileFields(userId, {
        avatar_border_color: avatarBorderColor,
    });
    if (!saved) {
        console.error("Error updating avatar border color");
        return false;
    }

    return true;
};
