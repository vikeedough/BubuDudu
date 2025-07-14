import { deleteList, fetchLists, updateList } from "@/api/endpoints/supabase";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ListContent = () => {
    const { listId, listType, listContent } = useLocalSearchParams();

    const [title, setTitle] = useState(listType as string);
    const [content, setContent] = useState(listContent as string);

    const handleBack = async () => {
        if (title.length === 0) {
            Alert.alert("Error", "Please enter a name for the list!");
            return;
        }

        if (content !== listContent || title !== listType) {
            const success = await updateList(listId as string, title, content);
            if (success) {
                const updatedLists = await fetchLists();
                useAppStore.setState({ lists: updatedLists });
                router.replace("/lists");
            } else {
                Alert.alert(
                    "Error",
                    "Failed to update list content. Please try again later."
                );
            }
        } else {
            router.back();
        }
    };

    const handleDeleteList = async () => {
        const success = await deleteList(listId as string);
        if (success) {
            const updatedLists = await fetchLists();
            useAppStore.setState({ lists: updatedLists });
            router.replace("/lists");
        } else {
            Alert.alert(
                "Error",
                "Failed to delete list. Please try again later."
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleBack}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Back
                    </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteList}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Delete List
                    </CustomText>
                </TouchableOpacity>
            </View>
            <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter the name of the list"
            />
            <TextInput
                style={styles.contentInput}
                multiline
                value={content}
                onChangeText={setContent}
                placeholder="Enter your list content here"
            />
        </SafeAreaView>
    );
};

export default ListContent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    deleteButton: {
        backgroundColor: Colors.red,
        padding: 10,
        borderRadius: 15,
    },
    headerButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.white,
    },
    title: {
        fontSize: 24,
    },
    contentInput: {
        fontSize: 16,
        paddingVertical: 10,
        fontFamily: "Raleway-Regular",
    },
    titleInput: {
        fontSize: 24,
        fontFamily: "Raleway-Bold",
        paddingVertical: 10,
    },
});
