export async function runWithConcurrency<T>(
    items: T[], limit: number, worker: (item: T, index: number) => Promise<void>,
) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Invalid concurrency limit");
    let next = 0;
    let failed = false;
    let firstError: unknown;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (!failed) {
            const index = next++;
            if (index >= items.length) return;
            try { await worker(items[index], index); }
            catch (error) { if (!failed) firstError = error; failed = true; }
        }
    }));
    if (failed) throw firstError;
}
