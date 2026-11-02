// generateBlurhash.ts
// Real BlurHash generation (iOS/Android/Web) using NEW expo-image-manipulator + NEW expo-file-system APIs.
// Generates blurhash ONCE at upload time, store in DB, reuse in UI.

import { encode } from "blurhash";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import UPNG from "upng-js";

import { releaseGalleryResources, removeGalleryTempFiles } from "./gallery-media";

const BLUR_W = 32;
const BLUR_H = 32;
const COMPONENTS_X = 4;
const COMPONENTS_Y = 3;

export async function generateBlurhash(imageUri: string): Promise<string> {
    // 1) Resize to a tiny PNG using the new ImageManipulator context API
    const ctx = ImageManipulator.manipulate(imageUri);
    let imageRef: Awaited<ReturnType<typeof ctx.renderAsync>> | undefined;
    let temporaryUri: string | undefined;
    try {
        ctx.resize({ width: BLUR_W, height: BLUR_H });

        imageRef = await ctx.renderAsync();
        const saved = await imageRef.saveAsync({ format: SaveFormat.PNG });

        // Own only the newly saved PNG; the input thumbnail belongs to the upload job.
        temporaryUri = saved.uri;

        // 2) Read exact PNG bytes without a base64 intermediate
        const buffer = await new File(saved.uri).arrayBuffer();

        // 3) Decode PNG -> RGBA
        const png = UPNG.decode(buffer);
        const rgba = UPNG.toRGBA8(png)[0]; // Uint8Array RGBA

        // 4) Encode BlurHash
        return encode(
            new Uint8ClampedArray(rgba),
            BLUR_W,
            BLUR_H,
            COMPONENTS_X,
            COMPONENTS_Y,
        );
    } finally {
        releaseGalleryResources([imageRef, ctx]);
        removeGalleryTempFiles([temporaryUri], imageUri);
    }
}
