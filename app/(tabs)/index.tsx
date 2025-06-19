import Avatar from "@/components/home/Avatar";
import MilestoneTracker from "@/components/home/MilestoneTracker";
import NoteModal from "@/components/home/NoteModal";
import QuoteContainer from "@/components/home/QuoteContainer";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
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
                <Avatar
                    image={users[0].avatar_url}
                    onPressNoteButton={handleOpenNoteModal}
                    onPressImage={() => {}}
                    isSelected={false}
                    hasAddMessageButton={currentUser?.id === users[0].id}
                    isBubu={false}
                    disabled={currentUser?.id !== users[0].id}
                />
                <Avatar
                    image={users[1].avatar_url}
                    onPressNoteButton={handleOpenNoteModal}
                    onPressImage={() => {}}
                    isSelected={false}
                    hasAddMessageButton={currentUser?.id === users[1].id}
                    isBubu={true}
                    disabled={currentUser?.id !== users[1].id}
                />
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
});

export default Home;
