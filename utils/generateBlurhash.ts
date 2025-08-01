import { encode } from "blurhash";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

export const generateBlurhash = async (imageUri: string): Promise<string> => {
    try {
        // For now, return different blurhashes based on simple image analysis
        // This is a temporary solution until proper pixel data extraction is implemented

        if (Platform.OS === "web") {
            // Web platform - can use canvas for proper blurhash generation
            return await generateBlurhashWeb(imageUri);
        } else {
            // Mobile platforms - use simple color-based approximation
            return await generateBlurhashMobile(imageUri);
        }
    } catch (err) {
        console.error("❌ Failed to generate BlurHash:", err);
        return "LKN]Rv%2Tw=w]~RBVZRi};RPxuwH"; // Pleasant fallback
    }
};

// Web implementation using canvas
const generateBlurhashWeb = async (imageUri: string): Promise<string> => {
    const {
        base64,
        width = 32,
        height = 32,
    } = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 32, height: 32 } }],
        { base64: true, format: ImageManipulator.SaveFormat.PNG }
    );

    if (!base64) throw new Error("No base64 from manipulation.");

    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            const imageData = ctx?.getImageData(0, 0, width, height);
            if (imageData) {
                const blurhash = encode(imageData.data, width, height, 4, 3);
                resolve(blurhash);
            } else {
                reject(new Error("Failed to get image data"));
            }
        };

        img.onerror = reject;
        img.src = `data:image/png;base64,${base64}`;
    });
};

// Mobile implementation - simplified approach
const generateBlurhashMobile = async (imageUri: string): Promise<string> => {
    // For mobile, we'll create a simple approximation based on image characteristics
    // This is not a true blurhash but provides variety for different images

    const hash = imageUri
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Generate different pleasant blurhashes based on the image URI hash
    const blurhashes = [
        "LKN]Rv%2Tw=w]~RBVZRi};RPxuwH", // Default pleasant blue
        "LGFFaXYk^6#M@-5c,1J5@[or[Q6.", // Warm orange
        "L6PZfSi_.AyE_3t7t7R**0o#DgR4", // Cool purple
        "LKO2:N%2Tw=w]~RBVZRi};RPxuwH", // Green tint
        "L9AS}+%M~qPV-;kCfQx]*JtRRjRi", // Pink/red
        "LEHV6nWB2yk8pyo0adR*.7kCMdnj", // Neutral gray
        "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.", // Bright blue
        "L5H2EC=PM+yV0g-mq.wG9c010J}I", // Soft yellow
    ];

    return blurhashes[hash % blurhashes.length];
};
