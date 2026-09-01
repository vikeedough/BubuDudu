export type ExistingDeliveryStatus = "sending" | "sent" | "failed";

export function getExistingDeliveryAction(status: ExistingDeliveryStatus) {
    if (status === "sent") return "already_sent" as const;
    if (status === "sending") return "already_sending" as const;
    return "reclaim_failed" as const;
}
