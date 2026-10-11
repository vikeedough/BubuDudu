export default ({ config }) => {
    const variant = process.env.APP_VARIANT ?? "prod";
    const isDev = variant === "dev";

    return {
        ...config,
        plugins: [...(config.plugins ?? []), "expo-sqlite", "./plugins/with-calendar-widget", ["react-native-android-widget", {
            fonts: ["./assets/fonts/Raleway-Regular.ttf", "./assets/fonts/Raleway-Bold.ttf"],
            widgets: [{ name: "BubuDuduCalendar", label: "BubuDudu Calendar", description: "Our plans and Singapore public holidays.",
                minWidth: "140dp", minHeight: "110dp", targetCellWidth: 4, targetCellHeight: 2,
                resizeMode: "horizontal|vertical", updatePeriodMillis: 1800000 }],
        }]],
        name: isDev ? "BubuDudu (Dev)" : "BubuDudu",
        scheme: isDev ? "bubududu-dev" : "bubududu",
        android: {
            ...config.android,
            package: isDev
                ? "com.vikeedough.bubududu.dev"
                : "com.vikeedough.bubududu",
        },
        ios: {
            ...config.ios,
            bundleIdentifier: isDev
                ? "com.vikeedough.bubududu.dev"
                : "com.vikeedough.bubududu",
        },
    };
};
