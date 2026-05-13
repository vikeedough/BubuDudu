export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

const HEX_COLOR_PATTERN = /^[0-9a-fA-F]+$/;

export function clampColorChannel(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(255, Math.max(0, Math.round(value)));
}

export function rgbToHex({ r, g, b }: RgbColor): string {
    return [r, g, b]
        .map((channel) =>
            clampColorChannel(channel).toString(16).padStart(2, "0"),
        )
        .join("")
        .toUpperCase()
        .replace(/^/, "#");
}

export function parseHexColor(value: string | null | undefined): RgbColor | null {
    const raw = value?.trim().replace(/^#/, "") ?? "";

    if (!HEX_COLOR_PATTERN.test(raw)) return null;

    const hex =
        raw.length === 3
            ? raw
                  .split("")
                  .map((char) => `${char}${char}`)
                  .join("")
            : raw.length === 6
              ? raw
              : "";

    if (!hex) return null;

    return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
    };
}

export function normalizeHexColor(value: string | null | undefined): string | null {
    const rgb = parseHexColor(value);
    return rgb ? rgbToHex(rgb) : null;
}

function channelToLinear(channel: number): number {
    const normalized = clampColorChannel(channel) / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(color: string): number | null {
    const rgb = parseHexColor(color);
    if (!rgb) return null;

    return (
        0.2126 * channelToLinear(rgb.r) +
        0.7152 * channelToLinear(rgb.g) +
        0.0722 * channelToLinear(rgb.b)
    );
}

export function getContrastRatio(
    foreground: string,
    background: string,
): number | null {
    const foregroundLuminance = getRelativeLuminance(foreground);
    const backgroundLuminance = getRelativeLuminance(background);

    if (foregroundLuminance === null || backgroundLuminance === null) {
        return null;
    }

    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(
    backgroundColor: string,
    lightTextColor = "#FFFFFF",
    darkTextColor = "#505739",
): string {
    const lightContrast = getContrastRatio(lightTextColor, backgroundColor) ?? 0;
    const darkContrast = getContrastRatio(darkTextColor, backgroundColor) ?? 0;

    return lightContrast >= darkContrast ? lightTextColor : darkTextColor;
}

export function getReadableAccentTextColor(
    accentColor: string,
    surfaceColor = "#FFFFFF",
    fallbackTextColor = "#505739",
): string {
    const normalizedAccent = normalizeHexColor(accentColor);
    const contrastRatio = normalizedAccent
        ? getContrastRatio(normalizedAccent, surfaceColor)
        : null;

    if (normalizedAccent && contrastRatio !== null && contrastRatio >= 3) {
        return normalizedAccent;
    }

    return fallbackTextColor;
}
