import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
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
    const base64 = await file.base64();
    const arrayBuffer = decode(base64);
    return { arrayBuffer, bytes: arrayBuffer.byteLength };
}

export async function generateVariants(
    originalUri: string,
): Promise<Record<Variant, VariantOutput>> {
    const thumb = await shrinkImage(originalUri, {
        maxLongEdge: 1000,
        jpegQuality: 0.7,
    });
    const grid = await shrinkImage(originalUri, {
        maxLongEdge: 1600,
        jpegQuality: 0.85,
    });
    const orig = await shrinkImage(originalUri, {
        maxLongEdge: 2000,
        jpegQuality: 0.9,
    });

    const [thumbBuf, gridBuf, origBuf] = await Promise.all([
        toArrayBuffer(thumb.uri),
        toArrayBuffer(grid.uri),
        toArrayBuffer(orig.uri),
    ]);

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
            uri: grid.uri,
            width: grid.width,
            height: grid.height,
            ...gridBuf,
        },
        orig: {
            variant: "orig",
            uri: orig.uri,
            width: orig.width,
            height: orig.height,
            ...origBuf,
        },
    };
}
