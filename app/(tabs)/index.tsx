import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { Milestone } from "@/api/endpoints/types";
import { fetchMilestones } from "@/api/endpoints/supabase";

const Home = () => {
    const [milestones, setMilestones] = useState<Milestone[]>([]);

    useEffect(() => {
        const loadMilestones = async () => {
            const milestones = await fetchMilestones();
            console.log("Fetched milestones:", milestones);
            setMilestones(milestones);
        };
        loadMilestones();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <Text>Home</Text>
            {milestones.map((milestone) => (
                <Text key={milestone.id}>{milestone.title}</Text>
            ))}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default Home;
