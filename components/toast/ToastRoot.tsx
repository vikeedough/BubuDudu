import React from "react";
import { ToastViewport } from "./ToastViewport";

/**
 * Mount once at the app root (above navigation).
 * Overlays all screens.
 */
export const ToastRoot: React.FC = () => {
    return <ToastViewport />;
};
