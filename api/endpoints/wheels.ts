import { supabase } from "../clients/supabaseClient";

const fetchWheels = async () => {
    const { data, error } = await supabase.from("wheel").select("*");

    if (error) {
        console.error("Error fetching wheels: ", error);
        return [];
    }

    return data;
};

const updateWheel = async (wheel_id: string, choices: string[]) => {
    const { error } = await supabase
        .from("wheel")
        .update({ choices: choices })
        .eq("id", wheel_id);

    if (error) {
        console.error("Error updating wheel:", error);
        return false;
    }

    return true;
};

const updateWheelTitle = async (wheel_id: string, title: string) => {
    const { error } = await supabase
        .from("wheel")
        .update({ title: title })
        .eq("id", wheel_id);

    if (error) {
        console.error("Error updating wheel title:", error.message);
        return false;
    }

    return true;
};

const updateWheelChoices = async (wheel_id: string, choices: string[]) => {
    const { error } = await supabase
        .from("wheel")
        .update({ choices: choices })
        .eq("id", wheel_id);

    if (error) {
        console.error("Error updating wheel choices:", error.message);
        return false;
    }

    return true;
};

const addNewWheel = async (title: string, choices: string[]) => {
    const { error } = await supabase.from("wheel").insert({
        title: title,
        choices: choices,
        created_at: new Date().toISOString(),
    });

    if (error) {
        console.error("Error adding new wheel:", error.message);
        return false;
    }

    return true;
};

const deleteWheel = async (wheel_id: string) => {
    const { error } = await supabase.from("wheel").delete().eq("id", wheel_id);

    if (error) {
        console.error("Error deleting wheel:", error.message);
        return false;
    }

    return true;
};

export {
    addNewWheel,
    deleteWheel,
    fetchWheels,
    updateWheel,
    updateWheelChoices,
    updateWheelTitle,
};
