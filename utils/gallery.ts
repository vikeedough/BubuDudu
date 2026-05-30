import { Gallery, GalleryImage } from "@/stores/GalleryStore";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Alert } from "react-native";

const GALLERY_ALBUM_NAME = "BubuDudu";
const PHOTO_LIBRARY_PERMISSIONS: MediaLibrary.GranularPermission[] = ["photo"];

export const pickMultipleImages = async (): Promise<string[] | undefined> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
    });

    if (result.canceled) return;
    return result.assets.map((a) => a.uri);
};

export const convertDate = (date: string) => {
    const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));

    return formatted;
};

async function requestMediaLibraryPermission() {
    const permission = await MediaLibrary.requestPermissionsAsync(
        false,
        PHOTO_LIBRARY_PERMISSIONS,
    );

    if (permission.status !== "granted") {
        Alert.alert(
            "Permission Required",
            permission.canAskAgain
                ? "Please allow full access to your media library to save images."
                : "Media library permission was denied. Please enable it in your device settings.",
            permission.canAskAgain ? undefined : [{ text: "OK" }],
        );
    }

    return permission.status === "granted";
}

async function saveImageToAlbum(image_id: string, url: string) {
    const destination = new Directory(Paths.cache, "BubuDudu");
    if (!destination.exists) {
        destination.create();
    }

    const output = await File.downloadFileAsync(url, destination, {
        idempotent: true,
    });

    const album = await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME);
    if (album) {
        await MediaLibrary.createAssetAsync(output.uri, album);
        return;
    }

    await MediaLibrary.createAlbumAsync(
        GALLERY_ALBUM_NAME,
        undefined,
        false,
        output.uri,
    );
}

export const downloadAndSaveImage = async (image_id: string, url: string) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return 0;

    await saveImageToAlbum(image_id, url);
    return 1;
};

export const multipleDownloadAndSaveImage = async (images: GalleryImage[]) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return 0;

    try {
        let savedCount = 0;
        for (const image of images) {
            const url = image.url_orig;
            if (!url) continue; // or throw
            await saveImageToAlbum(image.id, url);
            savedCount++;
        }
        return savedCount;
    } catch (error) {
        console.error(error);
        Alert.alert("Error downloading images");
        return 0;
    }
};

export const normalizeGalleries = (gs: Gallery[]): Gallery[] =>
    gs.map((gallery) => ({
        ...gallery,
        date:
            typeof gallery.date === "string"
                ? new Date(gallery.date)
                : gallery.date,
    }));
