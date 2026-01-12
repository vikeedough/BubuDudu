export type ToastId = string;

export type ToastPayload = {
    title?: string;
    message?: string;

    /**
     * Auto-dismiss in ms. If undefined/null => persistent (no auto-dismiss).
     * If provided, a timer-based progress bar animates until dismissal.
     */
    durationMs?: number | null;

    /**
     * Determinate progress (0..1). If set, shows determinate bar.
     * Typical for upload progress. Keep durationMs null for persistent.
     */
    progress?: number;

    /**
     * If true, toast stays until dismiss() even if durationMs is set.
     * Useful when you still want an animated bar but no auto-dismiss.
     */
    persistent?: boolean;
};

export type Toast = {
    id: ToastId;
    createdAt: number;
    payload: ToastPayload;
};
