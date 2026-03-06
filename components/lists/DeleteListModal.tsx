import React from "react";
import { Alert } from "react-native";

import { List } from "@/api/endpoints/types";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useListStore } from "@/stores/ListStore";

interface DeleteListModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedList: List;
}

const DeleteListModal: React.FC<DeleteListModalProps> = ({
    isOpen,
    onClose,
    selectedList,
}) => {
    const deleteList = useListStore((s) => s.deleteList);
    const handleDeleteList = async () => {
        try {
            await deleteList(selectedList.id);
            onClose();
        } catch {
            Alert.alert(
                "Error",
                "Failed to delete list. Please try again later."
            );
        }
    };

    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleDeleteList}
            title="Are you sure?"
            message="Are you sure you want to delete this list?"
        />
    );
};

export default DeleteListModal;
