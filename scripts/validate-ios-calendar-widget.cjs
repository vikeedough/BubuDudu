// Windows cannot run Xcode/Expo's iOS CLI prebuild. This runs the same Expo
// config mod compiler on an isolated copy and validates the extension graph.
// It is also useful on macOS/Linux; it never changes the real ios directory.
/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const { getPrebuildConfigAsync } = require("@expo/prebuild-config");
const { compileModsAsync } = require("expo/config-plugins");
const plist = require("@expo/plist").default;
const xcode = require("xcode");

async function validate() {
    const projectRoot = path.resolve(__dirname, "..");
    const root = path.join(projectRoot, ".expo", "calendar-widget-ios-check");
    fs.mkdirSync(root, { recursive: true });
    for (const entry of ["app.config.js", "app.json", "package.json", "eas.json", "constants", "plugins", "widgets", "assets", "modules"]) {
        fs.cpSync(path.join(projectRoot, entry), path.join(root, entry), { recursive: true, filter: (source) => !source.includes(`${path.sep}build${path.sep}`) && !source.endsWith(`${path.sep}build`) });
    }
    if (!fs.existsSync(path.join(root, "node_modules"))) fs.symlinkSync(path.join(projectRoot, "node_modules"), path.join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const files = cp.execFileSync("git", ["ls-files", "ios"], { cwd: projectRoot, encoding: "utf8" }).trim().split(/\r?\n/);
    for (const file of files) {
        const destination = path.join(root, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(projectRoot, file), destination);
    }
    // Validate both identifiers. Reapplying each variant must not add targets,
    // build phases, embed entries, resource references or signing records.
    for (const variant of ["prod", "dev"]) {
        process.env.APP_VARIANT = variant;
        let exp;
        for (let pass = 0; pass < 2; pass++) {
            ({ exp } = await getPrebuildConfigAsync(root, { platforms: ["ios"] }));
            await compileModsAsync(exp, { projectRoot: root, platforms: ["ios"], assertMissingModProviders: false });
        }
        const bundle = exp.ios.bundleIdentifier;
        const group = `group.${bundle}.calendar`;
        const projectFile = files.find((file) => file.endsWith("project.pbxproj"));
        const project = xcode.project(path.join(root, projectFile));
        project.parseSync();
        const targets = Object.entries(project.pbxNativeTargetSection()).filter(([, target]) => target.name?.replaceAll('"', "") === "BubuDuduCalendarWidget");
        assert.equal(targets.length, 1);
        const [targetId, target] = targets[0];
        const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
        for (const ref of configList.buildConfigurations) {
            const settings = project.pbxXCBuildConfigurationSection()[ref.value].buildSettings;
            assert.equal(settings.PRODUCT_BUNDLE_IDENTIFIER.replaceAll('"', ""), `${bundle}.calendarwidget`);
            assert.equal(settings.APPLICATION_EXTENSION_API_ONLY, "YES");
        }
        const sections = project.hash.project.objects;
        for (const [type, expected] of [["PBXSourcesBuildPhase", 2], ["PBXResourcesBuildPhase", 2], ["PBXFrameworksBuildPhase", 2]]) {
            const phaseIds = target.buildPhases.filter((ref) => sections[type]?.[ref.value]);
            assert.equal(phaseIds.length, 1, type);
            const phase = sections[type][phaseIds[0].value];
            assert.equal(phase.files.length, expected, `${type} file count`);
            for (const file of phase.files) {
                const buildFile = sections.PBXBuildFile[file.value];
                assert.ok(buildFile, `${type} build reference`);
                assert.ok(sections.PBXFileReference[buildFile.fileRef], `${type} file reference`);
            }
        }
        const host = project.getFirstTarget();
        assert.ok(host.firstTarget.dependencies.some((ref) => sections.PBXTargetDependency[ref.value]?.target === targetId));
        assert.ok(Object.values(sections.PBXCopyFilesBuildPhase).some((phase) => phase.files?.some((ref) => sections.PBXBuildFile[ref.value]?.fileRef === target.productReference)), "embedded appex");
        const directory = path.join(root, "ios/BubuDuduCalendarWidget");
        const info = plist.parse(fs.readFileSync(path.join(directory, "BubuDuduCalendarWidget-Info.plist"), "utf8"));
        const entitlements = plist.parse(fs.readFileSync(path.join(directory, "BubuDuduCalendarWidget.entitlements"), "utf8"));
        assert.equal(info.NSExtension.NSExtensionPointIdentifier, "com.apple.widgetkit-extension");
        assert.equal(info.CalendarWidgetAppGroup, group);
        assert.equal(info.CalendarWidgetURL, `${exp.scheme}://calendar-widget`);
        const hostInfoFile = files.find((file) => file.endsWith("/Info.plist"));
        const hostInfo = plist.parse(fs.readFileSync(path.join(root, hostInfoFile), "utf8"));
        assert.equal(hostInfo.CalendarWidgetURL, `${exp.scheme}://calendar-widget`);
        assert.deepEqual(entitlements["com.apple.security.application-groups"], [group]);
        for (const font of info.UIAppFonts) assert.ok(fs.existsSync(path.join(directory, font)));
        const swift = fs.readFileSync(path.join(directory, "CalendarWidget.swift"), "utf8");
        assert.ok(swift.includes(".supportedFamilies([.systemSmall, .systemMedium, .systemLarge])"));
        console.log(`PASS ${variant}: extension, signing, sources, fonts, framework links, embedding, App Group and repeat generation`);
    }
    console.log(`Generated iOS files: ${root}\nXcode compilation/device rendering must still be tested on macOS.`);
}
validate().catch((error) => { console.error(error); process.exitCode = 1; });
