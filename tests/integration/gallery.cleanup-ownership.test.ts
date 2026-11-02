import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guard the rollout boundary: a future lifecycle refactor must not restore mobile cleanup.
it("keeps physical cleanup and polling out of mobile gallery lifecycle code", () => {
    const root = resolve(__dirname, "../..");
    expect(existsSync(resolve(root, "hooks/useGalleryCleanup.ts"))).toBe(false);
    for (const file of ["providers/offline-provider.tsx", "stores/GalleryStore.ts", "utils/gallery-storage.ts"]) {
        const source = readFileSync(resolve(root, file), "utf8");
        expect(source).not.toMatch(/useGalleryCleanup|action:\s*["']cleanup["']|gallery-daily-cleanup/);
    }
});
