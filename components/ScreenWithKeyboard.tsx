import { ReactNode } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    View,
} from "react-native";

export default function ScreenWithKeyboard({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={80}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>{children}</View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
