import { Alert } from "react-native";
import { supabase } from "../api/clients/supabaseClient";
import { setSpaceId } from "./secure-store";

const generateInviteCode = (): string => {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let inviteCode = "";
    const length = 8; // Length of the invite code

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        inviteCode += characters[randomIndex];
    }

    return inviteCode;
};

const isDuplicateCodeError = (msg?: string): boolean => {
    if (!msg) return false;
    const m = msg.toLowerCase();
    return (
        m.includes("duplicate") || m.includes("unique") || m.includes("23505")
    );
};

export async function createSpace(spaceName: string) {
    const { data: userResponse, error: userError } =
        await supabase.auth.getUser();

    if (userError) {
        Alert.alert("User Error", userError.message);
    }
    const user = userResponse.user;
    if (!user) {
        Alert.alert("User Error", "No authenticated user found.");
        return;
    }

    // Create space
    const { data: space, error: spaceError } = await supabase
        .from("spaces")
        .insert({
            name: spaceName,
            created_by: user.id,
        })
        .select()
        .single();

    if (spaceError) {
        Alert.alert("Space Creation Error", spaceError.message);
    }

    await setSpaceId(space.id);

    // Add creator as member
    const { error: memberError } = await supabase.from("space_members").insert({
        space_id: space.id,
        user_id: user.id,
    });

    if (memberError) {
        Alert.alert("Member Addition Error", memberError.message);
    }

    // Create invite code
    let inviteCode = generateInviteCode();

    for (let attempts = 0; attempts < 5; attempts++) {
        const { error: inviteError } = await supabase
            .from("space_invites")
            .insert({
                space_id: space.id,
                code: inviteCode,
                created_by: user.id,
            });

        if (!inviteError) {
            return { spaceId: space.id, inviteCode };
        }

        if (isDuplicateCodeError(inviteError.message)) {
            inviteCode = generateInviteCode();
            continue;
        }

        throw new Error(`Invite Code Creation Error: ${inviteError.message}`);
    }
}

export async function joinSpace(inviteCode: string) {
    const code = inviteCode.trim();

    const { data: userResponse, error: userError } =
        await supabase.auth.getUser();

    if (userError) {
        Alert.alert("User Error", userError.message);
        return;
    }
    const user = userResponse.user;
    if (!user) {
        Alert.alert("User Error", "No authenticated user found.");
        return;
    }

    // Find space_id from invite code
    const { data: inviteData, error: inviteError } = await supabase
        .from("space_invites")
        .select("space_id")
        .eq("code", code)
        .single();

    if (inviteError) {
        Alert.alert("Invite Error", "Invalid invite code.");
        return;
    }

    // Add user as member
    const { error: memberError } = await supabase.from("space_members").insert({
        space_id: inviteData.space_id,
        user_id: user.id,
    });

    if (memberError) {
        Alert.alert("Member Addition Error", memberError.message);
        return;
    }

    await setSpaceId(inviteData.space_id);

    return inviteData.space_id;
}
