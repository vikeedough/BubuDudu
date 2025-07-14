import { List } from "@/api/endpoints/types";
import CustomText from "@/components/CustomText";
import { Colors, listColorsArray } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { getDate, getDay } from "@/utils/home";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Lists = () => {
    const lists = useAppStore((state) => state.lists);
    const day = getDay();
    const date = getDate();
    const [selectedList, setSelectedList] = useState<List | null>(null);

    useEffect(() => {
        if (lists.length > 0) {
            setSelectedList(lists[0]);
        }
    }, [lists]);

    const findIndex = (index: number) => {
        return index % 6;
    };

    const handleListSelect = (list: List) => {
        setSelectedList(list);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <CustomText weight="extrabold" style={styles.headerTitle}>
                    {day}
                </CustomText>
                <CustomText weight="medium" style={styles.headerDate}>
                    {date}
                </CustomText>
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.labelsContainer}>
                    <FlatList
                        data={lists}
                        style={{ marginBottom: 60 }}
                        renderItem={({
                            item,
                            index,
                        }: {
                            item: List;
                            index: number;
                        }) => (
                            <TouchableOpacity
                                style={[
                                    styles.labelContainer,
                                    {
                                        backgroundColor:
                                            listColorsArray[findIndex(index)],
                                    },
                                ]}
                                onPress={() => handleListSelect(item)}
                            >
                                <View style={styles.labelTextWrapper}>
                                    <CustomText
                                        weight="semibold"
                                        style={styles.labelText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {item.type}
                                    </CustomText>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => (
                            <View style={{ height: 5 }} />
                        )}
                    />
                </View>
                <View style={styles.noteContainer}>
                    <CustomText weight="extrabold" style={styles.noteTitle}>
                        {selectedList ? selectedList.type : "No List Selected"}
                    </CustomText>
                    <CustomText weight="medium" style={styles.noteContent}>
                        {selectedList ? selectedList.content : ""}
                    </CustomText>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Lists;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        backgroundColor: Colors.backgroundPink,
        paddingHorizontal: 30,
    },
    header: {
        marginBottom: 20,
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
        width: 57,
    },
    labelContainer: {
        height: 90,
        backgroundColor: Colors.red,
        justifyContent: "center",
        alignItems: "center",
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
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
        right: 15,
    },
    noteContainer: {
        width: "90%",
        right: 30,
        backgroundColor: Colors.white,
        borderRadius: 15,
        zIndex: 200,
        padding: 20,
    },
    noteTitle: {
        fontSize: 16,
        color: "black",
        marginBottom: 10,
    },
    noteContent: {
        fontSize: 12,
        color: "black",
    },
});
