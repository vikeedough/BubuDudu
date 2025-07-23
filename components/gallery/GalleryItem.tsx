import { Gallery as GalleryType } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "../CustomText";

interface GalleryItemProps {
    gallery: GalleryType;
    onPress: () => void;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ gallery, onPress }) => {
    return (
        <View style={styles.shadowContainer}>
            <TouchableOpacity
                style={[
                    styles.container,
                    { backgroundColor: `${gallery.color}40` },
                ]}
                onPress={onPress}
            >
                <Image
                    source={{ uri: gallery.cover_image }}
                    style={styles.image}
                />
                <View style={styles.locationContainer}>
                    <CustomText
                        weight="semibold"
                        style={styles.location}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {gallery.location}
                    </CustomText>
                </View>

                <CustomText weight="bold" style={styles.title}>
                    {gallery.title}
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

export default GalleryItem;

const styles = StyleSheet.create({
    shadowContainer: {
        backgroundColor: "white",
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
        alignItems: "center",
        justifyContent: "center",
    },
    container: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 15,
        width: 140,
    },
    title: {
        marginVertical: 10,
        fontSize: 14,
        color: "#774433",
    },
    image: {
        width: "100%",
        height: 85,
        borderRadius: 15,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    locationContainer: {
        marginTop: 10,
        backgroundColor: "#F9CD64",
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-start",
    },
    location: {
        fontSize: 10,
        color: Colors.brownText,
    },
});
