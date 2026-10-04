import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { evaluateExpenseExpression, updateExpenseExpression } from "@/utils/expense-calculator";

const KEYS = ["clear", "backspace", "÷", "×", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "=", "0", "."];

export default function ExpenseAmountCalculator({ amount, onResult }: {
    amount: string;
    onResult: (result: string) => void;
}) {
    const [expression, setExpression] = useState("");
    const [error, setError] = useState("");
    const [isResult, setIsResult] = useState(false);
    useEffect(() => {
        const normalized = amount.replace(/,/g, "").trim();
        setExpression(/^\d+(?:\.\d*)?$/.test(normalized) ? normalized : "");
        setError("");
    }, [amount]);

    const pressKey = (key: string) => {
        setError("");
        if (key === "=") {
            try {
                const result = evaluateExpenseExpression(expression);
                setExpression(result);
                setIsResult(true);
                onResult(result);
            } catch (failure) {
                setError(failure instanceof Error ? failure.message : "Invalid expression.");
            }
            return;
        }
        setExpression(updateExpenseExpression(isResult && /^[\d.]$/.test(key) ? "" : expression, key));
        setIsResult(false);
    };

    return (
        <View style={styles.container}>
            <CustomText accessibilityLabel="Calculator expression" weight="semibold" style={styles.expression}>
                {expression.replace(/[+−×÷]/g, " $& ") || "0"}
            </CustomText>
            {!!error && <CustomText accessibilityRole="alert" style={styles.error}>{error}</CustomText>}
            <View style={styles.grid}>
                {KEYS.map((key) => (
                    <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`Calculator ${key}`}
                        style={[styles.key, /[+−×÷=]/.test(key) && styles.operator]} onPress={() => pressKey(key)}>
                        <CustomText weight="bold" style={styles.keyText}>{key === "clear" ? "C" : key === "backspace" ? "⌫" : key}</CustomText>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 10, gap: 8 },
    expression: { color: Colors.darkGreenText, fontSize: 16, minHeight: 24 },
    error: { color: Colors.red, fontSize: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    key: { width: "23%", minHeight: 44, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#EBEAEC", alignItems: "center", justifyContent: "center" },
    operator: { backgroundColor: Colors.yellow },
    keyText: { color: Colors.brownText, fontSize: 18 },
});
