import { roundMoney } from "@/utils/expenses";

const OPERATOR = /[+−×÷]/;

export function updateExpenseExpression(expression: string, key: string): string {
    if (key === "clear") return "";
    if (key === "backspace") return expression.slice(0, -1);
    if (/^\d$/.test(key)) return expression + key;
    if (key === ".") {
        const number = expression.split(OPERATOR).pop() ?? "";
        if (number.includes(".")) return expression;
        return expression + (number === "" ? "0." : ".");
    }
    if (/^[+−×÷]$/.test(key) && expression) {
        // Replace a trailing operator instead of creating an invalid pair.
        return OPERATOR.test(expression.slice(-1))
            ? expression.slice(0, -1) + key
            : expression + key;
    }
    return expression;
}

export function evaluateExpenseExpression(expression: string): string {
    const source = expression.replace(/\s/g, "");
    if (!/^\d+(?:\.\d*)?(?:[+−×÷]\d+(?:\.\d*)?)*$/.test(source)) {
        throw new Error("Complete the expression first.");
    }
    const numbers = source.split(OPERATOR).map(Number);
    const operators = source.match(/[+−×÷]/g) ?? [];
    let total = 0;
    let term = numbers[0];
    let sign = 1;
    for (let i = 0; i < operators.length; i += 1) {
        const next = numbers[i + 1];
        switch (operators[i]) {
            case "×": term *= next; break;
            case "÷":
                if (next === 0) throw new Error("Cannot divide by zero.");
                term /= next;
                break;
            default:
                total += sign * term;
                sign = operators[i] === "+" ? 1 : -1;
                term = next;
        }
    }
    const result = roundMoney(total + sign * term);
    if (!Number.isFinite(result) || result <= 0) {
        throw new Error("Amount must be greater than zero.");
    }
    // Match the app's four-decimal storage precision, with at least two decimals.
    return result.toFixed(4).replace(/(\.\d{2})0+$/, "$1").replace(/(\.\d{3})0$/, "$1");
}
