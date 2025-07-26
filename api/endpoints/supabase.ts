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
    const { data, error } = await supabase
        .from("lists")
        .select("*")
        .order("last_updated_at", { ascending: true });

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

const fetchWheels = async () => {
    const { data, error } = await supabase.from("wheel").select("*");

    if (error) {
        console.error("Error fetching wheels: ", error);
        return [];
    }

    return data;
};

const updateWheel = async (wheel_id: string, choices: string[]) => {
    const { error } = await supabase
        .from("wheel")
        .update({ choices: choices })
        .eq("id", wheel_id);

    if (error) {
        console.error("Error updating wheel:", error);
        return false;
    }

    return true;
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

const addNewList = async (type: string, content: string) => {
    const { error } = await supabase.from("lists").insert({
        type: type,
        content: content,
        last_updated_at: new Date().toISOString(),
    });

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
        .update({
            type: type,
            content: content,
            last_updated_at: new Date().toISOString(),
        })
        .eq("id", list_id);

    if (error) {
        console.error("Error updating list content:", error.message);
        return false;
    }

    return true;
};

const updateWheelTitle = async (wheel_id: string, title: string) => {
    const { error } = await supabase
        .from("wheel")
        .update({ title: title })
        .eq("id", wheel_id);

    if (error) {
        console.error("Error updating wheel title:", error.message);
        return false;
    }

    return true;
};

const addNewWheel = async (title: string, choices: string[]) => {
    const { error } = await supabase.from("wheel").insert({
        title: title,
        choices: choices,
    });

    if (error) {
        console.error("Error adding new wheel:", error.message);
        return false;
    }

    return true;
};

const addNewGallery = async (
    title: string,
    date: string,
    color: string,
    location: string
) => {
    const { error } = await supabase.from("galleries").insert({
        title: title,
        date: date,
        color: color,
        location: location,
    });

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
    const folderName = `${gallery_id}`;
    let hasUploadedFirstImage = false;

    // Fetch the gallery to check if cover_image is already set
    const { data: galleryData, error: galleryError } = await supabase
        .from("galleries")
        .select("cover_image")
        .eq("id", gallery_id)
        .single();

    if (galleryError) {
        console.error(
            "Error fetching gallery for cover_image check:",
            galleryError.message
        );
        return false;
    }

    const hasCoverImage = !!galleryData?.cover_image;

    for (const image of images) {
        const timestamp = Date.now();
        const fileName = `${timestamp}.jpg`;
        console.log("uploading image", image);

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

        const { data } = supabase.storage
            .from("gallery")
            .getPublicUrl(`${folderName}/${fileName}`);
        const publicUrl = data.publicUrl;

        const { data: insertData, error: updateError } = await supabase
            .from("date_images")
            .insert([
                {
                    id: timestamp.toString(),
                    gallery_id: gallery_id,
                    url: publicUrl,
                    created_at: new Date().toISOString(),
                },
            ]);

        if (!hasUploadedFirstImage) {
            hasUploadedFirstImage = true;
            // Only update cover_image if it is not already set
            if (!hasCoverImage) {
                const { data: updateData, error: updateError } = await supabase
                    .from("galleries")
                    .update({ cover_image: publicUrl })
                    .eq("id", gallery_id);

                if (updateError) {
                    console.error(
                        "Error updating gallery cover image:",
                        updateError.message
                    );
                }
            }
        }
    }

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

const deleteOneGalleryImage = async (gallery_id: string, image_id: string) => {
    const { error: bucketError } = await supabase.storage
        .from("gallery")
        .remove([`${gallery_id}/${image_id}.jpg`]);

    if (bucketError) {
        console.error(
            "Error deleting gallery image from bucket:",
            bucketError.message
        );
        return false;
    }

    const { error } = await supabase
        .from("date_images")
        .delete()
        .eq("id", image_id);

    if (error) {
        console.error("Error deleting gallery image:", error.message);
        return false;
    }

    return true;
};

const deleteMultipleGalleryImages = async (
    gallery_id: string,
    image_ids: string[]
) => {
    for (const image_id of image_ids) {
        await deleteOneGalleryImage(gallery_id, image_id);
    }

    return true;
};

const deleteGallery = async (gallery_id: string) => {
    const galleryImages = await fetchGalleryImages(gallery_id);
    const imageIds = galleryImages.map((image) => image.id.toString());
    await deleteMultipleGalleryImages(gallery_id, imageIds);

    const { error } = await supabase
        .from("galleries")
        .delete()
        .eq("id", gallery_id);

    if (error) {
        console.error("Error deleting gallery:", error.message);
        return false;
    }

    const { error: bucketError } = await supabase.storage
        .from("gallery")
        .remove([`${gallery_id}`]);

    if (bucketError) {
        console.error(
            "Error deleting gallery images from bucket:",
            bucketError.message
        );
        return false;
    }

    return true;
};

export {
    addNewGallery,
    addNewList,
    addNewWheel,
    deleteGallery,
    deleteList,
    deleteMultipleGalleryImages,
    deleteOneGalleryImage,
    fetchGalleries,
    fetchGalleryImages,
    fetchLists,
    fetchMilestones,
    fetchQuotes,
    fetchUsers,
    fetchWheels,
    getGalleryId,
    updateList,
    updateNote,
    updateWheel,
    updateWheelTitle,
    uploadAvatarAndUpdateUser,
    uploadGalleryImages,
};
