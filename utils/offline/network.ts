type Listener = (isOnline: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

export function getIsOnline(): boolean {
    return online;
}

export function setIsOnline(next: boolean): void {
    if (online === next) return;
    online = next;
    for (const listener of listeners) {
        listener(online);
    }
}

export function subscribeToOnlineStatus(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
