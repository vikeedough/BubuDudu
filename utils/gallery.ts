import { Gallery, GalleryImage } from "@/stores/GalleryStore";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Alert } from "react-native";

export const pickMultipleImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
        Alert.alert(
            "Permission required",
            "Please allow access to your gallery."
        );
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        // allowsEditing: false,
        aspect: [1, 1],
        quality: 0.7,
        allowsMultipleSelection: true,
        preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
    });

    if (result.canceled) {
        return;
    }

    const images = result.assets.map((asset) => asset.uri);

    return images;
};

export const convertDate = (date: string) => {
    const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));

    return formatted;
};

export const downloadAndSaveImage = async (image_id: string, url: string) => {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(
        true
    );

    console.log(
        "Media Library Permission Status:",
        status,
        "Can Ask Again:",
        canAskAgain
    );

    if (status !== "granted") {
        Alert.alert(
            "Permission Required",
            canAskAgain
                ? "Please allow full access to your media library to save images."
                : "Media library permission was denied. Please enable it in your device settings.",
            canAskAgain ? undefined : [{ text: "OK" }]
        );
        return;
    }

    const destination = new Directory(Paths.cache, "BubuDudu");
    if (!destination.exists) {
        destination.create();
    }

    const output = await File.downloadFileAsync(url, destination, {
        idempotent: true,
    });

    const asset = await MediaLibrary.createAssetAsync(output.uri);

    // Get or create the album
    const album = await MediaLibrary.getAlbumAsync("BubuDudu");
    if (!album) {
        await MediaLibrary.createAlbumAsync("BubuDudu", asset);
    } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album);
    }
};

export const multipleDownloadAndSaveImage = async (images: GalleryImage[]) => {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== "granted") {
        Alert.alert("Permission to save images was denied");
        return;
    }

    try {
        for (const image of images) {
            await downloadAndSaveImage(image.id.toString(), image.url);
        }
    } catch (error) {
        console.error(error);
        Alert.alert("Error downloading images");
        return;
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
