import { updateNote } from "@/api/endpoints";
import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import SignOutButton from "@/components/auth/sign-out-button";
import CustomText from "@/components/CustomText";
import Avatar from "@/components/home/Avatar";
import MilestoneTracker from "@/components/home/MilestoneTracker";
import NoteModal from "@/components/home/NoteModal";
import QuoteContainer from "@/components/home/QuoteContainer";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
// TEMPORARILY COMMENTED OUT - MIGRATION IN PROGRESS
// import { useUserStore } from "@/stores/UserStore";
import { useAuthContext } from "@/hooks/useAuthContext";
import { getToday, pickAndUploadAvatar } from "@/utils/home";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = () => {
    // TEMPORARILY COMMENTED OUT - MIGRATION IN PROGRESS
    // const { logout } = useUserStore();
    // const isLoggedIn = useUserStore((state) => state.isLoggedIn);
    // const currentUser = useUserStore((state) => state.currentUser);

    // USE AUTH CONTEXT INSTEAD
    const { profile, session, isLoggedIn } = useAuthContext();
    const milestones = useAppStore((state) => state.milestones);
    const users = useAppStore((state) => state.users);
    const today = getToday();

    console.log("I am here", profile);

    const [uploadingAvatarUserId, setUploadingAvatarUserId] = useState<
        number | null
    >(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    // TEMPORARILY COMMENTED OUT - AuthProvider handles redirect now
    useEffect(() => {
        if (!isLoggedIn) {
            router.replace("/(login)");
        }
    }, [isLoggedIn]);

    const handlePickAndUploadAvatar = async (user_id: number) => {
        setUploadingAvatarUserId(user_id);
        await pickAndUploadAvatar(user_id);
        setUploadingAvatarUserId(null);
    };

    const handleOpenNoteModal = () => {
        setIsNoteModalOpen(true);
    };

    const handleCloseNoteModal = () => {
        setIsNoteModalOpen(false);
    };

    const handleLogout = () => {
        // TEMPORARILY COMMENTED OUT - Use SignOutButton component instead
        // logout();
        console.log("Use the SignOut button in the header instead");
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.ellipse} />
            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={handleCloseNoteModal}
                updateNote={updateNote}
                user_id={0} // TODO: Replace with actual user_id from profile
            />
            <View style={styles.header}>
                <CustomText weight="extrabold" style={styles.headerText}>
                    Hello Guest!
                </CustomText>
                <CustomText weight="medium" style={styles.dateText}>
                    {today}
                </CustomText>
                <SignOutButton />
            </View>
            <View style={styles.debonContainer}>
                <TouchableOpacity onLongPress={handleLogout}>
                    <DebonLyingDown
                        width={175}
                        height={175}
                        style={styles.debonImage}
                    />
                </TouchableOpacity>
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
                        disabled={true} // TODO: Re-enable after migration
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
                        onPressImage={() =>
                            handlePickAndUploadAvatar(users[0].id)
                        }
                        isUploadingAvatar={
                            uploadingAvatarUserId === users[0].id
                        }
                        isSelected={false}
                        hasAddMessageButton={false} // TODO: Re-enable after migration
                        isBubu={false}
                        disabled={true} // TODO: Re-enable after migration
                    />
                </View>
                <View>
                    <TouchableOpacity
                        style={[styles.messageBubble, styles.bubuMessageBubble]}
                        onPress={handleOpenNoteModal}
                        disabled={true} // TODO: Re-enable after migration
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
                        onPressImage={() =>
                            handlePickAndUploadAvatar(users[1].id)
                        }
                        isUploadingAvatar={
                            uploadingAvatarUserId === users[1].id
                        }
                        isSelected={false}
                        hasAddMessageButton={false} // TODO: Re-enable after migration
                        isBubu={true}
                        disabled={true} // TODO: Re-enable after migration
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
        gap: 0,
    },
    debonImage: {
        left: -20,
    },
    milestonesContainer: {
        gap: 20,
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
