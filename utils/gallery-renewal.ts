// One microtask batch per authorization scope/channel; in-flight item promises are shared.
export function createGalleryRenewalQueue<T>() {
    const channels = new Map<string, { items: Map<string, Promise<T>>; pending: Map<string, { resolve: (value: T) => void; reject: (error: unknown) => void }> }>();
    return (channel: string, ids: string[], request: (ids: string[]) => Promise<Record<string, T>>) => {
        let queue = channels.get(channel);
        if (!queue) {
            queue = { items: new Map(), pending: new Map() };
            channels.set(channel, queue);
        }
        const owned = queue;
        const promises = ids.map((id) => {
            let promise = owned.items.get(id);
            if (!promise) {
                promise = new Promise<T>((resolve, reject) => owned.pending.set(id, { resolve, reject }));
                owned.items.set(id, promise);
            }
            return promise;
        });
        if (owned.pending.size) void Promise.resolve().then(async () => {
            const pending = new Map(owned.pending);
            if (!pending.size) return;
            owned.pending.clear();
            try {
                const keys = [...pending.keys()];
                for (let offset = 0; offset < keys.length; offset += 200) {
                    const batch = keys.slice(offset, offset + 200);
                    const result = await request(batch);
                    for (const id of batch) {
                        if (!result[id]) throw new Error("Photo link unavailable. Please retry.");
                        pending.get(id)!.resolve(result[id]);
                    }
                }
            } catch (error) { for (const item of pending.values()) item.reject(error); }
            finally {
                for (const id of pending.keys()) owned.items.delete(id);
                if (!owned.items.size && channels.get(channel) === owned) channels.delete(channel);
            }
        });
        return Promise.all(promises);
    };
}
