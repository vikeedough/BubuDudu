import { type ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

export const shadowStyle: ViewStyle = {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
};
