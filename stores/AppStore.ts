import {
    Choice,
    Gallery,
    List,
    Milestone,
    Quote,
    User,
} from "@/api/endpoints/types";
import { create } from "zustand";

interface AppStore {
    milestones: Milestone[];
    users: User[];
    quotes: Quote[];
    lists: List[];
    galleries: Gallery[];
    choices: Choice[];
    setUsers: (users: User[]) => void;
    setAllData: (data: Partial<AppStore>) => void;
}

export const useAppStore = create<AppStore>((set) => ({
    milestones: [],
    users: [],
    quotes: [],
    lists: [],
    galleries: [],
    choices: [],
    setUsers: (users) => set({ users }),
    setAllData: (data) => set(data),
}));
