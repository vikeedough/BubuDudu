import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { User } from "@/api/endpoints/types";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

const Avatar = ({
    image,
    isSelected,
    onPress,
    color,
    name,
    textColor,
}: {
    image: string;
    isSelected: boolean;
    onPress: () => void;
    color: string;
    name: string;
    textColor: string;
}) => {
    return (
        <View
            style={[{ alignItems: "center" }, !isSelected && { opacity: 0.5 }]}
        >
            <View style={[styles.nameContainer, { backgroundColor: color }]}>
                <CustomText
                    weight="bold"
                    style={[styles.name, { color: textColor }]}
                >
                    {name}
                </CustomText>
            </View>
            <TouchableOpacity
                onPress={onPress}
                style={[styles.avatarContainer, { borderColor: color }]}
            >
                <Image
                    source={{ uri: image }}
                    style={styles.avatar}
                    contentFit="cover"
                />
            </TouchableOpacity>
        </View>
    );
};

export default function Login() {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleLogin = () => {
        if (selectedUser) {
            router.replace("/(tabs)/initial");
        }
    };

    return (
        <View>
            <CustomText>Legacy login screen.</CustomText>
        </View>
        // <View style={styles.container}>
        //     {!selectedUser && (
        //         <DebonQuestion
        //             style={styles.debonQuestion}
        //             width={342}
        //             height={260}
        //         />
        //     )}

        //     {/* Light up effect from heart */}
        //     {selectedUser && (
        //         <View
        //             style={[
        //                 styles.debonHeartContainer,
        //                 selectedUser?.id === users[1].id && {
        //                     transform: [{ scaleX: -1 }],
        //                 },
        //             ]}
        //         >
        //             {/* Outer glow */}
        //             <View
        //                 style={[
        //                     styles.outerGlow,
        //                     {
        //                         backgroundColor:
        //                             selectedUser?.id === users[1].id
        //                                 ? "#F49AA320"
        //                                 : "#89B8C220",
        //                     },
        //                 ]}
        //             />
        //             {/* Middle glow */}
        //             <View
        //                 style={[
        //                     styles.middleGlow,
        //                     {
        //                         backgroundColor:
        //                             selectedUser?.id === users[1].id
        //                                 ? "#F49AA330"
        //                                 : "#89B8C230",
        //                     },
        //                 ]}
        //             />
        //             {/* Inner glow */}
        //             <View
        //                 style={[
        //                     styles.innerGlow,
        //                     {
        //                         backgroundColor:
        //                             selectedUser?.id === users[1].id
        //                                 ? "#F49AA350"
        //                                 : "#89B8C250",
        //                     },
        //                 ]}
        //             />
        //             {/* Heart */}
        //             <DebonHeart
        //                 style={styles.debonHeart}
        //                 width={333}
        //                 height={333}
        //             />
        //         </View>
        //     )}

        //     {/* Main content centered on screen */}
        //     <View style={styles.centerContent}>
        //         {/* Avatar containers */}
        //         <View style={styles.avatarsRow}>
        //             <Avatar
        //                 image={users[0].avatar_url}
        //                 onPress={() => {
        //                     setSelectedUser(users[0]);
        //                 }}
        //                 isSelected={selectedUser?.id === users[0].id}
        //                 color={"#89B8C2"}
        //                 textColor={"#3D575C"}
        //                 name={"Dudu"}
        //             />
        //             <Avatar
        //                 image={users[1].avatar_url}
        //                 onPress={() => {
        //                     setSelectedUser(users[1]);
        //                 }}
        //                 isSelected={selectedUser?.id === users[1].id}
        //                 color={"#E47083"}
        //                 name={"Bubu"}
        //                 textColor={"#A44952"}
        //             />
        //         </View>

        //         {/* Components below avatars */}
        //         <View style={styles.bottomContent}>
        //             <CustomText weight="bold" style={styles.title}>
        //                 {selectedUser
        //                     ? "Hello " + selectedUser.name + "!"
        //                     : "Pick one!"}
        //             </CustomText>
        //             {selectedUser && (
        //                 <TouchableOpacity
        //                     style={styles.button}
        //                     onPress={handleLogin}
        //                 >
        //                     <CustomText weight="bold" style={styles.buttonText}>
        //                         Me!
        //                     </CustomText>
        //                 </TouchableOpacity>
        //             )}
        //         </View>
        //     </View>
        // </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF0F5",
        justifyContent: "center",
        alignItems: "center",
    },
    centerContent: {
        alignItems: "center",
        gap: 30,
    },
    avatarsRow: {
        flexDirection: "row",
        gap: 20,
    },
    bottomContent: {
        alignItems: "center",
        marginTop: 50,
        gap: 20,
    },
    title: {
        fontSize: 24,
        color: "#505739",
    },
    button: {
        backgroundColor: "#FFCC7D",
        padding: 10,
        paddingHorizontal: 80,
        marginTop: 50,
        marginBottom: -90,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonText: {
        fontSize: 20,
        color: Colors.brownText,
    },
    debonQuestion: {
        position: "absolute",
        bottom: -60,
        left: -50,
        transform: [{ rotate: "90deg" }],
    },
    avatarContainer: {
        borderWidth: 8,
        borderRadius: 999,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 999,
    },
    nameContainer: {
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        width: 134,
        paddingVertical: 5,
        marginBottom: 40,
    },
    name: {
        fontSize: 16,
    },
    debonHeartContainer: {
        position: "absolute",
        alignSelf: "center",
        top: "40%",
        marginTop: -166.5, // Half of the container height
        width: 333,
        height: 333,
        justifyContent: "center",
        alignItems: "center",
    },
    debonHeart: {
        position: "absolute",
    },
    outerGlow: {
        position: "absolute",
        width: 600,
        height: 600,
        top: -93.5, // Center relative to heart
        left: -195, // Center relative to heart
        borderRadius: 300,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        shadowColor: "#FFE4B5",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 80,
    },
    middleGlow: {
        position: "absolute",
        width: 400,
        height: 400,
        top: 6.5, // Center relative to heart
        left: -95, // Center relative to heart
        borderRadius: 200,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        shadowColor: "#FFCC7D",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 50,
    },
    innerGlow: {
        position: "absolute",
        width: 250,
        height: 250,
        top: 81.5, // Center relative to heart
        left: -20, // Center relative to heart
        borderRadius: 125,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        shadowColor: "#FFB347",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 30,
    },
});
