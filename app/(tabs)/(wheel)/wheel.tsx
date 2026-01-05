import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import Plus from "@/assets/svgs/plus.svg";
import TrashIcon from "@/assets/svgs/trash-bin.svg";
import CustomText from "@/components/CustomText";
import DeleteWheelModal from "@/components/wheel/DeleteWheelModal";
import EditChoicesModal from "@/components/wheel/EditChoicesModal";
import SpinningWheel from "@/components/wheel/SpinningWheel";
import WheelHeader from "@/components/wheel/WheelHeader";
import { Colors, listColorsArray } from "@/constants/colors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useWheelStore } from "@/stores/WheelStore";
import { getDate } from "@/utils/home";

const Wheel = () => {
    const currentDate = getDate();

    const wheels = useWheelStore((s) => s.wheels);
    const fetchWheels = useWheelStore((s) => s.fetchWheels);
    const addWheel = useWheelStore((s) => s.addWheel);
    const updateTitle = useWheelStore((s) => s.updateWheelTitle);
    const deleteWheelAction = useWheelStore((s) => s.deleteWheel);
    const isDraftOpen = useWheelStore((s) => s.isDraftOpen);
    const openDraft = useWheelStore((s) => s.openDraft);
    const closeDraft = useWheelStore((s) => s.closeDraft);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [localTitle, setLocalTitle] = useState("");
    const [isEditChoicesModalOpen, setIsEditChoicesModalOpen] = useState(false);
    const [isDeleteWheelModalOpen, setIsDeleteWheelModalOpen] = useState(false);
    const [currentSelections, setCurrentSelections] = useState<string[]>([]);
    const debounceTimeoutRef = useRef<number | null>(null);
    const [isDeletingWheel, setIsDeletingWheel] = useState(false);
    const { refreshing, onRefresh } = usePullToRefresh(fetchWheels);

    const wheelsForUI = isDraftOpen
        ? [
              ...wheels,
              {
                  id: "__DRAFT__",
                  title: localTitle,
                  choices: [],
                  created_at: "",
                  space_id: "",
              } as any,
          ]
        : wheels;
    const wheelNames = wheelsForUI.map((wheel) => wheel.title);

    useEffect(() => {
        fetchWheels();
    }, [fetchWheels]);

    // Update local title when selected wheel changes
    useEffect(() => {
        const selected = wheelsForUI[selectedIndex];
        if (!selected) return;
        setLocalTitle(selected.title || "");
    }, [selectedIndex, wheelsForUI]);

    // Debounced function to update wheel title
    const debouncedUpdateTitle = useCallback(
        (wheelId: string, newTitle: string) => {
            if (debounceTimeoutRef.current)
                clearTimeout(debounceTimeoutRef.current);

            debounceTimeoutRef.current = setTimeout(async () => {
                const title = newTitle.trim();
                if (title === "") return;

                try {
                    // draft/empty -> create
                    if (wheelId === "__DRAFT__") {
                        const newWheel = await addWheel(title, []);
                        closeDraft();
                        // select created wheel
                        const idx = useWheelStore
                            .getState()
                            .wheels.findIndex((w) => w.id === newWheel.id);
                        setSelectedIndex(idx === -1 ? 0 : idx);

                        setLocalTitle(newWheel.title ?? "");
                        return;
                    }

                    // existing -> update
                    if (title !== wheels[selectedIndex]?.title) {
                        await updateTitle(wheelId, title);
                    }
                } catch {
                    // optional: show toast / alert
                }
            }, 500);
        },
        [addWheel, closeDraft, updateTitle, wheels, selectedIndex]
    );

    const handleTitleChange = (newTitle: string) => {
        setLocalTitle(newTitle);

        const selected = wheelsForUI[selectedIndex];
        if (!selected) return;

        debouncedUpdateTitle(selected.id, newTitle);
    };

    const handleAddEmptyWheel = () => {
        openDraft();
        setSelectedIndex(wheels.length); // points to the appended draft item in wheelsForUI
        setLocalTitle("");
        setCurrentSelections([]);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const handleDeleteWheel = async () => {
        setIsDeletingWheel(true);
        try {
            const wheelId = wheelsForUI[selectedIndex]?.id;
            if (!wheelId || wheelId === "__DRAFT__") return;

            await deleteWheelAction(wheelId);

            setSelectedIndex(0);
            setLocalTitle(useWheelStore.getState().wheels[0]?.title ?? "");
            setCurrentSelections([]);
            setIsDeleteWheelModalOpen(false);
        } finally {
            setIsDeletingWheel(false);
        }
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
                <View style={{ zIndex: 1000 }}>
                    <EditChoicesModal
                        isOpen={isEditChoicesModalOpen}
                        onClose={() => setIsEditChoicesModalOpen(false)}
                        wheel={wheelsForUI[selectedIndex]}
                    />
                </View>
            )}
            {isDeleteWheelModalOpen && (
                <View style={{ zIndex: 1000 }}>
                    <DeleteWheelModal
                        isOpen={isDeleteWheelModalOpen}
                        onClose={() => setIsDeleteWheelModalOpen(false)}
                        handleDeleteWheel={handleDeleteWheel}
                    />
                </View>
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
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                    >
                        <WheelHeader currentDate={currentDate} />
                        <View>
                            <DebonLyingDown
                                height={160}
                                width={160}
                                style={styles.debonLyingDown}
                            />
                            <View style={styles.wheelContainer}>
                                <SpinningWheel
                                    selectedChoices={currentSelections}
                                    selectedIndex={selectedIndex}
                                />
                            </View>
                        </View>

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
                                    <Plus style={styles.addListLabelText} />
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
                                    <View
                                        style={styles.controlButtonsContainer}
                                    >
                                        <TouchableOpacity
                                            style={styles.editChoicesButton}
                                            onPress={() =>
                                                setIsDeleteWheelModalOpen(true)
                                            }
                                        >
                                            {isDeletingWheel ? (
                                                <ActivityIndicator size="small" />
                                            ) : (
                                                <TrashIcon
                                                    width={14}
                                                    height={14}
                                                />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.editChoicesButton}
                                            onPress={() =>
                                                setIsEditChoicesModalOpen(true)
                                            }
                                        >
                                            <Plus />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.choicesList}>
                                    {wheelsForUI.length > selectedIndex &&
                                    wheelsForUI[selectedIndex] &&
                                    wheelsForUI[selectedIndex].choices &&
                                    Array.isArray(
                                        wheelsForUI[selectedIndex].choices
                                    ) &&
                                    wheelsForUI[selectedIndex].choices.length >
                                        0 ? (
                                        wheelsForUI[selectedIndex].choices.map(
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
        paddingHorizontal: 25,
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
        marginTop: 10,
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
    },
    selectedChoice: {
        backgroundColor: "#FFCC7D",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
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
    controlButtonsContainer: {
        flexDirection: "row",
        gap: 10,
    },
    debonLyingDown: {
        position: "absolute",
        top: -60,
        right: 10,
        zIndex: 100,
    },
    wheelContainer: {
        zIndex: 1000,
    },
});
