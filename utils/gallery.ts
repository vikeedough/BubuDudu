import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export const pickMultipleImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
        Alert.alert(
            "Permission required",
            "Please allow access to your gallery."
        );
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        // allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: true,
    });

    if (result.canceled) {
        return;
    }

    const images = result.assets.map((asset) => asset.uri);

    return images;
};

export const convertDate = (date: string) => {
    const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));

    return formatted;
};
