import * as FileSystem from "expo-file-system";

import { removeGalleryTempFiles } from "./gallery-media";
import { shrinkImage } from "./shrinkImage";

type Variant = "thumb" | "grid" | "orig";

export type VariantOutput = {
    variant: Variant;
    uri: string;
    width: number;
    height: number;
    arrayBuffer: ArrayBuffer;
    bytes: number;
};

async function toArrayBuffer(
    uri: string,
): Promise<{ arrayBuffer: ArrayBuffer; bytes: number }> {
    const file = new FileSystem.File(uri);
    const arrayBuffer = await file.arrayBuffer();
    return { arrayBuffer, bytes: arrayBuffer.byteLength };
}

export async function generateVariants(
    originalUri: string,
): Promise<Record<Variant, VariantOutput>> {
    const owned: string[] = [];
    try {
        const thumb = await shrinkImage(originalUri, {
            maxLongEdge: 1000,
            jpegQuality: 0.7,
        });
        owned.push(thumb.uri);
        const orig = await shrinkImage(originalUri, {
            maxLongEdge: 2000,
            jpegQuality: 0.9,
        });

        owned.push(orig.uri);
        const buffers = await Promise.allSettled([toArrayBuffer(thumb.uri), toArrayBuffer(orig.uri)]);
        if (buffers[0].status === "rejected") throw buffers[0].reason;
        if (buffers[1].status === "rejected") throw buffers[1].reason;
        const [thumbBuf, origBuf] = [buffers[0].value, buffers[1].value];

        return {
            thumb: {
                variant: "thumb",
                uri: thumb.uri,
                width: thumb.width,
                height: thumb.height,
                ...thumbBuf,
            },
            grid: {
                variant: "grid",
                uri: orig.uri,
                width: orig.width,
                height: orig.height,
                ...origBuf,
                // Compatibility alias, not a third encoded/uploaded object.
                bytes: 0,
            },
            orig: {
                variant: "orig",
                uri: orig.uri,
                width: orig.width,
                height: orig.height,
                ...origBuf,
            },
        };
    } catch (error) { removeGalleryTempFiles(owned, originalUri); throw error; }
}
