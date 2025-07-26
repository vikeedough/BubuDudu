import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import CustomText from "../CustomText";

interface SpinningWheelProps {
    selectedChoices: string[];
}

const SpinningWheel: React.FC<SpinningWheelProps> = ({ selectedChoices }) => {
    const size = 320;
    const strokeWidth = 18;
    const dotRadius = 4;
    const radius = 140; // Bigger radius for a more prominent wheel
    const centerX = size / 2;
    const centerY = size / 2;

    // Colors for the wheel segments - only 2 colors from the image
    const colors = [
        "#20C997", // Teal/Green (matches the border)
        "#B8F5E8", // Light mint/teal
    ];

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
                        stroke="#20C997"
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
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Outer ring */}
                    <Circle
                        cx={centerX}
                        cy={centerY}
                        r={radius}
                        fill={colors[0]}
                        stroke="#20C997"
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
                    {/* Center text */}
                    <SvgText
                        x={centerX}
                        y={centerY}
                        fontSize="18"
                        fill="#333"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontWeight="600"
                    >
                        {selectedChoices[0]}
                    </SvgText>
                </Svg>
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
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Outer ring */}
                <Circle
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill="none"
                    stroke="#20C997"
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

                    return (
                        <SvgText
                            key={`text-${index}`}
                            x={textPos.x}
                            y={textPos.y}
                            fontSize="14"
                            fill="#333"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fontWeight="600"
                            transform={
                                selectedChoices.length > 6
                                    ? `rotate(${midAngle + 90} ${textPos.x} ${
                                          textPos.y
                                      })`
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
                        dotCircleRadius * Math.cos((angle * Math.PI) / 180);
                    const y =
                        centerY +
                        dotCircleRadius * Math.sin((angle * Math.PI) / 180);
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
});

export default SpinningWheel;
