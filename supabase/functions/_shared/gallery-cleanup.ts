import type { GalleryContext } from "./gallery-auth.ts";
import { deleteReceiptObjects, type DeletionReceipt } from "./gallery-storage.ts";

type Counts = {
    pending: number;
    eligible: number;
    skipped: number;
    rechecks: number;
    pendingGalleries: number;
    abandonedPending: number;
};

// Bounded pages and deadlines leave time to report failures. Interrupted leases expire in SQL.
export async function runDailyCleanup(admin: GalleryContext["admin"]) {
    const started = Date.now();
    const token = crypto.randomUUID();
    const summary = {
        executionId: token,
        timestamp: new Date(started).toISOString(),
        ok: true,
        eligible: 0,
        completed: 0,
        rechecked: 0,
        failed: 0,
        skipped: 0,
        remaining: null as number | null,
        remainingEligible: null as number | null,
        remainingRechecks: null as number | null,
        pendingGalleries: null as number | null,
        abandonedPending: null as number | null,
        objectsRemoved: 0,
        claimed: 0,
        emptyGalleriesFinalized: 0,
        error: undefined as string | undefined,
    };
    const call = async (name: string, args: Record<string, unknown> = {}) => {
        const { data, error } = await admin.rpc(name, args).abortSignal(AbortSignal.timeout(10000));
        if (error) throw new Error(name);
        return data;
    };
    let stage = "prepare";
    try {
        const prepared = await call("gallery_cleanup_prepare", { p_limit: 100 });
        summary.emptyGalleriesFinalized = prepared.parents;
        stage = "counts";
        const initial: Counts = await call("gallery_cleanup_counts");
        summary.eligible = initial.eligible;
        summary.skipped = initial.skipped;
        while (Date.now() - started < 45000 && summary.claimed < 100) {
            stage = "claim";
            const rows: DeletionReceipt[] = await call("gallery_cleanup_claim", {
                p_token: token,
                p_limit: 5,
            });
            if (!rows.length) break;
            summary.claimed += rows.length;
            for (const row of rows) {
                if (Date.now() - started >= 45000) break;
                let failure = "objects";
                try {
                    if (
                        !Number.isFinite(Date.parse(row.cleanup_after)) ||
                        Date.parse(row.cleanup_after) > Date.now()
                    ) {
                        throw new Error("invalid_receipt");
                    }
                    await deleteReceiptObjects(admin, row, AbortSignal.timeout(10000), (count) => {
                        summary.objectsRemoved += count;
                    });
                    failure = "metadata";
                    const finished = await call("gallery_cleanup_finish", {
                        p_image: row.image_id,
                        p_token: token,
                        p_success: true,
                    });
                    if (finished !== true) throw new Error("Lease no longer owned");
                    if (row.completed_at) summary.rechecked++;
                    else summary.completed++;
                } catch (error) {
                    summary.failed++;
                    if (error instanceof Error && error.message === "invalid_receipt") {
                        failure = "invalid_receipt";
                    }
                    // If this also fails, lease expiry still preserves retryability.
                    try {
                        await call("gallery_cleanup_finish", {
                            p_image: row.image_id,
                            p_token: token,
                            p_success: false,
                            p_error: failure,
                        });
                    } catch { /* retained, never discard the receipt */ }
                    if (summary.failed <= 10) {
                        console.warn("Gallery deletion retry retained", {
                            executionId: token,
                            imageId: row.image_id,
                            stage: failure,
                        });
                    }
                }
            }
        }
        stage = "counts";
        const remaining: Counts = await call("gallery_cleanup_counts");
        summary.remaining = remaining.pending;
        summary.remainingEligible = remaining.eligible;
        summary.remainingRechecks = remaining.rechecks;
        summary.pendingGalleries = remaining.pendingGalleries;
        summary.abandonedPending = remaining.abandonedPending;
    } catch {
        summary.error = stage;
    }
    summary.ok = summary.failed === 0 && !summary.error;
    const backlog = summary.remaining !== 0 || summary.remainingRechecks !== 0 ||
        summary.pendingGalleries !== 0 || summary.abandonedPending !== 0;
    const result = {
        ...summary,
        complete: summary.ok && !backlog,
        durationMs: Date.now() - started,
    };
    console.log("Gallery daily cleanup", result);
    return result;
}
