import { useUserStore } from "@/stores/UserStore";
import { router } from "expo-router";
import { Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Wheel = () => {
    const { logout } = useUserStore();

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    return (
        <SafeAreaView style={styles.container}>
            <Button title="logout" onPress={handleLogout} />
        </SafeAreaView>
    );
};

export default Wheel;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
});
