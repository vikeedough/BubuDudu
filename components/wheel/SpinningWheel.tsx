import DebonSpin from "@/assets/svgs/debon-spin.svg";
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
import { Colors } from "react-native/Libraries/NewAppScreen";
import CustomText from "../CustomText";

interface SpinningWheelProps {
    selectedChoices: string[];
    selectedIndex: number;
}

const SpinningWheel: React.FC<SpinningWheelProps> = ({
    selectedChoices,
    selectedIndex,
}) => {
    const size = 360;
    const strokeWidth = 18;
    const dotRadius = 4;
    const radius = 160; // Bigger radius for a more prominent wheel
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
        "white", // White segments
        lightenColor(currentLabelColor, 0.9), // Very light version
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

        // Directly pick a random choice for true randomness
        const randomChoiceIndex = Math.floor(
            Math.random() * selectedChoices.length
        );
        const result = selectedChoices[randomChoiceIndex];

        // Calculate random rotation (15-25 full rotations + land on the selected segment)
        const fullRotations = Math.floor(Math.random() * 11) + 15; // 15-25 rotations
        const segmentAngle = 360 / selectedChoices.length;

        // Calculate the angle to land on the randomly selected choice
        // The pointer is at the top, so we need the middle of the target segment to end up at the top
        // Segments start at -90 degrees, so segment randomChoiceIndex middle is at:
        const segmentMiddle =
            randomChoiceIndex * segmentAngle - 90 + segmentAngle / 2;

        // To get this segment middle to the top (-90 degrees), we need to rotate by:
        // rotation = -90 - segmentMiddle = -90 - (randomChoiceIndex * segmentAngle - 90 + segmentAngle / 2)
        const targetRotation =
            -randomChoiceIndex * segmentAngle - segmentAngle / 2;
        const finalAngle = fullRotations * 360 + targetRotation;

        // Animate the wheel
        rotation.value = withSequence(
            withTiming(finalAngle, {
                duration: 4000, // 4 seconds for more dramatic effect
                easing: Easing.out(Easing.cubic),
            })
        );

        // Call completion handler after animation
        setTimeout(() => {
            runOnJS(onSpinComplete)(result);
        }, 4000);
    };

    // If no choices selected, show empty wheel
    if (selectedChoices.length === 0) {
        return (
            <View
                style={[
                    styles.container,
                    {
                        width: size,
                        height: size,
                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 5,
                        },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 5,
                    },
                ]}
            >
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
                    activeOpacity={1}
                    style={{
                        position: "relative",
                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 5,
                        },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 5,
                    }}
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

                    {/* Fixed center pointer that doesn't rotate */}
                    <Svg
                        style={{ position: "absolute", top: 0, left: 0 }}
                        width={size}
                        height={size}
                        viewBox={`0 0 ${size} ${size}`}
                        pointerEvents="none"
                    ></Svg>
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
                            <DebonSpin style={styles.debonSpin} />
                            <CustomText weight="bold" style={styles.modalTitle}>
                                Debon picked!
                            </CustomText>
                            <View style={[styles.resultContainer]}>
                                <CustomText
                                    weight="semibold"
                                    style={styles.resultText}
                                >
                                    {selectedResult}
                                </CustomText>
                                <CustomText
                                    weight="regular"
                                    style={styles.debonText}
                                >
                                    Debon's stomach agrees too.
                                </CustomText>
                            </View>
                            <TouchableOpacity
                                style={[styles.closeButton]}
                                onPress={() => setShowResultModal(false)}
                            >
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
        const textRadius = radius * 0.65; // Position text at 55% of radius (further from edge)
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
                activeOpacity={1}
                style={{
                    position: "relative",
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 5,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                }}
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
                                    strokeWidth={2} // ← numeric, not string
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
                                    fontSize={16} // ← numeric
                                    fill={textColor}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    fontWeight="600" // ← use “600” or “bold”
                                    transform={`rotate(${midAngle + 180} ${
                                        textPos.x
                                    } ${textPos.y})`}
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

                {/* Fixed center pointer that doesn't rotate */}
                <Svg
                    style={{ position: "absolute", top: 0, left: 0 }}
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    pointerEvents="none"
                >
                    {/* Center pointer circle with tip */}
                    <Circle
                        cx={centerX}
                        cy={centerY}
                        r={25}
                        fill={currentLabelColor}
                    />
                    {/* Pointer tip pointing upward */}
                    <Path
                        d={`M ${centerX} ${centerY - 45} L ${centerX - 22} ${
                            centerY - 5
                        } L ${centerX + 22} ${centerY - 5} Z`}
                        fill={currentLabelColor}
                    />
                </Svg>
            </TouchableOpacity>

            {/* Result Modal */}
            {showResultModal && (
                <Modal
                    visible={showResultModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowResultModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <DebonSpin style={styles.debonSpin} />
                            <CustomText weight="bold" style={styles.modalTitle}>
                                Debon picked!
                            </CustomText>
                            <View style={[styles.resultContainer]}>
                                <CustomText
                                    weight="semibold"
                                    style={styles.resultText}
                                >
                                    {selectedResult}
                                </CustomText>
                                <CustomText
                                    weight="regular"
                                    style={styles.debonText}
                                >
                                    Debon's stomach agrees too.
                                </CustomText>
                            </View>
                            <TouchableOpacity
                                style={[styles.closeButton]}
                                onPress={() => setShowResultModal(false)}
                            >
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
            )}
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
