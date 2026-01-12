import { useToastStore } from "../stores/ToastStore";
import type { ToastId, ToastPayload } from "./types";

export const toast = {
    show(idOrPayload?: ToastId | ToastPayload, payloadMaybe?: ToastPayload) {
        return useToastStore.getState().show(idOrPayload as any, payloadMaybe);
    },
    update(id: ToastId, patch: Partial<ToastPayload>) {
        useToastStore.getState().update(id, patch);
    },
    dismiss(id: ToastId) {
        useToastStore.getState().dismiss(id);
    },
    dismissAll() {
        useToastStore.getState().dismissAll();
    },
};
