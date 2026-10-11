// Custom entry retains Expo Router initialization and registers only Android's
// headless widget task. iOS/Web never import the Android native library.
import "expo-router/entry";
import { Platform } from "react-native";

if (Platform.OS === "android") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require("react-native-android-widget");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { calendarWidgetTask } = require("./widgets/calendar/android-task");
    registerWidgetTaskHandler(calendarWidgetTask);
}
