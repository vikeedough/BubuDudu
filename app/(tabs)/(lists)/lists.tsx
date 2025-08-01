import { addNewList, fetchLists, updateList } from "@/api/endpoints";
import { List } from "@/api/endpoints/types";
import DebonHeart from "@/assets/svgs/debon-heart.svg";
import TrashIcon from "@/assets/svgs/trash-bin.svg";
import CustomText from "@/components/CustomText";
import DeleteListModal from "@/components/lists/DeleteListModal";
import { Colors, listColorsArray } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { getDate } from "@/utils/home";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Lists = () => {
    const lists = useAppStore((state) => state.lists);
    const date = getDate();
    const [selectedList, setSelectedList] = useState<List | null>(null);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (lists.length > 0) {
            setSelectedList(lists[0]);
            setNoteTitle(lists[0].type);
            setNoteContent(lists[0].content);
            setSelectedIndex(0);
        }
    }, [lists]);

    const findIndex = (index: number) => {
        return index % 6;
    };

    const handleListSelect = (list: List, index: number) => {
        setSelectedList(list);
        setNoteTitle(list.type);
        setNoteContent(list.content);
        setSelectedIndex(index);
    };

    const handleAddEmptyList = () => {
        lists.push({
            id: "",
            type: "",
            content: "",
            last_updated_at: "",
        });
        setSelectedList(lists[lists.length - 1]);
        setNoteTitle(lists[lists.length - 1].type);
        setNoteContent(lists[lists.length - 1].content);
        setSelectedIndex(lists.length - 1);
    };

    const handleSaveList = async (list: List, index: number) => {
        setIsLoading(true);
        if (noteTitle.length === 0) {
            Alert.alert("Error", "Please enter a name for the note!");
            return;
        }

        if (list.id === "") {
            const success = await addNewList(noteTitle, noteContent);
            if (success) {
                const updatedLists = await fetchLists();
                useAppStore.setState({ lists: updatedLists });
                setIsLoading(false);
                return;
            } else {
                Alert.alert(
                    "Error",
                    "Failed to add new list. Please try again later."
                );
            }
        }

        if (
            noteContent !== lists[index].content ||
            noteTitle !== lists[index].content
        ) {
            const success = await updateList(list.id, noteTitle, noteContent);
            if (success) {
                const updatedLists = await fetchLists();
                useAppStore.setState({ lists: updatedLists });
            } else {
                Alert.alert(
                    "Error",
                    "Failed to update list content. Please try again later."
                );
            }
        }
        setIsLoading(false);
    };

    const labelItem = (list: List, index: number) => {
        const isSelected = selectedIndex === index;
        return (
            <TouchableOpacity
                style={[
                    styles.labelContainer,
                    {
                        backgroundColor: listColorsArray[findIndex(index)],
                    },
                    !isSelected && styles.unselectedLabel,
                ]}
                onPress={() => handleListSelect(list, index)}
            >
                <View
                    style={[
                        styles.labelTextWrapper,
                        {
                            right: isSelected ? 15 : 20,
                        },
                    ]}
                >
                    <CustomText
                        weight="semibold"
                        style={styles.labelText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {list.type}
                    </CustomText>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <DeleteListModal
                    isOpen={isDeleteListModalOpen}
                    onClose={() => setIsDeleteListModalOpen(false)}
                    selectedList={selectedList as List}
                />
                <View style={styles.header}>
                    <CustomText weight="extrabold" style={styles.headerTitle}>
                        Notes
                    </CustomText>
                    <CustomText weight="medium" style={styles.headerDate}>
                        {date}
                    </CustomText>
                </View>
                <View style={styles.contentContainer}>
                    <DebonHeart
                        style={styles.debonHeart}
                        width={130}
                        height={130}
                    />
                    <View style={styles.labelsContainer}>
                        <FlatList
                            data={lists}
                            style={{ marginBottom: 5 }}
                            renderItem={({
                                item,
                                index,
                            }: {
                                item: List;
                                index: number;
                            }) => labelItem(item, index)}
                            ItemSeparatorComponent={() => (
                                <View style={{ height: 5 }} />
                            )}
                        />
                        <TouchableOpacity
                            style={styles.addListLabel}
                            onPress={handleAddEmptyList}
                        >
                            <CustomText
                                weight="medium"
                                style={styles.addListLabelText}
                            >
                                +
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.noteContainer}>
                        <View style={{ flex: 1 }}>
                            {selectedList?.id !== "" && (
                                <TouchableOpacity
                                    style={styles.trashIcon}
                                    onPress={() =>
                                        setIsDeleteListModalOpen(true)
                                    }
                                >
                                    <TrashIcon />
                                </TouchableOpacity>
                            )}
                            <TextInput
                                style={styles.noteTitle}
                                placeholder="Title"
                                placeholderTextColor={Colors.darkGreenText}
                                value={noteTitle}
                                onChangeText={setNoteTitle}
                            />
                            <TextInput
                                style={styles.noteContent}
                                placeholder="Type something here..."
                                placeholderTextColor={Colors.darkGreenText}
                                value={noteContent}
                                onChangeText={setNoteContent}
                                multiline={true}
                                textAlignVertical="top"
                            />
                        </View>
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFCC7D" />
                        ) : (
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={() =>
                                    handleSaveList(
                                        selectedList as List,
                                        selectedIndex
                                    )
                                }
                            >
                                <CustomText
                                    weight="semibold"
                                    style={styles.saveButtonText}
                                >
                                    Save
                                </CustomText>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default Lists;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        backgroundColor: Colors.backgroundPink,
        paddingLeft: 15,
    },
    header: {
        marginBottom: 20,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    headerButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    headerDate: {
        fontSize: 12,
        color: Colors.darkGreenText,
    },
    contentContainer: {
        flex: 1,
        flexDirection: "row",
        marginBottom: 70,
    },
    labelsContainer: {
        zIndex: 100,
        width: 70,
        paddingLeft: 0,
    },
    addListLabel: {
        height: 57,
        backgroundColor: "#AFAFAF",
        justifyContent: "center",
        alignItems: "center",
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
        paddingLeft: 15,
        marginLeft: 15,
    },
    addListLabelText: {
        fontSize: 32,
        color: Colors.black,
        right: 20,
    },
    labelContainer: {
        height: 90,
        backgroundColor: Colors.red,
        justifyContent: "center",
        alignItems: "center",
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
    },
    unselectedLabel: {
        paddingLeft: 15,
        marginLeft: 15,
    },
    labelText: {
        fontSize: 12,
        color: Colors.white,
    },
    labelTextWrapper: {
        transform: [{ rotate: "-90deg" }],
        width: 80, // width when rotated becomes height
        height: 20,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center", // align to left (before rotation)
    },
    noteContainer: {
        flex: 1,
        flexDirection: "column",
        width: "100%",
        right: 30,
        backgroundColor: Colors.white,
        borderRadius: 15,
        zIndex: 200,
        padding: 20,
        paddingBottom: 40,
    },
    noteTitle: {
        fontSize: 16,
        color: "black",
        marginBottom: 10,
        fontFamily: "Raleway-ExtraBold",
    },
    noteContent: {
        fontSize: 12,
        color: "black",
        fontFamily: "Raleway-Medium",
    },
    saveButton: {
        backgroundColor: "#FFCC7D",
        padding: 10,
        borderRadius: 15,
        width: 157,
        height: 35,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginTop: 0,
        marginBottom: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    saveButtonText: {
        color: Colors.brownText,
        fontSize: 14,
    },
    trashIcon: {
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 1000,
    },
    debonHeart: {
        position: "absolute",
        right: 40,
        top: -90,
        zIndex: -10,
        width: 100,
        height: 100,
        transform: [{ scaleX: -1 }],
    },
});
