import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "../clients/supabaseClient";

const fetchUsers = async () => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data;
};

const updateNote = async (note: string, user_id: number) => {
    const { error } = await supabase
        .from("users")
        .update({ note: note, note_updated_at: new Date().toISOString() })
        .eq("id", user_id);

    if (error) {
        console.error("Error updating note:", error);
        return false;
    }

    return true;
};

const uploadAvatarAndUpdateUser = async (user_id: number, fileUri: string) => {
    const fileName = `${user_id}-${Date.now()}-avatar.jpg`;

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
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user_id);

    if (updateError) {
        console.error("Error updating user avatar:", updateError.message);
        return null;
    }

    return publicUrl;
};

export { fetchUsers, updateNote, uploadAvatarAndUpdateUser };
