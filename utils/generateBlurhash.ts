// generateBlurhash.ts
// Real BlurHash generation (iOS/Android/Web) using NEW expo-image-manipulator + NEW expo-file-system APIs.
// Generates blurhash ONCE at upload time, store in DB, reuse in UI.

import { encode } from "blurhash";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import UPNG from "upng-js";

const BLUR_W = 32;
const BLUR_H = 32;
const COMPONENTS_X = 4;
const COMPONENTS_Y = 3;

export async function generateBlurhash(imageUri: string): Promise<string> {
    // 1) Resize to a tiny PNG using the new ImageManipulator context API
    const ctx = ImageManipulator.manipulate(imageUri);
    ctx.resize({ width: BLUR_W, height: BLUR_H });

    const imageRef = await ctx.renderAsync();
    const saved = await imageRef.saveAsync({ format: SaveFormat.PNG });

    // Optional: release native refs if you’re generating many hashes in a loop
    imageRef.release();
    ctx.release();

    // 2) Read base64 via NEW expo-file-system File API
    const base64 = await new File(saved.uri).base64();

    // 3) Decode PNG -> RGBA
    const bytes = base64ToUint8Array(base64);
    const png = UPNG.decode(bytes.buffer);
    const rgba = UPNG.toRGBA8(png)[0]; // Uint8Array RGBA

    // 4) Encode BlurHash
    return encode(
        new Uint8ClampedArray(rgba),
        BLUR_W,
        BLUR_H,
        COMPONENTS_X,
        COMPONENTS_Y,
    );
}

function base64ToUint8Array(base64: string) {
    const binary = globalThis.atob(base64);
    const len = binary.length;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
    return out;
}
