import { listColorsArray } from "@/constants/colors";
import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import CustomText from "../CustomText";

interface SpinningWheelProps {
    selectedChoices: string[];
    selectedIndex: number;
}

const SpinningWheel: React.FC<SpinningWheelProps> = ({
    selectedChoices,
    selectedIndex,
}) => {
    const size = 320;
    const strokeWidth = 18;
    const dotRadius = 4;
    const radius = 140; // Bigger radius for a more prominent wheel
    const centerX = size / 2;
    const centerY = size / 2;

    // Animation and state
    const rotation = useSharedValue(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState("");

    // Get the current label color based on selectedIndex
    const findIndex = (index: number) => index % 6;
    const currentLabelColor = listColorsArray[findIndex(selectedIndex)];

    // Create lighter version of the label color for segments
    const lightenColor = (color: string, amount: number = 0.3) => {
        const hex = color.replace("#", "");
        const num = parseInt(hex, 16);
        const r = Math.min(
            255,
            Math.floor((num >> 16) + (255 - (num >> 16)) * amount)
        );
        const g = Math.min(
            255,
            Math.floor(
                ((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * amount
            )
        );
        const b = Math.min(
            255,
            Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * amount)
        );
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    };

    // Function to determine if a color is dark (returns true) or light (returns false)
    const isColorDark = (color: string) => {
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // If luminance is less than 0.5, it's considered dark
        return luminance < 0.5;
    };

    // Function to get appropriate text color for a background
    const getTextColor = (backgroundColor: string) => {
        return isColorDark(backgroundColor) ? "#FFFFFF" : "#333333";
    };

    // Colors for the wheel segments based on current label
    const colors = [
        currentLabelColor, // Main label color
        lightenColor(currentLabelColor, 0.4), // Lighter version
    ];

    // Animated style for wheel rotation
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    // Function to handle spinning completion
    const onSpinComplete = (result: string) => {
        setIsSpinning(false);
        setSelectedResult(result);
        setShowResultModal(true);
    };

    // Spinning function
    const spinWheel = () => {
        if (isSpinning || selectedChoices.length === 0) return;

        setIsSpinning(true);

        // Calculate random rotation (10-15 full rotations + random segment)
        const fullRotations = Math.floor(Math.random() * 6) + 10; // 10-15 rotations
        const segmentAngle = 360 / selectedChoices.length;
        const randomSegment = Math.floor(
            Math.random() * selectedChoices.length
        );
        const finalAngle =
            fullRotations * 360 +
            randomSegment * segmentAngle +
            segmentAngle / 2;

        // Animate the wheel
        rotation.value = withSequence(
            withTiming(finalAngle, {
                duration: 3000, // 3 seconds
                easing: Easing.out(Easing.cubic),
            })
        );

        // Calculate which choice was selected (wheel spins clockwise, segments go counter-clockwise)
        const normalizedAngle = (360 - (finalAngle % 360)) % 360;
        const selectedIndex =
            Math.floor(normalizedAngle / segmentAngle) % selectedChoices.length;
        const result = selectedChoices[selectedIndex];

        // Call completion handler after animation
        setTimeout(() => {
            runOnJS(onSpinComplete)(result);
        }, 3000);
    };

    // If no choices selected, show empty wheel
    if (selectedChoices.length === 0) {
        return (
            <View style={[styles.container, { width: size, height: size }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Outer ring */}
                    <Circle
                        cx={centerX}
                        cy={centerY}
                        r={radius}
                        fill="#E8E8E8"
                        stroke={currentLabelColor}
                        strokeWidth={strokeWidth}
                    />
                    {/* Dots around the edge */}
                    {Array.from({ length: 8 }).map((_, i) => {
                        const angle = (i * 360) / 8;
                        const dotCircleRadius =
                            radius + strokeWidth / 2 - dotRadius * 2;
                        const x =
                            centerX +
                            dotCircleRadius * Math.cos((angle * Math.PI) / 180);
                        const y =
                            centerY +
                            dotCircleRadius * Math.sin((angle * Math.PI) / 180);
                        return (
                            <Circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={dotRadius}
                                fill="white"
                            />
                        );
                    })}
                </Svg>
                <View style={styles.emptyTextContainer}>
                    <CustomText style={styles.emptyText}>
                        Select choices to spin!
                    </CustomText>
                </View>
            </View>
        );
    }

    // If only one choice selected, show it in the center
    if (selectedChoices.length === 1) {
        return (
            <View style={[styles.container, { width: size, height: size }]}>
                <TouchableOpacity
                    onPress={spinWheel}
                    disabled={isSpinning}
                    activeOpacity={0.8}
                >
                    <Animated.View style={animatedStyle}>
                        <Svg
                            width={size}
                            height={size}
                            viewBox={`0 0 ${size} ${size}`}
                        >
                            {/* Outer ring */}
                            <Circle
                                cx={centerX}
                                cy={centerY}
                                r={radius}
                                fill={colors[0]}
                                stroke={currentLabelColor}
                                strokeWidth={strokeWidth}
                            />
                            {/* Dots around the edge */}
                            {Array.from({ length: 8 }).map((_, i) => {
                                const angle = (i * 360) / 8;
                                const dotCircleRadius =
                                    radius + strokeWidth / 2 - dotRadius * 2;
                                const x =
                                    centerX +
                                    dotCircleRadius *
                                        Math.cos((angle * Math.PI) / 180);
                                const y =
                                    centerY +
                                    dotCircleRadius *
                                        Math.sin((angle * Math.PI) / 180);
                                return (
                                    <Circle
                                        key={i}
                                        cx={x}
                                        cy={y}
                                        r={dotRadius}
                                        fill="white"
                                    />
                                );
                            })}
                            {/* Center text */}
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
                        </Svg>
                    </Animated.View>
                </TouchableOpacity>

                {/* Result Modal */}
                <Modal
                    visible={showResultModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowResultModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <CustomText weight="bold" style={styles.modalTitle}>
                                🎉 Result!
                            </CustomText>
                            <View
                                style={[
                                    styles.resultContainer,
                                    { backgroundColor: currentLabelColor },
                                ]}
                            >
                                <CustomText
                                    weight="bold"
                                    style={styles.resultText}
                                >
                                    {selectedResult}
                                </CustomText>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.closeButton,
                                    { backgroundColor: currentLabelColor },
                                ]}
                                onPress={() => setShowResultModal(false)}
                            >
                                <CustomText style={styles.closeButtonText}>
                                    Close
                                </CustomText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // Calculate angles for each segment
    const segmentAngle = 360 / selectedChoices.length;

    // Function to create SVG path for pie segment
    const createPath = (
        startAngle: number,
        endAngle: number,
        radius: number
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

    // Function to get text position for labels
    const getTextPosition = (angle: number, radius: number) => {
        const angleRad = (angle * Math.PI) / 180;
        const textRadius = radius * 0.7; // Position text at 70% of radius
        return {
            x: centerX + textRadius * Math.cos(angleRad),
            y: centerY + textRadius * Math.sin(angleRad),
        };
    };

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <TouchableOpacity
                onPress={spinWheel}
                disabled={isSpinning}
                activeOpacity={0.8}
            >
                <Animated.View style={animatedStyle}>
                    <Svg
                        width={size}
                        height={size}
                        viewBox={`0 0 ${size} ${size}`}
                    >
                        {/* Outer ring */}
                        <Circle
                            cx={centerX}
                            cy={centerY}
                            r={radius}
                            fill="none"
                            stroke={currentLabelColor}
                            strokeWidth={strokeWidth}
                        />

                        {/* Inner filled circle */}
                        <Circle
                            cx={centerX}
                            cy={centerY}
                            r={radius - strokeWidth / 2}
                            fill="#F8F9FA"
                        />

                        {/* Pie segments */}
                        {selectedChoices.map((choice, index) => {
                            const startAngle = index * segmentAngle - 90; // Start from top
                            const endAngle = (index + 1) * segmentAngle - 90;
                            const path = createPath(
                                startAngle,
                                endAngle,
                                radius - strokeWidth / 2
                            );
                            const color = colors[index % colors.length];

                            return (
                                <Path
                                    key={`segment-${index}`}
                                    d={path}
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                            );
                        })}

                        {/* Text labels */}
                        {selectedChoices.map((choice, index) => {
                            const midAngle = (index + 0.5) * segmentAngle - 90;
                            const textPos = getTextPosition(
                                midAngle,
                                radius - strokeWidth / 2
                            );
                            const segmentColor = colors[index % colors.length];
                            const textColor = getTextColor(segmentColor);

                            return (
                                <SvgText
                                    key={`text-${index}`}
                                    x={textPos.x}
                                    y={textPos.y}
                                    fontSize="14"
                                    fill={textColor}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    fontWeight="600"
                                    transform={
                                        selectedChoices.length > 6
                                            ? `rotate(${midAngle + 90} ${
                                                  textPos.x
                                              } ${textPos.y})`
                                            : undefined
                                    }
                                >
                                    {choice.length > 9
                                        ? choice.substring(0, 9) + "..."
                                        : choice}
                                </SvgText>
                            );
                        })}

                        {/* Dots around the edge */}
                        {Array.from({ length: 8 }).map((_, i) => {
                            const angle = (i * 360) / 8;
                            const dotCircleRadius =
                                radius + strokeWidth / 2 - dotRadius * 2;
                            const x =
                                centerX +
                                dotCircleRadius *
                                    Math.cos((angle * Math.PI) / 180);
                            const y =
                                centerY +
                                dotCircleRadius *
                                    Math.sin((angle * Math.PI) / 180);
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
                    </Svg>
                </Animated.View>
            </TouchableOpacity>

            {/* Result Modal */}
            <Modal
                visible={showResultModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowResultModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <CustomText weight="bold" style={styles.modalTitle}>
                            Result!
                        </CustomText>
                        <View
                            style={[
                                styles.resultContainer,
                                { backgroundColor: currentLabelColor },
                            ]}
                        >
                            <CustomText style={styles.resultText}>
                                {selectedResult}
                            </CustomText>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.closeButton,
                                { backgroundColor: currentLabelColor },
                            ]}
                            onPress={() => setShowResultModal(false)}
                        >
                            <CustomText style={styles.closeButtonText}>
                                Close
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        position: "relative",
        margin: 10, // Reduced margin since we sized the wheel properly
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
        fontSize: 24,
        color: "#333",
        marginBottom: 20,
    },
    resultContainer: {
        borderRadius: 15,
        paddingHorizontal: 25,
        paddingVertical: 15,
        marginBottom: 25,
    },
    resultText: {
        fontSize: 20,
        color: "#FFFFFF",
        textAlign: "center",
    },
    closeButton: {
        borderRadius: 10,
        paddingHorizontal: 30,
        paddingVertical: 12,
    },
    closeButtonText: {
        fontSize: 16,
        color: "#FFFFFF",
    },
});

export default SpinningWheel;
