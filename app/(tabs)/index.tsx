import { updateNote } from "@/api/endpoints/supabase";
import CustomText from "@/components/CustomText";
import Avatar from "@/components/home/Avatar";
import MilestoneTracker from "@/components/home/MilestoneTracker";
import NoteModal from "@/components/home/NoteModal";
import QuoteContainer from "@/components/home/QuoteContainer";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { getToday, pickAndUploadAvatar } from "@/utils/home";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = () => {
    const milestones = useAppStore((state) => state.milestones);
    const users = useAppStore((state) => state.users);
    const currentUser = useUserStore((state) => state.currentUser);
    const today = getToday();

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const handleOpenNoteModal = () => {
        setIsNoteModalOpen(true);
    };

    const handleCloseNoteModal = () => {
        setIsNoteModalOpen(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.ellipse} />
            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={handleCloseNoteModal}
                updateNote={updateNote}
                user_id={currentUser?.id ?? 0}
            />
            <View style={styles.header}>
                <CustomText weight="extrabold" style={styles.headerText}>
                    Hello {currentUser?.name}!
                </CustomText>
                <CustomText weight="medium" style={styles.dateText}>
                    {today}
                </CustomText>
            </View>
            <View style={styles.debonContainer}>
                <Image
                    source={require("@/assets/images/debon-left.png")}
                    style={styles.debonImage}
                    resizeMode="contain"
                />
                <QuoteContainer />
            </View>
            <View style={styles.milestonesContainer}>
                <View style={{ flexDirection: "row", gap: 20 }}>
                    <MilestoneTracker
                        id={milestones[1].id}
                        title={milestones[1].title}
                        date={milestones[1].date}
                        image={require("@/assets/images/dudu.jpg")}
                        milestoneKey={0}
                    />
                    <MilestoneTracker
                        id={milestones[0].id}
                        title={milestones[0].title}
                        date={milestones[0].date}
                        image={require("@/assets/images/bubu.jpg")}
                        milestoneKey={1}
                    />
                </View>
                <View
                    style={{
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <MilestoneTracker
                        id={milestones[2].id}
                        title={milestones[2].title}
                        date={milestones[2].date}
                        image={require("@/assets/images/anniversary.jpg")}
                        milestoneKey={2}
                    />
                </View>
            </View>
            <View style={styles.avatarsContainer}>
                <View>
                    <TouchableOpacity
                        style={[styles.messageBubble, styles.duduMessageBubble]}
                        onPress={handleOpenNoteModal}
                    >
                        <CustomText
                            weight="semibold"
                            style={styles.messageText}
                        >
                            {users[0].note
                                ? users[0].note
                                : "Dudu has no note yet!"}
                        </CustomText>
                    </TouchableOpacity>
                    <Avatar
                        image={users[0].avatar_url}
                        onPressNoteButton={handleOpenNoteModal}
                        onPressImage={() => pickAndUploadAvatar(users[0].id)}
                        isSelected={false}
                        hasAddMessageButton={currentUser?.id === users[0].id}
                        isBubu={false}
                        disabled={currentUser?.id !== users[0].id}
                    />
                </View>
                <View>
                    <TouchableOpacity
                        style={[styles.messageBubble, styles.bubuMessageBubble]}
                    >
                        <CustomText
                            weight="semibold"
                            style={styles.messageText}
                        >
                            {users[1].note
                                ? users[1].note
                                : "Bubu has no note yet!"}
                        </CustomText>
                    </TouchableOpacity>
                    <Avatar
                        image={users[1].avatar_url}
                        onPressNoteButton={handleOpenNoteModal}
                        onPressImage={() => pickAndUploadAvatar(users[1].id)}
                        isSelected={false}
                        hasAddMessageButton={currentUser?.id === users[1].id}
                        isBubu={true}
                        disabled={currentUser?.id !== users[1].id}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 25,
        backgroundColor: Colors.backgroundPink,
    },
    header: {
        marginBottom: 10,
    },
    headerText: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    dateText: {
        fontSize: 12,
        color: Colors.darkGreenText,
    },
    messageBubble: {
        position: "absolute",
        bottom: -27,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 15,
        maxWidth: "100%",
        marginHorizontal: "auto",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    avatarsContainer: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 40,
        justifyContent: "center",
    },
    duduMessageBubble: {
        backgroundColor: Colors.yellow,
    },
    bubuMessageBubble: {
        backgroundColor: Colors.yellow,
    },
    messageText: {
        fontSize: 11,
        color: Colors.brownText,
        textAlign: "center",
    },
    debonContainer: {
        marginHorizontal: -25,
        flexDirection: "row",
        gap: 20,
    },
    debonImage: {
        width: 150,
        height: 150,
        // position: "absolute",
        // bottom: -60,
        left: 0,
    },
    milestonesContainer: {
        gap: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    ellipse: {
        width: 500, // Initial width of the "circle"
        height: 500, // Initial height of the "circle"
        borderRadius: 250, // Half of the width/height to make it circular
        transform: [{ scaleX: 1.5 }], // Scale along the X-axis to create an oval
        position: "absolute",
        backgroundColor: Colors.green,
        top: -240,
        left: -50,
    },
});

export default Home;
