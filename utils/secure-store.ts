import * as SecureStore from "expo-secure-store";

const SPACE_ID_KEY = "active_space_id";

export async function getSpaceId(): Promise<string | null> {
    return await SecureStore.getItemAsync(SPACE_ID_KEY);
}

export async function setSpaceId(spaceId: string): Promise<void> {
    await SecureStore.setItemAsync(SPACE_ID_KEY, spaceId);
}

export async function deleteSpaceId(): Promise<void> {
    await SecureStore.deleteItemAsync(SPACE_ID_KEY);
}
