export default ({ config }) => {
    const variant = process.env.APP_VARIANT ?? "prod";
    const isDev = variant === "dev";

    return {
        ...config,
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
