import {
    fetchGalleries,
    fetchLists,
    fetchMilestones,
    fetchQuotes,
    fetchUsers,
    fetchWheels,
} from "@/api/endpoints/supabase";
import { useAppStore } from "@/stores/AppStore";
import { useEffect, useState } from "react";

export const useAppBootstrap = () => {
    const [loading, setLoading] = useState(true);
    const setAllData = useAppStore((state) => state.setAllData);

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const [milestones, users, quotes, lists, galleries, wheels] =
                    await Promise.all([
                        fetchMilestones(),
                        fetchUsers(),
                        fetchQuotes(),
                        fetchLists(),
                        fetchGalleries(),
                        fetchWheels(),
                    ]);
                setAllData({
                    milestones,
                    users,
                    quotes,
                    lists,
                    galleries,
                    wheels,
                });
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        bootstrap();
    }, []);

    return { loading };
};
