import * as SecureStore from "expo-secure-store";

const SPACE_ID_KEY = "active_space_id";
const spaceListeners = new Set<() => void>();
export function subscribeToSpaceId(listener: () => void) {
    spaceListeners.add(listener);
    return () => { spaceListeners.delete(listener); };
}

export async function getSpaceId(): Promise<string | null> {
    return await SecureStore.getItemAsync(SPACE_ID_KEY);
}

export async function setSpaceId(spaceId: string): Promise<void> {
    await SecureStore.setItemAsync(SPACE_ID_KEY, spaceId);
    spaceListeners.forEach((listener) => listener());
}

export async function deleteSpaceId(): Promise<void> {
    await SecureStore.deleteItemAsync(SPACE_ID_KEY);
    spaceListeners.forEach((listener) => listener());
}
