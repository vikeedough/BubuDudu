import { supabase } from "../clients/supabaseClient";

const fetchMilestones = async () => {
    const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching milestones:", error);
        return [];
    }

    return data;
};

const fetchQuotes = async () => {
    const { data, error } = await supabase.from("quotes").select("*");

    if (error) {
        console.error("Error fetching quotes:", error);
        return [];
    }

    return data;
};

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

const fetchLists = async () => {
    const { data, error } = await supabase.from("lists").select("*");

    if (error) {
        console.error("Error fetching lists:", error);
        return [];
    }

    return data;
};

const fetchGalleries = async () => {
    const { data, error } = await supabase.from("galleries").select("*");

    if (error) {
        console.error("Error fetching galleries:", error);
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

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, {
            uri: fileUri,
            type: "image/jpeg",
            name: fileName,
        } as any);

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

const addNewList = async (type: string) => {
    const { error } = await supabase.from("lists").insert({ type: type });

    if (error) {
        console.error("Error adding new list:", error.message);
        return false;
    }

    return true;
};

const deleteList = async (list_id: string) => {
    const { error } = await supabase.from("lists").delete().eq("id", list_id);

    if (error) {
        console.error("Error deleting list:", error.message);
        return false;
    }

    return true;
};

const updateList = async (list_id: string, type: string, content: string) => {
    const { error } = await supabase
        .from("lists")
        .update({ type: type, content: content })
        .eq("id", list_id);

    if (error) {
        console.error("Error updating list content:", error.message);
        return false;
    }

    return true;
};

const addNewGallery = async (title: string, date: string) => {
    const { error } = await supabase
        .from("galleries")
        .insert({ title: title, date: date });

    if (error) {
        console.error("Error adding new gallery:", error.message);
        return false;
    }

    return true;
};

const getGalleryId = async (title: string) => {
    const { data, error } = await supabase
        .from("galleries")
        .select("id")
        .eq("title", title);

    if (error) {
        console.error("Error getting gallery id:", error.message);
        return null;
    }

    return data[0].id;
};

const uploadGalleryImages = async (gallery_id: string, images: string[]) => {
    console.log("Starting upload for gallery:", gallery_id);
    console.log("Number of images to upload:", images.length);

    const folderName = `${gallery_id}`;
    let count = 0;
    for (const image of images) {
        console.log(`Uploading image ${count + 1}/${images.length}:`, image);
        const fileName = `${count}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from("gallery")
            .upload(`${folderName}/${fileName}`, {
                uri: image,
                type: "image/jpeg",
                name: fileName,
            } as any);

        if (uploadError) {
            console.error(
                "Error uploading gallery images:",
                uploadError.message
            );
            return false;
        }

        console.log(`Successfully uploaded: ${folderName}/${fileName}`);

        const { data } = supabase.storage
            .from("gallery")
            .getPublicUrl(`${folderName}/${fileName}`);
        const publicUrl = data.publicUrl;

        console.log("Public URL:", publicUrl);

        const { data: insertData, error: updateError } = await supabase
            .from("date_images")
            .insert([
                {
                    gallery_id: gallery_id,
                    url: publicUrl,
                    created_at: new Date().toISOString(),
                },
            ]);
        console.log("Insert data:", insertData);
        console.log("Insert error:", updateError);

        console.log(`Successfully inserted image record for: ${fileName}`);
        count++;
    }

    console.log("All images uploaded successfully!");
    return true;
};

const fetchGalleryImages = async (gallery_id: string) => {
    const { data, error } = await supabase
        .from("date_images")
        .select("*")
        .eq("gallery_id", gallery_id);

    if (error) {
        console.error("Error fetching gallery images:", error.message);
        return [];
    }

    return data;
};

export {
    addNewGallery,
    addNewList,
    deleteList,
    fetchGalleries,
    fetchGalleryImages,
    fetchLists,
    fetchMilestones,
    fetchQuotes,
    fetchUsers,
    getGalleryId,
    updateList,
    updateNote,
    uploadAvatarAndUpdateUser,
    uploadGalleryImages,
};
