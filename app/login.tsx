import { User } from "@/api/endpoints/types";
import CustomText from "@/components/CustomText";
import Avatar from "@/components/home/Avatar";
import Colors from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function Login() {
    const { login } = useUserStore();
    const users = useAppStore((state) => state.users);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleLogin = () => {
        if (selectedUser) {
            login(selectedUser);
            router.replace("/");
        }
    };

    return (
        <View style={styles.container}>
            <CustomText weight="bold" style={styles.title}>
                BubuDudu
            </CustomText>
            <View style={{ flexDirection: "row", gap: 20 }}>
                <Avatar
                    image={users[0].avatar_url}
                    onPressNoteButton={() => {}}
                    onPressImage={() => {
                        setSelectedUser(users[0]);
                    }}
                    isSelected={selectedUser?.id === users[0].id}
                    hasAddMessageButton={false}
                    isBubu={false}
                    disabled={false}
                />
                <Avatar
                    image={users[1].avatar_url}
                    onPressNoteButton={() => {}}
                    onPressImage={() => {
                        setSelectedUser(users[1]);
                    }}
                    isSelected={selectedUser?.id === users[1].id}
                    hasAddMessageButton={false}
                    isBubu={true}
                    disabled={false}
                />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <CustomText weight="regular" style={styles.buttonText}>
                    Login
                </CustomText>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFF0F5",
        gap: 40,
    },
    title: {
        fontSize: 48,
        color: "black",
    },
    button: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        paddingHorizontal: 30,
        borderRadius: 15,
    },
    buttonText: {
        fontSize: 24,
        color: "white",
    },
});
