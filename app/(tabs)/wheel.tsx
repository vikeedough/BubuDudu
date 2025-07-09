import CustomText from "@/components/CustomText";
import ChoiceItem from "@/components/wheel/ChoiceItem";
import Colors from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { router } from "expo-router";
import { Button, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Wheel = () => {
    const { logout } = useUserStore();
    const choices = useAppStore((state) => state.choices);

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.wheelContainer}>
                <CustomText>wheel here</CustomText>
            </View>
            <View style={styles.choicesContainer}>
                <Button title="logout" onPress={handleLogout} />
                <FlatList
                    data={choices}
                    renderItem={({ item }) => <ChoiceItem choice={item} />}
                    numColumns={2}
                />
            </View>
        </SafeAreaView>
    );
};

export default Wheel;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
    },
    wheelContainer: {
        flex: 0.8,
        justifyContent: "center",
        alignItems: "center",
    },
    choicesContainer: {
        flex: 0.2,
        justifyContent: "center",
        alignItems: "center",
    },
});
