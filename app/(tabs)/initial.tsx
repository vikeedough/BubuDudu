import { fetchQuotes } from "@/api/endpoints";
import { updateProfileNote } from "@/api/endpoints/profiles";
import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import CustomText from "@/components/CustomText";
import Avatar from "@/components/home/Avatar";
import MilestoneTracker from "@/components/home/MilestoneTracker";
import NoteModal from "@/components/home/NoteModal";
import QuoteContainer from "@/components/home/QuoteContainer";
import { Colors } from "@/constants/colors";
// TEMPORARILY COMMENTED OUT - MIGRATION IN PROGRESS
// import { useUserStore } from "@/stores/UserStore";
import { fetchProfiles } from "@/api/endpoints/profiles";
import { Profile, Quote } from "@/api/endpoints/types";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { getToday, pickAndUploadAvatar } from "@/utils/home";
import { getSpaceId } from "@/utils/secure-store";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = () => {
    // TEMPORARILY COMMENTED OUT - MIGRATION IN PROGRESS
    // const { logout } = useUserStore();
    // const isLoggedIn = useUserStore((state) => state.isLoggedIn);
    // const currentUser = useUserStore((state) => state.currentUser);

    // USE AUTH CONTEXT INSTEAD
    const { profile, session, isLoggedIn, refreshProfile, updateProfile } =
        useAuthContext();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
    const [isLoadingEverything, setIsLoadingEverything] = useState(true);

    const milestone = useMilestoneStore((s) => s.milestone);
    const fetchMilestone = useMilestoneStore((s) => s.fetchMilestone);

    useEffect(() => {
        fetchMilestone();
    }, [fetchMilestone]);

    const today = getToday();

    useEffect(() => {
        const loadData = async () => {
            const fetchedSpaceId = await getSpaceId();

            if (!fetchedSpaceId || !session) {
                console.log("No space ID found or no session");
                return;
            }

            setSpaceId(fetchedSpaceId);

            const [quotesData, profilesData] = await Promise.all([
                fetchQuotes(fetchedSpaceId),
                fetchProfiles(fetchedSpaceId),
            ]);

            setQuotes(quotesData);
            setUserProfiles(profilesData);
            setIsLoadingEverything(false);
        };

        loadData();
    }, [session?.user?.id]);

    const [uploadingAvatarUserId, setUploadingAvatarUserId] = useState<
        string | null
    >(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const refreshProfiles = async () => {
        if (!spaceId) return;
        const profilesData = await fetchProfiles(spaceId);
        setUserProfiles(profilesData);
    };

    // TEMPORARILY COMMENTED OUT - AuthProvider handles redirect now
    useEffect(() => {
        if (!isLoggedIn) {
            router.replace("/(login)");
        }
    }, [isLoggedIn]);

    const myId = session?.user?.id;
    const me = profile;
    const partner = userProfiles.find((p) => p.id !== myId);

    const handlePickAndUploadAvatar = async () => {
        setUploadingAvatarUserId(me?.id || null);
        const newUrl = await pickAndUploadAvatar();
        if (!newUrl) {
            Alert.alert("Error", "Failed to upload avatar.");
            setUploadingAvatarUserId(null);
            return;
        }
        await updateProfile({ avatar_url: newUrl });
        setUserProfiles((prev) =>
            prev.map((p) =>
                p.id === me?.id ? { ...p, avatar_url: newUrl } : p
            )
        );
        setUploadingAvatarUserId(null);
    };

    const handleOpenNoteModal = () => {
        setIsNoteModalOpen(true);
    };

    const handleCloseNoteModal = async () => {
        await refreshProfile();
        setIsNoteModalOpen(false);
    };

    const handleLogout = () => {
        // TEMPORARILY COMMENTED OUT - Use SignOutButton component instead
        // logout();
        console.log("Use the SignOut button in the header instead");
    };

    // Show loading while space data is being fetched
    if (isLoadingEverything || !me) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.ellipse} />
            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={handleCloseNoteModal}
                updateNote={updateProfileNote}
                onSaved={refreshProfiles}
            />
            <View style={styles.header}>
                <CustomText weight="extrabold" style={styles.headerText}>
                    Hello {profile?.name ?? "there"}!
                </CustomText>
                <CustomText weight="medium" style={styles.dateText}>
                    {today}
                </CustomText>
                {/* <SignOutButton />
                <Button
                    title="Settings"
                    onPress={() => router.push("/(settings)")}
                /> */}
            </View>
            <View style={styles.debonContainer}>
                <TouchableOpacity onLongPress={handleLogout}>
                    <DebonLyingDown
                        width={175}
                        height={175}
                        style={styles.debonImage}
                    />
                </TouchableOpacity>
                <QuoteContainer quotes={quotes} />
            </View>
            <View style={styles.milestonesContainer}>
                <View style={{ flexDirection: "row", gap: 20 }}>
                    <MilestoneTracker
                        title={me?.name + "'s Birthday"}
                        date={me?.date_of_birth}
                        image={require("@/assets/images/dudu.jpg")}
                        milestoneKey={0}
                    />
                    <MilestoneTracker
                        title={
                            partner
                                ? partner.name + "'s Birthday"
                                : "Partner's Birthday"
                        }
                        date={partner ? partner.date_of_birth : null}
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
                        title={
                            milestone
                                ? milestone.title
                                : "No shared milestone yet!"
                        }
                        date={milestone ? milestone.date : null}
                        image={require("@/assets/images/anniversary.jpg")}
                        milestoneKey={2}
                    />
                </View>
            </View>
            <View style={styles.avatarsContainer}>
                {me && (
                    <View>
                        <TouchableOpacity
                            style={[
                                styles.messageBubble,
                                styles.duduMessageBubble,
                            ]}
                            onPress={handleOpenNoteModal}
                            disabled={false}
                        >
                            <CustomText
                                weight="semibold"
                                style={styles.messageText}
                            >
                                {me?.note ? me.note : "You have no note yet!"}
                            </CustomText>
                        </TouchableOpacity>
                        <Avatar
                            image={me.avatar_url}
                            onPressNoteButton={handleOpenNoteModal}
                            onPressImage={() => handlePickAndUploadAvatar()}
                            isUploadingAvatar={uploadingAvatarUserId === me.id}
                            isSelected={false}
                            hasAddMessageButton={true}
                            isBubu={false}
                            disabled={false}
                        />
                    </View>
                )}
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
                            {partner
                                ? partner.note ??
                                  "Your partner has no note yet!"
                                : "Invite your partner to join!"}
                        </CustomText>
                    </TouchableOpacity>
                    <Avatar
                        image={partner?.avatar_url}
                        onPressNoteButton={handleOpenNoteModal}
                        onPressImage={() => {}}
                        isUploadingAvatar={
                            uploadingAvatarUserId === partner?.id
                        }
                        isSelected={false}
                        hasAddMessageButton={false}
                        isBubu={true}
                        disabled={true}
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
