import { updateNote } from "@/api/endpoints/supabase";
import CustomText from "@/components/CustomText";
import Avatar from "@/components/home/Avatar";
import MilestoneTracker from "@/components/home/MilestoneTracker";
import NoteModal from "@/components/home/NoteModal";
import QuoteContainer from "@/components/home/QuoteContainer";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { pickAndUploadAvatar } from "@/utils/home";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = () => {
    const milestones = useAppStore((state) => state.milestones);
    const users = useAppStore((state) => state.users);
    const currentUser = useUserStore((state) => state.currentUser);

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const handleOpenNoteModal = () => {
        setIsNoteModalOpen(true);
    };

    const handleCloseNoteModal = () => {
        setIsNoteModalOpen(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={handleCloseNoteModal}
                updateNote={updateNote}
                user_id={currentUser?.id ?? 0}
            />
            <View style={{ gap: 20, alignItems: "center" }}>
                <View style={{ flexDirection: "row", gap: 20 }}>
                    <MilestoneTracker
                        id={milestones[1].id}
                        title={milestones[1].title}
                        date={milestones[1].date}
                        image={require("@/assets/images/dudu.jpg")}
                    />
                    <MilestoneTracker
                        id={milestones[0].id}
                        title={milestones[0].title}
                        date={milestones[0].date}
                        image={require("@/assets/images/bubu.jpg")}
                    />
                </View>
                <MilestoneTracker
                    id={milestones[2].id}
                    title={milestones[2].title}
                    date={milestones[2].date}
                    image={require("@/assets/images/anniversary.jpg")}
                />
            </View>
            <QuoteContainer />
            <View style={{ flexDirection: "row", gap: 20 }}>
                <View>
                    <View style={styles.messageBubble}>
                        <CustomText>
                            {users[0].note
                                ? users[0].note
                                : "Dudu has no note yet!"}
                        </CustomText>
                    </View>
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
                    <View style={styles.messageBubble}>
                        <CustomText>
                            {users[1].note
                                ? users[1].note
                                : "Bubu has no note yet!"}
                        </CustomText>
                    </View>
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
        paddingVertical: 70,
        paddingHorizontal: 25,
        backgroundColor: "#FFF0F5",
        alignItems: "center",
    },
    messageBubble: {
        position: "absolute",
        bottom: -40,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 15,
        maxWidth: "100%",
        marginHorizontal: "auto",
    },
});

export default Home;
