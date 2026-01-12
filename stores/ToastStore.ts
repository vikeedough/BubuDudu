// components/toast/toastStore.ts
// (Optional but recommended) keep references stable and use functional set() to avoid accidental churn.

import { create } from "zustand";
import { createToastId } from "../toast/id";
import type { Toast, ToastId, ToastPayload } from "../toast/types";

type ToastState = {
    order: ToastId[];
    byId: Record<ToastId, Toast>;

    show: (
        idOrPayload?: ToastId | ToastPayload,
        payloadMaybe?: ToastPayload
    ) => ToastId;
    update: (id: ToastId, patch: Partial<ToastPayload>) => void;
    dismiss: (id: ToastId) => void;
    dismissAll: () => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
    order: [],
    byId: {},

    show: (idOrPayload, payloadMaybe) => {
        const hasId = typeof idOrPayload === "string";
        const id = hasId ? (idOrPayload as ToastId) : createToastId();
        const payload = (hasId ? payloadMaybe : idOrPayload) ?? {};

        const existing = get().byId[id];

        if (!existing) {
            set((state) => ({
                order: [...state.order, id],
                byId: {
                    ...state.byId,
                    [id]: { id, createdAt: Date.now(), payload },
                },
            }));
        } else {
            set((state) => ({
                byId: {
                    ...state.byId,
                    [id]: {
                        ...existing,
                        payload: { ...existing.payload, ...payload },
                    },
                },
            }));
        }

        return id;
    },

    update: (id, patch) => {
        const existing = get().byId[id];
        if (!existing) return;

        set((state) => ({
            byId: {
                ...state.byId,
                [id]: {
                    ...existing,
                    payload: { ...existing.payload, ...patch },
                },
            },
        }));
    },

    dismiss: (id) => {
        if (!get().byId[id]) return;

        set((state) => {
            const { [id]: _removed, ...rest } = state.byId;
            return {
                byId: rest,
                order: state.order.filter((x) => x !== id),
            };
        });
    },

    dismissAll: () => set({ order: [], byId: {} }),
}));
