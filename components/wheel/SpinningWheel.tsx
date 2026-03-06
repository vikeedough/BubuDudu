import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import DebonSpin from "@/assets/svgs/debon-spin.svg";
import { Colors, listColorsArray } from "@/constants/colors";

import CustomText from "../CustomText";

interface SpinningWheelProps {
    selectedChoices: string[];
    selectedIndex: number;
}

interface WheelEdgeDotsProps {
    centerX: number;
    centerY: number;
    radius: number;
    strokeWidth: number;
    dotRadius: number;
    count?: number;
}

interface SpinResultModalProps {
    visible: boolean;
    selectedResult: string;
    onClose: () => void;
}

interface WheelPointerProps {
    centerX: number;
    centerY: number;
    size: number;
    color: string;
}

const WheelEdgeDots: React.FC<WheelEdgeDotsProps> = ({
    centerX,
    centerY,
    radius,
    strokeWidth,
    dotRadius,
    count = 8,
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const angle = (i * 360) / count;
                const dotCircleRadius = radius + strokeWidth / 2 - dotRadius * 2;
                const x =
                    centerX + dotCircleRadius * Math.cos((angle * Math.PI) / 180);
                const y =
                    centerY + dotCircleRadius * Math.sin((angle * Math.PI) / 180);
                return (
                    <Circle
                        key={`dot-${i}`}
                        cx={x}
                        cy={y}
                        r={dotRadius}
                        fill="white"
                    />
                );
            })}
        </>
    );
};

const SpinResultModal: React.FC<SpinResultModalProps> = ({
    visible,
    selectedResult,
    onClose,
}) => {
    return (
        <View style={{ zIndex: 1000 }}>
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <DebonSpin style={styles.debonSpin} />
                        <CustomText weight="bold" style={styles.modalTitle}>
                            Debon picked!
                        </CustomText>
                        <View style={styles.resultContainer}>
                            <CustomText weight="semibold" style={styles.resultText}>
                                {selectedResult}
                            </CustomText>
                            <CustomText weight="regular" style={styles.debonText}>
                                Debon&apos;s stomach agrees too.
                            </CustomText>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <CustomText
                                weight="semibold"
                                style={styles.closeButtonText}
                            >
                                Yes
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const WheelPointer: React.FC<WheelPointerProps> = ({
    centerX,
    centerY,
    size,
    color,
}) => {
    return (
        <Svg
            style={{ position: "absolute", top: 0, left: 0 }}
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            pointerEvents="none"
        >
            <Circle cx={centerX} cy={centerY} r={25} fill={color} />
            <Path
                d={`M ${centerX} ${centerY - 45} L ${centerX - 22} ${
                    centerY - 5
                } L ${centerX + 22} ${centerY - 5} Z`}
                fill={color}
            />
        </Svg>
    );
};

const createPath = (
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number,
) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
};

const getTextPosition = (
    centerX: number,
    centerY: number,
    angle: number,
    radius: number,
) => {
    const angleRad = (angle * Math.PI) / 180;
    const textRadius = radius * 0.65;
    return {
        x: centerX + textRadius * Math.cos(angleRad),
        y: centerY + textRadius * Math.sin(angleRad),
    };
};

const isColorDark = (color: string) => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
};

const getTextColor = (backgroundColor: string) => {
    return isColorDark(backgroundColor) ? "#FFFFFF" : "#333333";
};

const lightenColor = (color: string, amount: number = 0.3) => {
    const hex = color.replace("#", "");
    const num = parseInt(hex, 16);
    const r = Math.min(
        255,
        Math.floor((num >> 16) + (255 - (num >> 16)) * amount),
    );
    const g = Math.min(
        255,
        Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * amount),
    );
    const b = Math.min(
        255,
        Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * amount),
    );
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

const SpinningWheel: React.FC<SpinningWheelProps> = ({
    selectedChoices,
    selectedIndex,
}) => {
    const size = 360;
    const strokeWidth = 18;
    const dotRadius = 4;
    const radius = 160;
    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = radius - strokeWidth / 2;

    const rotation = useSharedValue(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState("");

    const currentLabelColor = listColorsArray[selectedIndex % 6];
    const colors = ["white", lightenColor(currentLabelColor, 0.9)];
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const shadowStyle = {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    };
    const wheelButtonStyle = {
        position: "relative" as const,
        ...shadowStyle,
    };
    const closeResultModal = () => setShowResultModal(false);

    const onSpinComplete = (result: string) => {
        setIsSpinning(false);
        setSelectedResult(result);
        setShowResultModal(true);
    };

    const spinWheel = () => {
        if (isSpinning || selectedChoices.length === 0) return;

        setIsSpinning(true);

        const randomChoiceIndex = Math.floor(
            Math.random() * selectedChoices.length,
        );
        const result = selectedChoices[randomChoiceIndex];

        const fullRotations = Math.floor(Math.random() * 11) + 15;
        const segmentAngle = 360 / selectedChoices.length;
        const targetRotation =
            -randomChoiceIndex * segmentAngle - segmentAngle / 2;
        const finalAngle = fullRotations * 360 + targetRotation;

        rotation.value = withSequence(
            withTiming(
                finalAngle,
                {
                    duration: 4000,
                    easing: Easing.out(Easing.cubic),
                },
                (finished) => {
                    if (finished) {
                        scheduleOnRN(onSpinComplete, result);
                    }
                },
            ),
        );
    };

    if (selectedChoices.length === 0) {
        return (
            <View style={[styles.container, { width: size, height: size }, shadowStyle]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Circle
                        cx={centerX}
                        cy={centerY}
                        r={radius}
                        fill="#E8E8E8"
                        stroke={currentLabelColor}
                        strokeWidth={strokeWidth}
                    />
                    <WheelEdgeDots
                        centerX={centerX}
                        centerY={centerY}
                        radius={radius}
                        strokeWidth={strokeWidth}
                        dotRadius={dotRadius}
                    />
                </Svg>
                <View style={styles.emptyTextContainer}>
                    <CustomText style={styles.emptyText}>
                        Select choices to spin!
                    </CustomText>
                </View>
            </View>
        );
    }

    const isSingleChoice = selectedChoices.length === 1;
    const segmentAngle = 360 / selectedChoices.length;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <TouchableOpacity
                onPress={spinWheel}
                disabled={isSpinning}
                activeOpacity={1}
                style={wheelButtonStyle}
            >
                <Animated.View style={animatedStyle}>
                    <Svg
                        width={size}
                        height={size}
                        viewBox={`0 0 ${size} ${size}`}
                    >
                        {isSingleChoice ? (
                            <>
                                <Circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={radius}
                                    fill={colors[0]}
                                    stroke={currentLabelColor}
                                    strokeWidth={strokeWidth}
                                />
                                <WheelEdgeDots
                                    centerX={centerX}
                                    centerY={centerY}
                                    radius={radius}
                                    strokeWidth={strokeWidth}
                                    dotRadius={dotRadius}
                                />
                                <SvgText
                                    x={centerX}
                                    y={centerY}
                                    fontSize="18"
                                    fill={getTextColor(colors[0])}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    fontWeight="600"
                                >
                                    {selectedChoices[0]}
                                </SvgText>
                            </>
                        ) : (
                            <>
                                <Circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={radius}
                                    fill="none"
                                    stroke={currentLabelColor}
                                    strokeWidth={strokeWidth}
                                />
                                <Circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={innerRadius}
                                    fill="#F8F9FA"
                                />

                                {selectedChoices.map((choice, index) => {
                                    const startAngle = index * segmentAngle - 90;
                                    const endAngle =
                                        (index + 1) * segmentAngle - 90;
                                    const path = createPath(
                                        centerX,
                                        centerY,
                                        startAngle,
                                        endAngle,
                                        innerRadius,
                                    );
                                    const color = colors[index % colors.length];

                                    return (
                                        <Path
                                            key={`segment-${index}`}
                                            d={path}
                                            fill={color}
                                            stroke="white"
                                            strokeWidth={2}
                                        />
                                    );
                                })}

                                {selectedChoices.map((choice, index) => {
                                    const midAngle =
                                        (index + 0.5) * segmentAngle - 90;
                                    const textPos = getTextPosition(
                                        centerX,
                                        centerY,
                                        midAngle,
                                        innerRadius,
                                    );
                                    const segmentColor =
                                        colors[index % colors.length];
                                    const textColor = getTextColor(segmentColor);

                                    return (
                                        <SvgText
                                            key={`text-${index}`}
                                            x={textPos.x}
                                            y={textPos.y}
                                            fontSize={16}
                                            fill={textColor}
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                            fontWeight="600"
                                            transform={`rotate(${
                                                midAngle + 180
                                            } ${textPos.x} ${textPos.y})`}
                                        >
                                            {choice.length > 9
                                                ? `${choice.substring(0, 9)}...`
                                                : choice}
                                        </SvgText>
                                    );
                                })}

                                <WheelEdgeDots
                                    centerX={centerX}
                                    centerY={centerY}
                                    radius={radius}
                                    strokeWidth={strokeWidth}
                                    dotRadius={dotRadius}
                                />
                            </>
                        )}
                    </Svg>
                </Animated.View>

                {!isSingleChoice && (
                    <WheelPointer
                        centerX={centerX}
                        centerY={centerY}
                        size={size}
                        color={currentLabelColor}
                    />
                )}
            </TouchableOpacity>

            <SpinResultModal
                visible={showResultModal}
                selectedResult={selectedResult}
                onClose={closeResultModal}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
    },
    emptyTextContainer: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 30,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 250,
    },
    modalTitle: {
        fontSize: 16,
        color: Colors.black,
        marginBottom: 20,
    },
    resultContainer: {
        marginBottom: 25,
    },
    resultText: {
        fontSize: 20,
        color: "#9D6100",
        textAlign: "center",
        marginBottom: 10,
    },
    debonText: {
        fontSize: 13,
        color: Colors.black,
        textAlign: "center",
    },
    closeButton: {
        borderRadius: 15,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: "#FFCC7D",
    },
    closeButtonText: {
        fontSize: 14,
        color: "#9D6100",
    },
    debonSpin: {
        position: "absolute",
        top: -125,
        left: -45,
        zIndex: 1000,
    },
});

export default SpinningWheel;
