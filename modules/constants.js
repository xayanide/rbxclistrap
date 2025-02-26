const CLI_COLORS = {
    RESET: "\x1b[0m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    BLUE: "\x1b[34m",
    MAGENTA: "\x1b[35m",
    CYAN: "\x1b[36m",
};

const FOLDER_MAPPINGS = {
    // Blobs which both RobloxPlayer and RobloxStudio have.
    _common: {
        // Root
        "redist.zip": "",
        // WebView2
        "WebView2.zip": "",
        "WebView2RuntimeInstaller.zip": "WebView2RuntimeInstaller/",
        // Others
        "shaders.zip": "shaders/",
        "ssl.zip": "ssl/",
        // Content
        "content-avatar.zip": "content/avatar/",
        "content-configs.zip": "content/configs/",
        "content-fonts.zip": "content/fonts/",
        "content-models.zip": "content/models/",
        "content-sky.zip": "content/sky/",
        "content-sounds.zip": "content/sounds/",
        "content-textures2.zip": "content/textures/",
        "content-textures3.zip": "PlatformContent/pc/textures/",
        "content-terrain.zip": "PlatformContent/pc/terrain/",
        // Content-Platform
        "content-platform-fonts.zip": "PlatformContent/pc/fonts/",
        "content-platform-dictionaries.zip": "PlatformContent/pc/shared_compression_dictionaries/",
        // ExtraContent
        "extracontent-luapackages.zip": "ExtraContent/LuaPackages/",
        "extracontent-translations.zip": "ExtraContent/translations/",
        "extracontent-models.zip": "ExtraContent/models/",
        "extracontent-textures.zip": "ExtraContent/textures/",
    },
    // Blobs which RobloxPlayer only have.
    _playerOnly: {
        // Root
        "RobloxApp.zip": "",
        "RobloxPlayerLauncher.exe": "",
        // ExtraContent
        "extracontent-places.zip": "ExtraContent/places/",
    },
    // Blobs which RobloxStudio only have.
    _studioOnly: {
        // Root
        "RobloxStudio.zip": "",
        "Libraries.zip": "",
        "LibrariesQt5.zip": "",
        // Others
        "ApplicationConfig.zip": "ApplicationConfig/",
        "Plugins.zip": "Plugins/",
        "Qml.zip": "Qml/",
        "StudioFonts.zip": "StudioFonts/",
        "RibbonConfig.zip": "RibbonConfig/",
        // Content
        "content-api-docs.zip": "content/api_docs/",
        "content-studio_svg_textures.zip": "content/studio_svg_textures/",
        "content-qt_translations.zip": "content/qt_translations/",
        // ExtraContent
        "extracontent-scripts.zip": "ExtraContent/scripts/",
        // BuiltIn
        "BuiltInPlugins.zip": "BuiltInPlugins/",
        "BuiltInStandalonePlugins.zip": "BuiltInStandalonePlugins/",
    },
};

const APP_SETTINGS = `<?xml version="1.0" encoding="UTF-8"?>
<Settings>
    <ContentFolder>content</ContentFolder>
    <BaseUrl>http://www.roblox.com</BaseUrl>
</Settings>
`;

const DEPLOYMENT_DEFAULT_CHANNEL = "production";
const DEPLOYMENT_VERSION_STUDIO_HASH = "version-012732894899482c";
const DEPLOYMENT_ROBLOX_CDN_BASE_URLS = [
    { baseUrl: "https://setup.rbxcdn.com", priority: 0 },
    { baseUrl: "https://setup-aws.rbxcdn.com", priority: 2 },
    { baseUrl: "https://setup-ak.rbxcdn.com", priority: 2 },
    { baseUrl: "https://roblox-setup.cachefly.net", priority: 2 },
    { baseUrl: "https://setup-cfly.rbxcdn.com", priority: 2 },
    /**  A direct alias for S3. Avoid using this, HTTPS doesn't work properly on it.
    { url: "http://setup.roblox.com", priority: 2 },
    */
    { baseUrl: "https://s3.amazonaws.com/setup.roblox.com", priority: 4 },
];

const ROBLOX_CLIENTSETTINGS_BASE_URLS = [
    { baseUrl: "https://clientsettingscdn.roblox.com", priority: 0 },
    { baseUrl: "https://clientsettings.roblox.com", priority: 2 },
];

// Excluded: "RobloxCrashHandler.exe", "RobloxPlayerLauncher.exe", "RobloxPlayerInstaller.exe"
const PLAYER_PROCESSES = ["RobloxPlayerBeta.exe"];
// Excluded: "RobloxCrashHandler.exe", "RobloxStudioLauncher.exe", "RobloxStudioInstaller.exe"
const STUDIO_PROCESSES = ["RobloxStudioBeta.exe"];

const WEBVIEW_REGISTRY_KEYPATHS = [
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKCU\\Software\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
];

const BINARY_TYPES = ["WindowsPlayer", "WindowsStudio64"];
const APP_TYPES = ["player", "studio"];
const DEPLOY_TYPES = ["WindowsPlayer", "Studio64"];
const BINARY_TYPES_MAP = {
    player: "WindowsPlayer",
    studio: "WindowsStudio64",
};
const APP_TYPES_MAP = {
    WindowsPlayer: "player",
    WindowsStudio64: "studio",
};
const DEPLOY_TYPES_MAP = { player: "WindowsPlayer", studio: "Studio64", WindowsPlayer: "WindowsPlayer", WindowsStudio64: "Studio64" };

const DEFAULT_CONFIG = { deleteExistingVersion: false, forceUpdate: false, alwaysRunLatest: false, onlyKeepLatest: true };

/**
The bootstrapper will use these preset fast flags if they're not set by the user.
They're not invasive, so your game should feel almost the same as if no fast flags are set.
References:
https://github.com/slattist/nvrmaintain
https://github.com/MaximumADHD/Roblox-FFlag-Tracker/blob/main/PCDesktopClient.json
*/
const DEFAULT_FAST_FLAGS = {
    DFIntTaskSchedulerTargetFps: 240,
    DFIntTextureQualityOverride: 3,
    DFFlagDisableDPIScale: true,
    DFFlagTextureQualityOverrideEnabled: true,
    FFlagDebugGraphicsPreferD3D11: true,
    FFlagHandleAltEnterFullscreenManually: false,
    FFlagTaskSchedulerLimitTargetFpsTo2402: false,
    FIntCameraMaxZoomDistance: 9999,
    FIntDebugForceMSAASamples: 4,
};

/**
These are just placeholders and for easy grabbing of fast flags.
Some can alter default behavior of the client so your game
would probably look and behave just slightly different
compared to clients with unmodified fast flags.
*/
const EXCLUDED_DEFAULT_FAST_FLAGS = {
    DFIntCullFactorPixelThresholdShadowMapHighQuality: 2147483647,
    DFIntCullFactorPixelThresholdShadowMapLowQuality: 2147483647,
    DFIntDebugFRMQualityLevelOverride: 1,
    DFIntVoiceChatRollOffMaxDistance: 1000000000000000,
    DFIntVoiceChatRollOffMinDistance: 1000000000000000,
    FFlagAdServiceEnabled: false,
    FFlagDebugDisableTelemetryEphemeralCounter: true,
    FFlagDebugDisableTelemetryEphemeralStat: true,
    FFlagDebugDisableTelemetryEventIngest: true,
    FFlagDebugDisableTelemetryPoint: true,
    FFlagDebugDisableTelemetryV2Counter: true,
    FFlagDebugDisableTelemetryV2Event: true,
    FFlagDebugDisableTelemetryV2Stat: true,
    FFlagDebugDisplayFPS: true,
    FFlagDisablePostFx: true,
    FIntRenderShadowIntensity: 0,
    FIntTerrainArraySliceSize: 0,
    FLogNetwork: 7,
};

/** Keys to create when registering Roblox Player */
const REGISTER_PLAYER_KEY_PATHS = [
    "HKCU\\Software\\ROBLOX Corporation",
    "HKCU\\Software\\ROBLOX Corporation\\Environments",
    /** External:
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer\\Channel",
    */
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player\\Capabilities",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player\\Capabilities\\UrlAssociations",
    "HKCU\\Software\\Classes\\roblox",
    "HKCU\\Software\\Classes\\roblox\\DefaultIcon",
    "HKCU\\Software\\Classes\\roblox\\shell",
    "HKCU\\Software\\Classes\\roblox\\shell\\open",
    "HKCU\\Software\\Classes\\roblox\\shell\\open\\command",
    "HKCU\\Software\\Classes\\roblox-player",
    "HKCU\\Software\\Classes\\roblox-player\\DefaultIcon",
    "HKCU\\Software\\Classes\\roblox-player\\shell",
    "HKCU\\Software\\Classes\\roblox-player\\shell\\open",
    "HKCU\\Software\\Classes\\roblox-player\\shell\\open\\command",
];

/** Keys to create when registering Roblox Studio */
const REGISTER_STUDIO_KEY_PATHS = [
    "HKCU\\Software\\ROBLOX Corporation",
    "HKCU\\Software\\ROBLOX Corporation\\Environments",
    /** External:
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio\\Channel",
    */
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio\\Capabilities",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio\\Capabilities\\UrlAssociations",
    "HKCU\\Software\\Classes\\roblox-studio",
    "HKCU\\Software\\Classes\\roblox-studio\\DefaultIcon",
    "HKCU\\Software\\Classes\\roblox-studio\\shell",
    "HKCU\\Software\\Classes\\roblox-studio\\shell\\open",
    "HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\command",
    "HKCU\\Software\\Classes\\roblox-studio-auth",
    "HKCU\\Software\\Classes\\roblox-studio-auth\\DefaultIcon",
    "HKCU\\Software\\Classes\\roblox-studio-auth\\shell",
    "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open",
    "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open\\command",
];

/** Keys to create when registering Roblox Studio Place */
const REGISTER_STUDIO_PLACE_KEY_PATHS = [
    "HKCU\\Software\\Classes\\Roblox.Place",
    "HKCU\\Software\\Classes\\Roblox.Place\\DefaultIcon",
    "HKCU\\Software\\Classes\\Roblox.Place\\shell",
    "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open",
    "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open\\command",
];

/** Keys to create when registering Roblox Studio File Extensions */
const REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS = [
    "HKCU\\Software\\Classes\\.rbxl",
    "HKCU\\Software\\Classes\\.rbxl\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxl\\Roblox.Place\\ShellNew",
    "HKCU\\Software\\Classes\\.rbxlx",
    "HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place\\ShellNew",
];

/** Values to delete when unregistering Roblox Player */
const UNREGISTER_PLAYER_VALUE_PATHS = ["HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player"];

/** Keys to delete when unregistering Roblox Player */
const UNREGISTER_PLAYER_KEY_PATHS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player",
    // External:
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer",
    "HKCU\\Software\\Classes\\roblox",
    "HKCU\\Software\\Classes\\roblox-player",
];

/** Values to delete when unregistering Roblox Studio */
const UNREGISTER_STUDIO_VALUE_PATHS = ["HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio"];

/** Keys to delete when unregistering Roblox Player */
const UNREGISTER_STUDIO_KEY_PATHS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio",
    // External:
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio",
    "HKCU\\Software\\Classes\\roblox-studio",
    "HKCU\\Software\\Classes\\roblox-studio-auth",
    "HKCU\\Software\\Classes\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxl",
    "HKCU\\Software\\Classes\\.rbxlx",
];

export {
    REGISTER_PLAYER_KEY_PATHS,
    REGISTER_STUDIO_KEY_PATHS,
    REGISTER_STUDIO_PLACE_KEY_PATHS,
    REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS,
    UNREGISTER_PLAYER_VALUE_PATHS,
    UNREGISTER_PLAYER_KEY_PATHS,
    UNREGISTER_STUDIO_VALUE_PATHS,
    UNREGISTER_STUDIO_KEY_PATHS,
    CLI_COLORS,
    DEPLOYMENT_DEFAULT_CHANNEL,
    FOLDER_MAPPINGS,
    APP_SETTINGS,
    DEPLOYMENT_VERSION_STUDIO_HASH,
    DEPLOYMENT_ROBLOX_CDN_BASE_URLS,
    ROBLOX_CLIENTSETTINGS_BASE_URLS,
    PLAYER_PROCESSES,
    STUDIO_PROCESSES,
    BINARY_TYPES,
    BINARY_TYPES_MAP,
    APP_TYPES,
    APP_TYPES_MAP,
    DEPLOY_TYPES,
    DEPLOY_TYPES_MAP,
    DEFAULT_FAST_FLAGS,
    DEFAULT_CONFIG,
    WEBVIEW_REGISTRY_KEYPATHS,
    EXCLUDED_DEFAULT_FAST_FLAGS,
};
