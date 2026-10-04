import glyphMap from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json";

import {
    EXPENSE_CATEGORY_ICON_CATALOGUE,
    EXPENSE_CATEGORY_ICONS,
    getExpenseCategoryIcon,
    searchExpenseCategoryIcons,
} from "@/utils/expense-category-icons";

it("uses only keys in the installed MaterialCommunityIcons glyph map", () => {
    expect(EXPENSE_CATEGORY_ICONS).toHaveLength(112);
    expect(new Set(EXPENSE_CATEGORY_ICONS).size).toBe(EXPENSE_CATEGORY_ICONS.length);
    for (const icon of EXPENSE_CATEGORY_ICONS) expect(glyphMap).toHaveProperty(icon);
    for (const entry of EXPENSE_CATEGORY_ICON_CATALOGUE) {
        expect(entry.label.length).toBeGreaterThan(0);
        expect(entry.keywords.length).toBeGreaterThan(0);
    }
});
it.each([
    [null, "Food", "silverware-fork-knife"], [undefined, "Dining", "silverware-fork-knife"],
    ["invalid-legacy-icon", "Transport", "car"], ["", "Custom", "tag-outline"],
    ["gift", "Food", "gift"], [null, " rent ", "home"], [null, "Income", "cash"],
])("resolves legacy, invalid and selected icons", (icon, name, expected) => {
    expect(getExpenseCategoryIcon(icon, name)).toBe(expected);
});

it.each([
    ["food", "silverware-fork-knife"], ["coffee", "coffee"], ["car", "car"],
    ["bus", "bus"], ["plane", "airplane"], ["shopping", "shopping"],
    ["game", "gamepad-variant"], ["health", "pill"], ["home", "home"],
    ["money", "piggy-bank"], ["salary", "cash-multiple"], ["rent", "key"],
    ["taxes", "file-percent-outline"], ["insurance", "shield-check"],
])("matches useful keyword %s", (query, expected) => {
    expect(searchExpenseCategoryIcons(query).map((entry) => entry.name)).toContain(expected);
});

it("searches labels and tags with multiple terms, ignores case/whitespace, and handles no results", () => {
    expect(searchExpenseCategoryIcons("  FOOD  restaurant ").map((entry) => entry.name)).toContain("silverware-fork-knife");
    expect(searchExpenseCategoryIcons("  ")).toEqual(EXPENSE_CATEGORY_ICON_CATALOGUE);
    expect(searchExpenseCategoryIcons("no-match-xyz")).toEqual([]);
    expect(searchExpenseCategoryIcons("airplane").map((entry) => entry.name)).toContain("airplane");
    expect(searchExpenseCategoryIcons("car").map((entry) => entry.name)).not.toContain("credit-card-outline");
    expect(searchExpenseCategoryIcons("car").map((entry) => entry.name)).not.toContain("bottle-tonic-plus");
    expect(searchExpenseCategoryIcons("cof").map((entry) => entry.name)).toContain("coffee");
});
