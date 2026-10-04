import { evaluateExpenseExpression, updateExpenseExpression } from "@/utils/expense-calculator";

describe("expense calculator", () => {
    it.each([
        ["10+5", "15.00"], ["10−3", "7.00"], ["4×2.5", "10.00"],
        ["20÷4", "5.00"], ["10+2×3", "16.00"], ["12.50 + 4.90", "17.40"],
        ["0.1+0.2", "0.30"], ["1÷3", "0.3333"], ["2−4÷2+3×2", "6.00"],
    ])("evaluates %s with precedence and money precision", (expression, result) => {
        expect(evaluateExpenseExpression(expression)).toBe(result);
    });
    it.each(["", "10+", "10++2", "1.2.3", "20÷0", "20÷0.0", "2−3", "0", "(2+3)", "2%", "1e3", "alert(1)"])("rejects invalid amount %s", (expression) => {
        expect(() => evaluateExpenseExpression(expression)).toThrow();
    });
    it("safely builds decimals, replaces repeated operators, clears and backspaces", () => {
        expect(updateExpenseExpression("", ".")).toBe("0.");
        expect(updateExpenseExpression("1.2", ".")).toBe("1.2");
        expect(updateExpenseExpression("10+", "×")).toBe("10×");
        expect(updateExpenseExpression("", "÷")).toBe("");
        expect(updateExpenseExpression("12+", ".")).toBe("12+0.");
        expect(updateExpenseExpression("12.5", "clear")).toBe("");
        expect(updateExpenseExpression("12.5", "backspace")).toBe("12.");
        expect(updateExpenseExpression("", "backspace")).toBe("");
    });
});
