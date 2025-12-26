import { fetchUsers, uploadAvatarAndUpdateUser } from "@/api/endpoints";
import { useAppStore } from "@/stores/AppStore";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

dayjs.extend(advancedFormat);

export const getDaysUntilNextBirthday = (birthday: string) => {
    const today = dayjs();
    const birthdate = dayjs(birthday);

    let nextBirthday = birthdate.year(today.year());

    if (nextBirthday.isBefore(today, "day")) {
        nextBirthday = nextBirthday.add(1, "year");
    }

    return nextBirthday.diff(today, "day") + 1;
};

export const getToday = () => {
    return dayjs().format("dddd, Do MMMM YYYY");
};

export const getDay = () => {
    return dayjs().format("dddd");
};

export const getDate = () => {
    return dayjs().format("Do MMMM YYYY");
};

export const randomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const pickAndUploadAvatar = async (user_id: number) => {
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
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
    });

    if (result.canceled) {
        return;
    }

    const fileUri = result.assets[0].uri;
    const publicUrl = await uploadAvatarAndUpdateUser(user_id, fileUri);

    if (!publicUrl) {
        Alert.alert(
            "Upload failed",
            "Something went wrong while uploading your image. Please try again later."
        );
        return;
    }

    const updatedUsers = await fetchUsers();
    useAppStore.setState({ users: updatedUsers });
};
