import { generateBlurhash } from "@/utils/generateBlurhash";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "../clients/supabaseClient";

const fetchGalleries = async () => {
    const { data, error } = await supabase.from("galleries").select("*");

    if (error) {
        console.error("Error fetching galleries:", error);
        return [];
    }

    return data;
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

        // Generate blurhash for the image
        const imageBlurHash = await generateBlurhash(image);

        const file = new FileSystem.File(image);
        const base64 = await file.base64();

        // Convert base64 to ArrayBuffer
        const arrayBuffer = decode(base64);

        const { error: uploadError } = await supabase.storage
            .from("gallery")
            .upload(`${folderName}/${fileName}`, arrayBuffer, {
                contentType: "image/jpeg",
            });

        if (uploadError) {
            console.error(
                "Error uploading gallery images:",
                uploadError.message,
                "Full error:",
                JSON.stringify(uploadError, null, 2)
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
                    blur_hash: imageBlurHash,
                    created_at: new Date().toISOString(),
                },
            ]);

        if (updateError) {
            console.error("Error inserting image data:", updateError.message);
            return false;
        }

        if (!hasUploadedFirstImage) {
            hasUploadedFirstImage = true;
            // Only update cover_image if it is not already set
            if (!hasCoverImage) {
                const { data: updateData, error: updateError } = await supabase
                    .from("galleries")
                    .update({
                        cover_image: publicUrl,
                        cover_image_blur_hash: imageBlurHash,
                    })
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
    // Fetch gallery to check current cover
    const { data: galleryData, error: galleryError } = await supabase
        .from("galleries")
        .select("cover_image")
        .eq("id", gallery_id)
        .single();

    if (galleryError) {
        console.error("Error fetching gallery data:", galleryError.message);
        return false;
    }

    // Fetch the image row to get its URL (needed to compare with cover_image)
    const { data: imgRow, error: imgErr } = await supabase
        .from("date_images")
        .select("id, url, blur_hash")
        .eq("id", image_id)
        .single();

    if (imgErr) {
        console.error("Error fetching image row:", imgErr.message);
        return false;
    }

    const isDeletingCover = galleryData?.cover_image === imgRow.url;

    if (isDeletingCover) {
        // Find a replacement image (if any) and set it as the new cover
        const { data: otherImages, error: otherErr } = await supabase
            .from("date_images")
            .select("id, url, blur_hash, created_at")
            .eq("gallery_id", gallery_id)
            .neq("id", image_id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (otherErr) {
            console.error(
                "Error fetching replacement image:",
                otherErr.message
            );
            return false;
        }

        const replacement = otherImages?.[0];

        if (!replacement) {
            // No images left, clear cover fields
            const { error: updateError } = await supabase
                .from("galleries")
                .update({ cover_image: null, cover_image_blur_hash: null })
                .eq("id", gallery_id);

            if (updateError) {
                console.error(
                    "Error clearing gallery cover image:",
                    updateError.message
                );
                return false;
            }
        } else {
            const { error: updateError } = await supabase
                .from("galleries")
                .update({
                    cover_image: replacement.url,
                    cover_image_blur_hash: replacement.blur_hash,
                })
                .eq("id", gallery_id);

            if (updateError) {
                console.error(
                    "Error updating gallery cover image:",
                    updateError.message
                );
                return false;
            }
        }
    }

    // Delete file from storage
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

    // Delete DB row
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
    deleteGallery,
    deleteMultipleGalleryImages,
    deleteOneGalleryImage,
    fetchGalleries,
    fetchGalleryImages,
    getGalleryId,
    uploadGalleryImages,
};
