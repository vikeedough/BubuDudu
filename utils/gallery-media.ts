import { File } from "expo-file-system";

// Only pass files created by this operation. Picker/source URIs are never owned.
export function removeGalleryTempFiles(uris: (string | undefined)[], sourceUri?: string) {
    for (const uri of new Set(uris)) {
        if (!uri || uri === sourceUri) continue;
        try { const file = new File(uri); if (file.exists) file.delete(); }
        catch { /* OS cache reclamation remains the fallback; cleanup cannot undo a saved photo. */ }
    }
}

export function releaseGalleryResources(resources: ({ release: () => void } | undefined)[]) {
    for (const resource of new Set(resources)) {
        try { resource?.release(); } catch { /* Do not mask the original native operation failure. */ }
    }
}
