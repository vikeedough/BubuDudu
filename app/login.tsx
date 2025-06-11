import { User } from "@/api/endpoints/types";
import Avatar from "@/components/home/Avatar";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
            <Text style={styles.title}>BubuDudu</Text>
            {users.length > 0 && (
                <View style={{ flexDirection: "row", gap: 20 }}>
                    <Avatar
                        image={users[0].avatar_url}
                        onPress={() => {
                            setSelectedUser(users[0]);
                        }}
                        isSelected={selectedUser?.id === users[0].id}
                        hasAddMessageButton={false}
                        isBubu={false}
                    />
                    <Avatar
                        image={users[1].avatar_url}
                        onPress={() => {
                            setSelectedUser(users[1]);
                        }}
                        isSelected={selectedUser?.id === users[1].id}
                        hasAddMessageButton={false}
                        isBubu={true}
                    />
                </View>
            )}
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        gap: 40,
    },
    title: {
        fontSize: 48,
        fontWeight: "bold",
        color: "black",
    },
    button: {
        backgroundColor: "#b2e1de",
        padding: 10,
        paddingHorizontal: 30,
        borderRadius: 15,
    },
    buttonText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "white",
    },
});
