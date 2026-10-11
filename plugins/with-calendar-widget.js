const fs = require("fs");
const path = require("path");

const plist = require("@expo/plist");
const { withEntitlementsPlist, withInfoPlist, withStringsXml, withXcodeProject, IOSConfig } = require("expo/config-plugins");

const TARGET = "BubuDuduCalendarWidget";
const FONTS = ["Raleway-Regular.ttf", "Raleway-Bold.ttf"];

function paletteSource(root) {
    // Read the existing literal tokens, so Swift shares the app palette without
    // adding another independently maintained colour table.
    const source = fs.readFileSync(path.join(root, "constants/colors.ts"), "utf8");
    const tokens = Object.fromEntries([...source.matchAll(/^\s*(\w+):\s*"(#[0-9a-fA-F]+)"/gm)].map((match) => [match[1], match[2]]));
    const keys = ["backgroundPink", "darkGreenText", "brownText", "gray", "pink", "orange", "yellow", "green", "lightBlue", "darkBlue"];
    for (const key of keys) if (!tokens[key]) throw new Error(`Missing widget palette token: ${key}`);
    const rgb = (hex) => {
        const value = hex.slice(1);
        const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
        return [0, 2, 4].map((i) => (parseInt(full.slice(i, i + 2), 16) / 255).toFixed(8));
    };
    return `import SwiftUI\n\nenum WidgetPalette {\n${keys.map((key) => {
        const [r, g, b] = rgb(tokens[key]);
        return `  static let ${key} = Color(red: ${r}, green: ${g}, blue: ${b})`;
    }).join("\n")}\n  static func semantic(_ key: String) -> Color {\n    switch key {\n${["pink", "orange", "yellow", "green", "lightBlue", "darkBlue"].map((key) => `    case "${key}": return ${key}`).join("\n")}\n    default: return orange\n    }\n  }\n}\n`;
}

module.exports = function withCalendarWidget(config) {
    const bundle = config.ios.bundleIdentifier;
    const group = `group.${bundle}.calendar`;
    const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
    config = withStringsXml(config, (mod) => {
        const strings = mod.modResults.resources.string ?? [];
        mod.modResults.resources.string = [...strings.filter((item) => item.$.name !== "calendar_widget_url"), { $: { name: "calendar_widget_url", translatable: "false" }, _: `${scheme}://calendar-widget` }];
        return mod;
    });
    config = withEntitlementsPlist(config, (mod) => {
        const key = "com.apple.security.application-groups";
        const otherBundle = bundle.endsWith(".dev") ? bundle.slice(0, -4) : bundle + ".dev";
        mod.modResults[key] = [...new Set([...(mod.modResults[key] ?? []).filter((value) => value !== `group.${otherBundle}.calendar`), group])];
        return mod;
    });
    config = withInfoPlist(config, (mod) => {
        mod.modResults.CalendarWidgetAppGroup = group;
        mod.modResults.CalendarWidgetURL = `${scheme}://calendar-widget`;
        return mod;
    });
    // EAS can provision the extension's bundle ID and App Group automatically.
    const extensions = config.extra?.eas?.build?.experimental?.ios?.appExtensions ?? [];
    config.extra = { ...config.extra, eas: { ...config.extra?.eas, build: { ...config.extra?.eas?.build, experimental: { ...config.extra?.eas?.build?.experimental, ios: {
        ...config.extra?.eas?.build?.experimental?.ios,
        appExtensions: [...extensions.filter((e) => e.targetName !== TARGET), { targetName: TARGET, bundleIdentifier: `${bundle}.calendarwidget`, entitlements: { "com.apple.security.application-groups": [group] } }],
    } } } } };
    return withXcodeProject(config, (mod) => {
        const project = mod.modResults;
        const root = mod.modRequest.projectRoot;
        const folder = path.join(mod.modRequest.platformProjectRoot, TARGET);
        fs.mkdirSync(folder, { recursive: true });
        fs.copyFileSync(path.join(root, "widgets/calendar/ios/CalendarWidget.swift"), path.join(folder, "CalendarWidget.swift"));
        fs.writeFileSync(path.join(folder, "WidgetPalette.swift"), paletteSource(root));
        FONTS.forEach((font) => fs.copyFileSync(path.join(root, "assets/fonts", font), path.join(folder, font)));
        fs.writeFileSync(path.join(folder, `${TARGET}-Info.plist`), plist.default.build({
            CFBundleDisplayName: "BubuDudu Calendar", CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)", CFBundleName: "$(PRODUCT_NAME)",
            CFBundlePackageType: "XPC!", CFBundleShortVersionString: config.version, CFBundleVersion: "$(CURRENT_PROJECT_VERSION)",
            NSExtension: { NSExtensionPointIdentifier: "com.apple.widgetkit-extension" },
            CalendarWidgetAppGroup: group, CalendarWidgetURL: `${scheme}://calendar-widget`, UIAppFonts: FONTS,
        }));
        fs.writeFileSync(path.join(folder, `${TARGET}.entitlements`), plist.default.build({ "com.apple.security.application-groups": [group] }));
        const nativeTargets = project.pbxNativeTargetSection();
        // xcode's addTargetDependency silently does nothing when a template
        // with one target has no dependency/proxy sections yet.
        const sections = project.hash.project.objects;
        sections.PBXTargetDependency ??= {};
        sections.PBXContainerItemProxy ??= {};
        let targetId = Object.keys(nativeTargets).find((id) => nativeTargets[id]?.name?.replaceAll('"', "") === TARGET);
        if (!targetId) {
            targetId = project.addTarget(TARGET, "app_extension", TARGET, `${bundle}.calendarwidget`).uuid;
            project.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", targetId);
            project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", targetId);
            project.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", targetId);
            IOSConfig.XcodeUtils.ensureGroupRecursively(project, TARGET);
            for (const file of ["CalendarWidget.swift", "WidgetPalette.swift"]) IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ project, filepath: `${TARGET}/${file}`, groupName: TARGET, targetUuid: targetId });
            for (const file of FONTS) IOSConfig.XcodeUtils.addResourceFileToGroup({ project, filepath: `${TARGET}/${file}`, groupName: TARGET, targetUuid: targetId, isBuildFile: true });
            project.addFramework("WidgetKit.framework", { target: targetId, link: true });
            project.addFramework("SwiftUI.framework", { target: targetId, link: true });
        }
        const hostTarget = project.getFirstTarget();
        if (!hostTarget.firstTarget.dependencies.some((ref) => sections.PBXTargetDependency[ref.value]?.target === targetId)) project.addTargetDependency(hostTarget.uuid, [targetId]);
        const target = nativeTargets[targetId];
        const configurationList = project.pbxXCConfigurationList()[target.buildConfigurationList];
        const hostList = project.pbxXCConfigurationList()[project.getFirstTarget().firstTarget.buildConfigurationList];
        const hostConfigs = project.pbxXCBuildConfigurationSection();
        for (const ref of configurationList.buildConfigurations) {
            const entry = hostConfigs[ref.value];
            const hostRef = hostList.buildConfigurations.find((value) => value.comment === entry.name);
            const host = hostRef ? hostConfigs[hostRef.value].buildSettings : {};
            Object.assign(entry.buildSettings, {
                PRODUCT_BUNDLE_IDENTIFIER: `"${bundle}.calendarwidget"`, SWIFT_VERSION: "5.0", IPHONEOS_DEPLOYMENT_TARGET: "15.1", TARGETED_DEVICE_FAMILY: '"1,2"',
                CODE_SIGN_ENTITLEMENTS: `${TARGET}/${TARGET}.entitlements`, INFOPLIST_FILE: `${TARGET}/${TARGET}-Info.plist`,
                CURRENT_PROJECT_VERSION: host.CURRENT_PROJECT_VERSION ?? "1", MARKETING_VERSION: host.MARKETING_VERSION ?? config.version,
                APPLICATION_EXTENSION_API_ONLY: "YES", CODE_SIGN_STYLE: "Automatic", DEVELOPMENT_TEAM: config.ios.appleTeamId ?? config.ios.teamId ?? host.DEVELOPMENT_TEAM,
                GENERATE_INFOPLIST_FILE: "NO", SKIP_INSTALL: "YES",
            });
        }
        project.addTargetAttribute("DevelopmentTeam", config.ios.appleTeamId ?? config.ios.teamId, { uuid: targetId });
        return mod;
    });
};
module.exports.paletteSource = paletteSource;
