import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
function files(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? files(file) : [file];
    });
}
it("archives Lists outside Expo routes and eliminates runtime imports/backend writes", () => {
    const routes = files(path.join(root, "app"));
    expect(routes.some((file) => /[\\/]\(lists\)[\\/]|[\\/]lists\.tsx$/.test(file))).toBe(false);
    expect(routes.some((file) => file.endsWith("calendar.tsx"))).toBe(true);
    for (const directory of ["app", "api", "components", "providers", "stores", "hooks", "utils"]) {
        for (const file of files(path.join(root, directory)).filter((f) => /\.tsx?$/.test(f))) {
            expect(fs.readFileSync(file, "utf8")).not.toMatch(/from\s+["'][^"']*(archive\/lists|stores\/ListStore|components\/lists)|\.from\(["']lists["']\)/);
        }
    }
    expect(fs.existsSync(path.join(root, "archive/lists/routes/lists.tsx"))).toBe(true);
    expect(fs.readFileSync(path.join(root, "utils/offline/local-db.ts"), "utf8")).toContain("WHERE entity != 'lists'");
});
