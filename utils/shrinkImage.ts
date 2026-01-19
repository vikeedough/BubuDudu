import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

type ShrinkOptions = {
    maxLongEdge?: number;
    jpegQuality?: number;
};

export async function shrinkImage(
    uri: string,
    opts: ShrinkOptions = {},
): Promise<{ uri: string; width: number; height: number }> {
    const maxLongEdge = opts.maxLongEdge ?? 1600;
    const jpegQuality = opts.jpegQuality ?? 0.65;

    // Create a manipulation context (new API)
    const ctx = ImageManipulator.manipulate(uri);

    // Render once with no transforms to read original dimensions (no file saved yet)
    const originalRef = await ctx.renderAsync();
    const originalW = originalRef.width;
    const originalH = originalRef.height;

    // Reset queued operations (none yet, but keeps flow explicit)
    ctx.reset();

    // Decide transform
    const longEdge = Math.max(originalW, originalH);

    if (longEdge > maxLongEdge) {
        const scale = maxLongEdge / longEdge;
        const targetW = Math.round(originalW * scale);
        const targetH = Math.round(originalH * scale);

        ctx.resize({ width: targetW, height: targetH });
        const resizedRef = await ctx.renderAsync();
        const saved = await resizedRef.saveAsync({
            format: SaveFormat.JPEG,
            compress: jpegQuality,
        });

        // Release native refs ASAP
        resizedRef.release();
        originalRef.release();
        ctx.release();

        return { uri: saved.uri, width: targetW, height: targetH };
    }

    // Compress-only (still re-encodes and strips metadata)
    const compressedRef = await ctx.renderAsync();
    const saved = await compressedRef.saveAsync({
        format: SaveFormat.JPEG,
        compress: jpegQuality,
    });

    compressedRef.release();
    originalRef.release();
    ctx.release();

    return { uri: saved.uri, width: originalW, height: originalH };
}
