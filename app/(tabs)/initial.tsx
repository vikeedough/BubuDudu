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

import { fetchQuotes } from "@/api/endpoints";
import { fetchProfiles, updateProfileNote } from "@/api/endpoints/profiles";
import { Profile, Quote } from "@/api/endpoints/types";
import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import SignOutButton from "@/components/auth/sign-out-button";
import CustomText from "@/components/CustomText";
import AvatarDisplay from "@/components/home/AvatarDisplay";
import MilestoneTracker from "@/components/home/MilestoneTracker";
import NoteModal from "@/components/home/NoteModal";
import QuoteContainer from "@/components/home/QuoteContainer";
import { Colors } from "@/constants/colors";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { getToday, pickAndUploadAvatar } from "@/utils/home";
import { getSpaceId } from "@/utils/secure-store";

const Home = () => {
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

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const refreshProfiles = async () => {
        if (!spaceId) return;
        const profilesData = await fetchProfiles(spaceId);
        setUserProfiles(profilesData);
    };

    useEffect(() => {
        if (!isLoggedIn) {
            router.replace("/(login)");
        }
    }, [isLoggedIn]);

    const myId = session?.user?.id;
    const me = profile;
    const partner = userProfiles.find((p) => p.id !== myId);

    const handlePickAndUploadAvatar = async () => {
        const newUrl = await pickAndUploadAvatar();
        if (!newUrl) {
            Alert.alert("Error", "Failed to upload avatar.");
            return;
        }
        await updateProfile({ avatar_url: newUrl });
        setUserProfiles((prev) =>
            prev.map((p) =>
                p.id === me?.id ? { ...p, avatar_url: newUrl } : p
            )
        );
    };

    const handleOpenNoteModal = () => {
        setIsNoteModalOpen(true);
    };

    const handleCloseNoteModal = async () => {
        await refreshProfile();
        setIsNoteModalOpen(false);
    };

    const handleNavigateToSettings = () => {
        router.push("/(settings)");
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
                <SignOutButton />
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
            </View>
            <View style={styles.debonContainer}>
                <TouchableOpacity onLongPress={handleNavigateToSettings}>
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
                <View style={styles.bottomMilestoneContainer}>
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
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handlePickAndUploadAvatar}>
                            <AvatarDisplay
                                image={me.avatar_url}
                                borderColor={Colors.darkBlue}
                            />
                        </TouchableOpacity>
                        <View style={styles.bubbleWrapper}>
                            <TouchableOpacity
                                style={styles.messageBubble}
                                onPress={handleOpenNoteModal}
                                disabled={false}
                            >
                                <CustomText
                                    weight="semibold"
                                    style={styles.messageText}
                                >
                                    {me?.note
                                        ? me.note
                                        : "You have no note yet!"}
                                </CustomText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                <View style={styles.avatarContainer}>
                    <AvatarDisplay
                        image={partner ? partner.avatar_url : null}
                        borderColor={Colors.hotPink}
                    />
                    <View style={styles.bubbleWrapper}>
                        <View style={styles.messageBubble}>
                            <CustomText
                                weight="semibold"
                                style={styles.messageText}
                            >
                                {partner
                                    ? partner.note ??
                                      "Your partner has no note yet!"
                                    : "Invite your partner to join!"}
                            </CustomText>
                        </View>
                    </View>
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
    bubbleWrapper: {
        width: "100%",
        alignItems: "center",
    },
    messageBubble: {
        zIndex: 100,
        backgroundColor: Colors.yellow,
        padding: 10,
        borderRadius: 15,
        width: "85%",
        marginTop: "-5%",
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
        gap: "5%",
        justifyContent: "center",
    },
    avatarContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    bottomMilestoneContainer: {
        justifyContent: "center",
        alignItems: "center",
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
