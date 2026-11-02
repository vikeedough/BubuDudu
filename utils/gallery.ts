import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Alert, Linking } from "react-native";

import { Gallery, GalleryImage } from "@/stores/GalleryStore";

import { removeGalleryTempFiles } from "./gallery-media";


const GALLERY_ALBUM_NAME = "BubuDudu";
const PHOTO_LIBRARY_PERMISSIONS: MediaLibrary.GranularPermission[] = ["photo"];

export const pickMultipleImages = async (): Promise<string[] | undefined> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        Alert.alert("Photo access needed", permission.canAskAgain === false
            ? "Photo access is disabled. Enable it in your device settings to choose photos."
            : "Allow photo library access to choose photos.",
            permission.canAskAgain === false ? [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => { void Linking.openSettings().catch(() => undefined); } }] : undefined);
        return;
    }

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

let downloadSequence = 0;
class GalleryDownloadCancelled extends Error {}
function checkDownload(signal?: AbortSignal) { if (signal?.aborted) throw new GalleryDownloadCancelled("Download cancelled"); }

async function saveImageToAlbum(imageId: string, url: string, album: MediaLibrary.Album | null, signal?: AbortSignal) {
    checkDownload(signal);
    const destination = new Directory(Paths.cache, "BubuDudu");
    destination.create({ idempotent: true, intermediates: true });
    const temporary = new File(destination, `${imageId.replace(/[^a-z0-9-]/gi,"_")}-${Date.now()}-${++downloadSequence}.jpg`);
    try {
        const output = await File.downloadFileAsync(url, temporary, { idempotent: true });
        checkDownload(signal);
        if (album) { await MediaLibrary.createAssetAsync(output.uri, album); return album; }
        return await MediaLibrary.createAlbumAsync(GALLERY_ALBUM_NAME, undefined, false, output.uri);
    } finally { removeGalleryTempFiles([temporary.uri]); }
}

export type GalleryDownloadResult = {
    savedIds: string[];
    failedIds: string[];
    skippedIds: string[];
    errors: Record<string, string>;
    permissionDenied: boolean;
    cancelled: boolean;
};
export type GalleryDownloadProgress = { saved: number; failed: number; skipped: number; processed: number; total: number };
export type GalleryDownloadOptions = { signal?: AbortSignal; onProgress?: (progress: GalleryDownloadProgress) => void };

export const downloadAndSaveImage = async (imageId: string, url: string) => {
    if (!await requestMediaLibraryPermission()) return 0;
    await saveImageToAlbum(imageId, url, await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME));
    return 1;
};

export const multipleDownloadAndSaveImage = async (
    images: GalleryImage[], refresh?: (ids?: string[]) => Promise<GalleryImage[]>, options: GalleryDownloadOptions = {},
): Promise<GalleryDownloadResult> => {
    const rows = [...new Map(images.map(image => [image.id, image])).values()];
    const result: GalleryDownloadResult = { savedIds: [], failedIds: [], skippedIds: [], errors: {}, permissionDenied: false, cancelled: false };
    const report = () => options.onProgress?.({ saved: result.savedIds.length, failed: result.failedIds.length, skipped: result.skippedIds.length, processed: result.savedIds.length + result.failedIds.length + result.skippedIds.length, total: rows.length });
    if (!rows.length) { report(); return result; }
    if (options.signal?.aborted) { result.cancelled = true; result.skippedIds = rows.map(row => row.id); report(); return result; }
    if (!await requestMediaLibraryPermission()) { result.permissionDenied = true; result.skippedIds = rows.map(row => row.id); report(); return result; }
    const urls = new Map(rows.map(image => [image.id, image.url_orig]));
    let renewed = false;
    let album: MediaLibrary.Album | null = null;
    try { album = await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME); }
    catch { result.failedIds = rows.map(row => row.id); rows.forEach(row => { result.errors[row.id] = "The photo album could not open."; }); report(); return result; }
    report();
    for (let index = 0; index < rows.length; index++) {
        const image = rows[index];
        if (options.signal?.aborted) { result.cancelled = true; result.skippedIds.push(...rows.slice(index).map(row => row.id)); report(); break; }
        const url = urls.get(image.id);
        if (!url) { result.skippedIds.push(image.id); result.errors[image.id] = "Original image URL unavailable."; report(); continue; }
        try {
            try { album = await saveImageToAlbum(image.id, url, album, options.signal); }
            catch (error) {
                if (error instanceof GalleryDownloadCancelled) throw error;
                if (!refresh || renewed || !/401|403|expired/i.test(String(error))) throw error;
                renewed = true;
                // One shared refresh updates the remaining loop, instead of retrying every stale URL.
                const remaining = rows.slice(index).map(row => row.id);
                for (const row of await refresh(remaining)) if (row.url_orig) urls.set(row.id, row.url_orig);
                const replacement = urls.get(image.id);
                if (!replacement || replacement === url) throw error;
                album = await saveImageToAlbum(image.id, replacement, album, options.signal);
            }
            result.savedIds.push(image.id);
        } catch (error) {
            if (error instanceof GalleryDownloadCancelled) { result.cancelled = true; result.skippedIds.push(image.id); }
            else { result.failedIds.push(image.id); result.errors[image.id] = "This photo could not be saved. Retry this photo."; }
        }
        report();
    }
    return result;
};

export const normalizeGalleries = (gs: Gallery[]): Gallery[] =>
    gs.map((gallery) => ({
        ...gallery,
        date:
            typeof gallery.date === "string"
                ? new Date(gallery.date)
                : gallery.date,
    }));
