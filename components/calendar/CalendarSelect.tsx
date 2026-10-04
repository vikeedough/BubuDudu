import React, { createContext, useContext, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";

import CenteredModal from "@/components/common/CenteredModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

type Selection = {
    label: string; value: string; options: readonly (readonly [string, string])[];
    onChange: (value: string) => void;
};
type Position = { top: number; left: number; width: number };
const SelectContext = createContext<{
    label: string | null;
    open: (selection: Selection, anchor: React.ComponentRef<typeof TouchableOpacity> | null) => void;
} | null>(null);

// The Expenses dropdown is an overlay outside its form scroll area. Keep the
// same arrangement so Android hit testing and small-screen scrolling work.
export function CalendarSelectModal(props: React.ComponentProps<typeof CenteredModal>) {
    const [selection, setSelection] = useState<Selection | null>(null);
    const [position, setPosition] = useState<Position>({ top: 100, left: 20, width: 200 });
    const { width, height } = useWindowDimensions();
    const open = (next: Selection, anchor: React.ComponentRef<typeof TouchableOpacity> | null) => {
        if (selection?.label === next.label) { setSelection(null); return; }
        Keyboard.dismiss();
        setSelection(next);
        anchor?.measureInWindow((x, y, controlWidth, controlHeight) => {
            const menuHeight = Math.min(220, next.options.length * 44);
            const below = y + controlHeight + 6;
            setPosition({
                top: Math.max(12, Math.min(below + menuHeight <= height - 24 ? below : y - menuHeight - 6, height - menuHeight - 24)),
                left: Math.max(12, Math.min(x, width - controlWidth - 12)),
                width: controlWidth,
            });
        });
    };
    return <SelectContext.Provider value={{ label: selection?.label ?? null, open }}>
        <CenteredModal {...props} onClose={() => { if (selection) setSelection(null); else props.onClose(); }} overlay={selection && <>
            <Pressable accessibilityLabel="Close selection" style={StyleSheet.absoluteFill} onPress={() => setSelection(null)} />
            <View style={[styles.dropdown, position]}>
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.options}>
                    {selection.options.map(([text, key]) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`${selection.label}: ${text}`} accessibilityState={{ selected: key === selection.value }}
                        style={[styles.option, key === selection.value && styles.selected]} onPress={() => { setSelection(null); selection.onChange(key); }}>
                        <CustomText weight="semibold" style={styles.optionText}>{text}</CustomText>
                    </TouchableOpacity>)}
                </ScrollView>
            </View>
        </>} />
    </SelectContext.Provider>;
}
export default function CalendarSelect(props: Selection) {
    const context = useContext(SelectContext);
    const ref = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
    return <View style={styles.row}>
        <CustomText weight="semibold" style={styles.label}>{props.label}</CustomText>
        <TouchableOpacity ref={ref} accessibilityRole="button" accessibilityLabel={props.label} accessibilityState={{ expanded: context?.label === props.label }}
            style={styles.button} onPress={() => context?.open(props, ref.current)}>
            <CustomText weight="extrabold" style={styles.value}>{props.options.find(([, key]) => key === props.value)?.[0] ?? "Custom"}</CustomText>
            <CustomText style={styles.chevron}>{"\u2304"}</CustomText>
        </TouchableOpacity>
    </View>;
}
const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    label: { flex: 1, fontSize: 12, color: Colors.darkGreenText },
    button: { flex: 1.3, minHeight: 42, borderWidth: 1, borderColor: "#EBEAEC", borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
    value: { flex: 1, fontSize: 13, color: Colors.darkGreenText, textAlign: "center" },
    chevron: { color: Colors.gray, fontSize: 14 },
    dropdown: { position: "absolute", borderWidth: 1, borderColor: "#EBEAEC", borderRadius: 10, backgroundColor: Colors.white, overflow: "hidden", elevation: 100, shadowColor: Colors.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
    options: { maxHeight: 220 },
    option: { minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#F2F1F3" },
    selected: { backgroundColor: Colors.yellow },
    optionText: { fontSize: 12, color: Colors.darkGreenText },
});
