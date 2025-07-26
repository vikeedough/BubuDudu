import {
    Gallery,
    List,
    Milestone,
    Quote,
    User,
    Wheel,
} from "@/api/endpoints/types";
import { create } from "zustand";

interface AppStore {
    milestones: Milestone[];
    users: User[];
    quotes: Quote[];
    lists: List[];
    galleries: Gallery[];
    wheels: Wheel[];
    setUsers: (users: User[]) => void;
    setAllData: (data: Partial<AppStore>) => void;
}

export const useAppStore = create<AppStore>((set) => ({
    milestones: [],
    users: [],
    quotes: [],
    lists: [],
    galleries: [],
    wheels: [],
    setUsers: (users) => set({ users }),
    setAllData: (data) => set(data),
}));
