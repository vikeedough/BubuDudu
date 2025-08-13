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
                <View>
                    <Image
                        source={{ uri: gallery.cover_image }}
                        placeholder={gallery.cover_image_blur_hash}
                        transition={200}
                        style={styles.image}
                        cachePolicy="memory-disk"
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
                </View>

                <CustomText
                    weight="bold"
                    style={styles.title}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                >
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
        flex: 1,
    },
    container: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 15,
        flex: 1,
        minHeight: 150,
        justifyContent: "flex-start",
    },
    title: {
        marginTop: 10,
        fontSize: 14,
        color: "#774433",
        lineHeight: 18,
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
        justifyContent: "center",
        alignItems: "center",
    },
    location: {
        fontSize: 10,
        color: Colors.brownText,
        textAlign: "center",
        paddingLeft: 3,
        paddingRight: 2,
    },
});
