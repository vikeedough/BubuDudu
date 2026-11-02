// Pinned server/test dependency; intentionally kept out of the Expo dependency graph.
// deno-lint-ignore no-import-prefix
import { AwsClient } from "npm:aws4fetch@1.0.20";

export function requiredEnv(name: string): string {
    const value = Deno.env.get(name)?.trim();
    if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
    return value;
}

export class R2Storage {
    private client: AwsClient;
    private base: string;
    constructor() {
        const account = requiredEnv("R2_ACCOUNT_ID");
        const bucket = requiredEnv("R2_BUCKET_NAME");
        if (!/^[a-f0-9]{32}$/i.test(account) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
            throw new Error("Invalid R2 account or bucket configuration");
        }
        this.base = `https://${account}.r2.cloudflarestorage.com/${bucket}/`;
        this.client = new AwsClient({
            accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
            secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
            service: "s3",
            region: "auto",
            retries: 2,
            initRetryMs: 100,
        });
    }
    private url(key: string) {
        return this.base + key.split("/").map(encodeURIComponent).join("/");
    }
    async presign(key: string, method: "GET" | "PUT", seconds: number) {
        if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) {
            throw new Error("Invalid signing expiry");
        }
        const url = new URL(this.url(key));
        url.searchParams.set("X-Amz-Expires", String(Math.floor(seconds)));
        const signed = await this.client.sign(url, {
            method,
            headers: method === "PUT" ? { "Content-Type": "image/jpeg" } : undefined,
            aws: { signQuery: true, allHeaders: true },
        });
        return signed.url;
    }
    async head(key: string) {
        const response = await this.client.fetch(this.url(key), { method: "HEAD" });
        if (!response.ok) throw new Error(`R2 object verification failed (${response.status})`);
        return {
            bytes: Number(response.headers.get("content-length")),
            contentType: response.headers.get("content-type"),
        };
    }
    async remove(key: string, signal?: AbortSignal) {
        const response = await this.client.fetch(this.url(key), { method: "DELETE", signal });
        if (!response.ok && response.status !== 404) {
            throw new Error(`R2 deletion failed (${response.status})`);
        }
        return response.status !== 404;
    }
    async read(key: string): Promise<Uint8Array | null> {
        const response = await this.client.fetch(this.url(key), { method: "GET" });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`R2 read failed (${response.status})`);
        return new Uint8Array(await response.arrayBuffer());
    }
    async putExact(key: string, bytes: Uint8Array, headers: Record<string, string>) {
        const response = await this.client.fetch(this.url(key), {
            method: "PUT",
            headers,
            body: bytes as Uint8Array<ArrayBuffer>,
        });
        if (!response.ok) throw new Error(`R2 copy failed (${response.status})`);
    }
}
