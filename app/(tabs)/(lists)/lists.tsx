import { List } from "@/api/endpoints/types";
import CustomText from "@/components/CustomText";
import ListItem from "@/components/lists/ListItem";
import ListModal from "@/components/lists/ListModal";
import Colors from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Lists = () => {
    const lists = useAppStore((state) => state.lists);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navigateToListContent = (list: List) => {
        router.push({
            pathname: "/(tabs)/(lists)/listContent",
            params: {
                listId: list.id,
                listType: list.type,
                listContent: list.content,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ListModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => setIsModalOpen(true)}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Add New List
                    </CustomText>
                </TouchableOpacity>
            </View>
            <FlatList
                data={lists}
                renderItem={({ item }: { item: List }) => (
                    <ListItem
                        list={item}
                        onPress={() => navigateToListContent(item)}
                    />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
};

export default Lists;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
    },
    separator: {
        height: 15,
    },
    headerButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
});
