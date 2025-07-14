import { List } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "../CustomText";

interface ListItemProps {
    list: List;
    onPress: () => void;
}

const ListItem: React.FC<ListItemProps> = ({ list, onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <CustomText weight="bold" style={styles.title}>
                {list.type}
            </CustomText>
        </TouchableOpacity>
    );
};

export default ListItem;

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 15,
    },
    title: {
        fontSize: 24,
    },
});
