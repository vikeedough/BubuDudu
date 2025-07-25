import {
    addNewWheel,
    fetchWheels,
    updateWheelTitle,
} from "@/api/endpoints/supabase";
import CustomText from "@/components/CustomText";
import EditChoicesModal from "@/components/wheel/EditChoicesModal";
import SpinningWheel from "@/components/wheel/SpinningWheel";
import WheelHeader from "@/components/wheel/WheelHeader";
import { Colors, listColorsArray } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { getDate } from "@/utils/home";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Wheel = () => {
    const { logout } = useUserStore();
    const currentDate = getDate();

    const wheels = useAppStore((state) => state.wheels);
    const wheelNames = wheels.map((wheel) => wheel.title);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [localTitle, setLocalTitle] = useState("");
    const [isEditChoicesModalOpen, setIsEditChoicesModalOpen] = useState(false);
    const [currentSelections, setCurrentSelections] = useState<string[]>([]);
    const debounceTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        console.log("Wheels:", wheels);
    }, [wheels]);

    // Update local title when selected wheel changes
    useEffect(() => {
        if (wheels.length > selectedIndex && wheels[selectedIndex]) {
            setLocalTitle(wheels[selectedIndex].title || "");
        }
    }, [selectedIndex, wheels]);

    // Debounced function to update wheel title
    const debouncedUpdateTitle = useCallback(
        (wheelId: string, newTitle: string) => {
            // Clear existing timeout
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            // Set new timeout
            debounceTimeoutRef.current = setTimeout(async () => {
                if (wheelId === "" && newTitle.trim() !== "") {
                    const success = await addNewWheel(newTitle.trim(), []);
                    if (success) {
                        const updatedWheels = await fetchWheels();
                        useAppStore.setState({ wheels: updatedWheels });
                        return;
                    }
                }

                if (
                    newTitle.trim() !== "" &&
                    newTitle !== wheels[selectedIndex]?.title
                ) {
                    const success = await updateWheelTitle(
                        wheelId,
                        newTitle.trim()
                    );
                    if (success) {
                        // Refresh wheels data
                        const updatedWheels = await fetchWheels();
                        useAppStore.setState({ wheels: updatedWheels });
                    }
                }
            }, 500); // 500ms delay
        },
        [wheels, selectedIndex]
    );

    const handleTitleChange = (newTitle: string) => {
        setLocalTitle(newTitle);

        // Call debounce for both existing wheels and new wheels (with empty id)
        if (wheels.length > selectedIndex && wheels[selectedIndex]) {
            debouncedUpdateTitle(wheels[selectedIndex].id, newTitle);
        }
    };

    const handleAddEmptyWheel = () => {
        wheels.push({
            id: "",
            title: "",
            choices: [],
            created_at: "",
        });
        setSelectedIndex(wheels.length - 1);
        setLocalTitle(wheels[wheels.length - 1].title);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    const findIndex = (index: number) => {
        return index % 6;
    };

    const handleLabelSelect = (index: number) => {
        setSelectedIndex(index);
        setCurrentSelections([]);
    };

    const LabelItem = ({ item, index }: { item: string; index: number }) => {
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
                onPress={() => handleLabelSelect(index)}
            >
                <View style={styles.labelTextWrapper}>
                    <CustomText
                        weight="semibold"
                        style={styles.labelText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item}
                    </CustomText>
                </View>
            </TouchableOpacity>
        );
    };

    const ChoiceItem = ({ item }: { item: string }) => {
        const isSelected = currentSelections.includes(item);

        return (
            <TouchableOpacity
                style={[
                    styles.selectableChoice,
                    isSelected && styles.selectedChoice,
                ]}
                onPress={() => handleChoiceSelect(item)}
            >
                <CustomText weight="semibold" style={styles.choiceText}>
                    {item}
                </CustomText>
            </TouchableOpacity>
        );
    };

    const handleChoiceSelect = (choice: string) => {
        setCurrentSelections((prev) => {
            if (prev.includes(choice)) {
                return prev.filter((item) => item !== choice);
            }
            return [...prev, choice];
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {isEditChoicesModalOpen && (
                <EditChoicesModal
                    isOpen={isEditChoicesModalOpen}
                    onClose={() => setIsEditChoicesModalOpen(false)}
                    wheel={wheels[selectedIndex]}
                />
            )}
            <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 50}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={false}
                    >
                        <WheelHeader currentDate={currentDate} />
                        <SpinningWheel
                            selectedChoices={currentSelections}
                            selectedIndex={selectedIndex}
                        />
                        <View style={styles.wheelOptionsContainer}>
                            <View style={styles.labelsContainer}>
                                <FlatList
                                    data={wheelNames}
                                    renderItem={({ item, index }) => (
                                        <LabelItem item={item} index={index} />
                                    )}
                                    keyExtractor={(item, index) =>
                                        `${item}-${index}`
                                    }
                                    horizontal={true}
                                    nestedScrollEnabled={true}
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    scrollEnabled={true}
                                    alwaysBounceVertical={false}
                                    directionalLockEnabled={true}
                                    style={styles.flatList}
                                    ItemSeparatorComponent={() => (
                                        <View style={{ width: 5 }} />
                                    )}
                                />
                                <TouchableOpacity
                                    style={styles.addListLabel}
                                    onPress={handleAddEmptyWheel}
                                >
                                    <CustomText
                                        weight="medium"
                                        style={styles.addListLabelText}
                                    >
                                        +
                                    </CustomText>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.choicesContainer}>
                                <View style={styles.wheelTitleHeader}>
                                    <TextInput
                                        style={styles.wheelTitle}
                                        value={localTitle}
                                        onChangeText={handleTitleChange}
                                        placeholder="Enter wheel title..."
                                        placeholderTextColor={Colors.gray}
                                    />
                                    <TouchableOpacity
                                        style={styles.editChoicesButton}
                                        onPress={() =>
                                            setIsEditChoicesModalOpen(true)
                                        }
                                    >
                                        <CustomText
                                            weight="semibold"
                                            style={styles.editChoicesButtonText}
                                        >
                                            +
                                        </CustomText>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.choicesList}>
                                    {wheels.length > selectedIndex &&
                                    wheels[selectedIndex] &&
                                    wheels[selectedIndex].choices &&
                                    Array.isArray(
                                        wheels[selectedIndex].choices
                                    ) &&
                                    wheels[selectedIndex].choices.length > 0 ? (
                                        wheels[selectedIndex].choices.map(
                                            (choice: string, index: number) => (
                                                <ChoiceItem
                                                    item={choice}
                                                    key={`${choice}-${index}`}
                                                />
                                            )
                                        )
                                    ) : (
                                        <CustomText
                                            style={styles.noChoicesText}
                                        >
                                            No choices available for this wheel
                                        </CustomText>
                                    )}
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
            {/* <Button title="logout" onPress={handleLogout} /> */}
            {/* <FlatList
                data={wheels}
                renderItem={renderWheelItem}
                keyExtractor={(item) => item.id}
            /> */}
        </SafeAreaView>
    );
};

export default Wheel;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingBottom: 70,
        paddingHorizontal: 25,
    },
    wheelItem: {
        backgroundColor: "white",
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
    },
    wheelTitle: {
        fontSize: 20,
        color: "black",
        fontFamily: "Raleway-ExtraBold",
    },
    choiceItem: {
        marginLeft: 10,
        marginTop: 4,
    },

    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    wheelOptionsContainer: {
        marginTop: 20,
        flex: 1,
    },
    choicesContainer: {
        flex: 1,
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 15,
        marginTop: -25,
        zIndex: 200,
    },
    choiceText: {
        fontSize: 11,
        color: Colors.brownText,
    },
    noChoicesText: {
        textAlign: "center",
        fontSize: 16,
        color: Colors.gray,
        fontStyle: "italic",
        marginTop: 20,
    },
    flatList: {
        flexGrow: 0,
        flexShrink: 1,
    },
    labelsContainer: {
        zIndex: 100,
        height: 70,
        paddingTop: 0,
        flexDirection: "row",
        alignItems: "flex-end",
    },
    addListLabel: {
        width: 30,
        height: 55,
        backgroundColor: "#AFAFAF",
        justifyContent: "flex-start",
        alignItems: "center",
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        marginTop: 15,
        marginLeft: 5,
    },
    addListLabelText: {
        fontSize: 32,
        color: Colors.black,
        marginTop: -3,
    },
    labelContainer: {
        width: 90,
        height: 70,
        backgroundColor: Colors.red,
        justifyContent: "center",
        alignItems: "center",
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
    },
    unselectedLabel: {
        paddingTop: 15,
        marginTop: 15,
        height: 60,
    },
    labelText: {
        fontSize: 12,
        color: Colors.white,
    },
    labelTextWrapper: {
        width: 80,
        height: 20,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        bottom: 20,
    },
    selectableChoice: {
        backgroundColor: "#FFCC7D40",
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
        marginBottom: 10,
    },
    selectedChoice: {
        backgroundColor: "#FFCC7D",
    },
    choicesList: {
        marginTop: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    wheelTitleHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    editChoicesButton: {
        backgroundColor: "white",
        width: 28,
        height: 28,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    editChoicesButtonText: {
        fontSize: 32,
        marginTop: -6,
    },
});
