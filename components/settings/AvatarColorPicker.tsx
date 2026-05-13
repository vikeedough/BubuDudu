import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    GestureResponderEvent,
    LayoutChangeEvent,
    PanResponder,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors, listColorsArray } from "@/constants/colors";
import {
    clampColorChannel,
    getReadableTextColor,
    normalizeHexColor,
    parseHexColor,
    rgbToHex,
    type RgbColor,
} from "@/utils/colors";

interface AvatarColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    avatarUri?: string | null;
    name?: string | null;
    disabled?: boolean;
}

interface ColorChannelControlProps {
    label: string;
    value: number;
    tintColor: string;
    onChange: (value: number) => void;
    disabled?: boolean;
}

function getInitial(name?: string | null) {
    const trimmed = name?.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function ColorChannelControl({
    label,
    value,
    tintColor,
    onChange,
    disabled,
}: ColorChannelControlProps) {
    const [trackWidth, setTrackWidth] = useState(1);
    const clampedValue = clampColorChannel(value);
    const fillWidth = (clampedValue / 255) * trackWidth;

    const updateValueFromEvent = useCallback(
        (event: GestureResponderEvent) => {
            if (disabled) return;
            const nextValue =
                (event.nativeEvent.locationX / Math.max(trackWidth, 1)) * 255;
            onChange(clampColorChannel(nextValue));
        },
        [disabled, onChange, trackWidth],
    );

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !disabled,
                onMoveShouldSetPanResponder: () => !disabled,
                onPanResponderGrant: updateValueFromEvent,
                onPanResponderMove: updateValueFromEvent,
            }),
        [disabled, updateValueFromEvent],
    );

    const handleTrackLayout = (event: LayoutChangeEvent) => {
        setTrackWidth(Math.max(event.nativeEvent.layout.width, 1));
    };

    return (
        <View style={styles.channelRow}>
            <View style={styles.channelHeader}>
                <CustomText weight="semibold" style={styles.channelLabel}>
                    {label}
                </CustomText>
                <CustomText weight="medium" style={styles.channelValue}>
                    {clampedValue}
                </CustomText>
            </View>
            <View
                onLayout={handleTrackLayout}
                style={[styles.channelTrack, disabled && styles.disabled]}
                {...panResponder.panHandlers}
            >
                <View
                    style={[
                        styles.channelFill,
                        { width: fillWidth, backgroundColor: tintColor },
                    ]}
                />
                <View
                    pointerEvents="none"
                    style={[
                        styles.channelThumb,
                        {
                            left: fillWidth,
                            borderColor: tintColor,
                        },
                    ]}
                />
            </View>
        </View>
    );
}

export const AvatarColorPicker = ({
    value,
    onChange,
    avatarUri,
    name,
    disabled,
}: AvatarColorPickerProps) => {
    const normalizedValue = normalizeHexColor(value) ?? Colors.darkBlue;
    const selectedRgb = parseHexColor(normalizedValue) as RgbColor;
    const [hexInput, setHexInput] = useState(normalizedValue);
    const initial = getInitial(name);
    const previewTextColor = getReadableTextColor(normalizedValue);

    useEffect(() => {
        setHexInput(normalizedValue);
    }, [normalizedValue]);

    const updateRgb = (patch: Partial<RgbColor>) => {
        onChange(rgbToHex({ ...selectedRgb, ...patch }));
    };

    const handleHexInputChange = (text: string) => {
        const sanitized = text
            .toUpperCase()
            .replace(/[^#0-9A-F]/g, "")
            .replace(/(?!^)#/g, "")
            .slice(0, 7);
        const formatted = sanitized.startsWith("#")
            ? sanitized
            : `#${sanitized}`;

        setHexInput(formatted);

        const normalized = normalizeHexColor(formatted);
        if (normalized) {
            onChange(normalized);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.previewShell}>
                    <View
                        style={[
                            styles.avatarPreview,
                            { borderColor: normalizedValue },
                        ]}
                    >
                        {avatarUri ? (
                            <Image
                                source={{ uri: avatarUri }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.initialPreview,
                                    { backgroundColor: normalizedValue },
                                ]}
                            >
                                <CustomText
                                    weight="extrabold"
                                    style={[
                                        styles.initialText,
                                        { color: previewTextColor },
                                    ]}
                                >
                                    {initial}
                                </CustomText>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.hexGroup}>
                    <CustomText weight="semibold" style={styles.label}>
                        Avatar Colour
                    </CustomText>
                    <TextInput
                        allowFontScaling={false}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!disabled}
                        maxLength={7}
                        onChangeText={handleHexInputChange}
                        placeholder="#0F8AAF"
                        placeholderTextColor={Colors.gray}
                        style={styles.hexInput}
                        value={hexInput}
                    />
                </View>
            </View>

            <View style={styles.swatchRow}>
                {listColorsArray.map((color) => {
                    const normalizedColor = normalizeHexColor(color) ?? color;
                    const isSelected = normalizedColor === normalizedValue;

                    return (
                        <TouchableOpacity
                            activeOpacity={0.75}
                            disabled={disabled}
                            key={color}
                            onPress={() => onChange(normalizedColor)}
                            style={[
                                styles.swatch,
                                { backgroundColor: normalizedColor },
                                isSelected && styles.selectedSwatch,
                                disabled && styles.disabled,
                            ]}
                        />
                    );
                })}
            </View>

            <View style={styles.channels}>
                <ColorChannelControl
                    label="Red"
                    value={selectedRgb.r}
                    tintColor={Colors.red}
                    onChange={(r) => updateRgb({ r })}
                    disabled={disabled}
                />
                <ColorChannelControl
                    label="Green"
                    value={selectedRgb.g}
                    tintColor={Colors.green}
                    onChange={(g) => updateRgb({ g })}
                    disabled={disabled}
                />
                <ColorChannelControl
                    label="Blue"
                    value={selectedRgb.b}
                    tintColor={Colors.darkBlue}
                    onChange={(b) => updateRgb({ b })}
                    disabled={disabled}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    previewShell: {
        width: 96,
        height: 96,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarPreview: {
        width: 88,
        height: 88,
        borderRadius: 999,
        borderWidth: 8,
        overflow: "hidden",
        backgroundColor: Colors.white,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarImage: {
        width: "112%",
        height: "112%",
        borderRadius: 999,
    },
    initialPreview: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    initialText: {
        fontSize: 28,
    },
    hexGroup: {
        flex: 1,
        gap: 8,
    },
    label: {
        color: Colors.darkGreenText,
        fontSize: 16,
    },
    hexInput: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 12,
        backgroundColor: Colors.white,
        color: Colors.darkGreenText,
        fontFamily: "Raleway-Bold",
        fontSize: 16,
        paddingHorizontal: 14,
    },
    swatchRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    swatch: {
        width: 28,
        height: 28,
        borderRadius: 999,
        opacity: 0.78,
    },
    selectedSwatch: {
        borderWidth: 2,
        borderColor: Colors.brownText,
        opacity: 1,
    },
    channels: {
        gap: 13,
    },
    channelRow: {
        gap: 8,
    },
    channelHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    channelLabel: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    channelValue: {
        color: Colors.gray,
        fontSize: 12,
    },
    channelTrack: {
        height: 22,
        borderRadius: 999,
        backgroundColor: "#F2F1F3",
        overflow: "visible",
        justifyContent: "center",
    },
    channelFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 999,
    },
    channelThumb: {
        position: "absolute",
        width: 18,
        height: 18,
        marginLeft: -9,
        borderRadius: 999,
        borderWidth: 3,
        backgroundColor: Colors.white,
    },
    disabled: {
        opacity: 0.55,
    },
});
