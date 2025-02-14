const colors = {
    RESET: "\x1b[0m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    BLUE: "\x1b[34m",
    MAGENTA: "\x1b[35m",
    CYAN: "\x1b[36m",
};

const folderMappings = {
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

const AppSettings = `<?xml version="1.0" encoding="UTF-8"?>
<Settings>
    <ContentFolder>content</ContentFolder>
    <BaseUrl>http://www.roblox.com</BaseUrl>
</Settings>
`;

const DEPLOYMENT_DEFAULT_CHANNEL = "production";
const DEPLOYMENT_VERSION_STUDIO_HASH = "version-012732894899482c";
const DEPLOYMENT_ROBLOX_CDN_URLS = [
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

const ROBLOX_CLIENTSETTINGS_URLS = [
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

const BINARY_TYPES = { PLAYER: "WindowsPlayer", STUDIO: "WindowsStudio64" };

const DEFAULT_CONFIG = { deleteExistingFolders: false, forceUpdate: false, alwaysRunLatest: false };

const DEFAULT_FFLAGS = {
    FFlagAdServiceEnabled: "False",
    FIntCameraMaxZoomDistance: "9999",
    FFlagDebugDisplayFPS: "False",
    FFlagDebugDisableTelemetryEphemeralCounter: "True",
    FFlagDebugDisableTelemetryEphemeralStat: "True",
    FFlagDebugDisableTelemetryEventIngest: "True",
    FFlagDebugDisableTelemetryPoint: "True",
    FFlagDebugDisableTelemetryV2Counter: "True",
    FFlagDebugDisableTelemetryV2Event: "True",
    FFlagDebugDisableTelemetryV2Stat: "True",
    FFlagHandleAltEnterFullscreenManually: "True",
    FIntDebugForceMSAASamples: "4",
    FFlagDisablePostFx: "False",
    DFIntTaskSchedulerTargetFps: "2000",
    DFFlagDisableDPIScale: "True",
    FFlagDebugGraphicsPreferD3D11: "True",
    DFFlagTextureQualityOverrideEnabled: "True",
    DFIntTextureQualityOverride: "3",
};

const EXCLUDED_DEFAULT_FFLAGS = {
    DFIntDebugFRMQualityLevelOverride: "1",
    DFIntCullFactorPixelThresholdShadowMapHighQuality: "2147483647",
    DFIntCullFactorPixelThresholdShadowMapLowQuality: "2147483647",
    FLogNetwork: "7",
    FIntRenderShadowIntensity: "0",
    FIntTerrainArraySliceSize: "0",
    DFIntVoiceChatRollOffMinDistance: "1000",
    DFIntVoiceChatRollOffMaxDistance: "1000",
};

/** Values and Keys to delete when unregistering Roblox Player */
const PLAYER_REGISTRY_VALUE_PATHS = ["HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player"];
const PLAYER_REGISTRY_KEY_PATHS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer",
    "HKCU\\Software\\Classes\\roblox",
    "HKCU\\Software\\Classes\\roblox-player",
];

/** Values and Keys to delete when unregistering Roblox Studio */
const STUDIO_REGISTRY_VALUE_PATHS = ["HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio"];
const STUDIO_REGISTRY_KEY_PATHS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio",
    "HKCU\\Software\\Classes\\roblox-studio",
    "HKCU\\Software\\Classes\\roblox-studio-auth",
    "HKCU\\Software\\Classes\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxl",
    "HKCU\\Software\\Classes\\.rbxlx",
];

export {
    PLAYER_REGISTRY_VALUE_PATHS,
    PLAYER_REGISTRY_KEY_PATHS,
    STUDIO_REGISTRY_VALUE_PATHS,
    STUDIO_REGISTRY_KEY_PATHS,
    colors,
    DEPLOYMENT_DEFAULT_CHANNEL,
    folderMappings,
    AppSettings,
    DEPLOYMENT_VERSION_STUDIO_HASH,
    DEPLOYMENT_ROBLOX_CDN_URLS,
    ROBLOX_CLIENTSETTINGS_URLS,
    PLAYER_PROCESSES,
    STUDIO_PROCESSES,
    BINARY_TYPES,
    DEFAULT_FFLAGS,
    DEFAULT_CONFIG,
    WEBVIEW_REGISTRY_KEYPATHS,
    EXCLUDED_DEFAULT_FFLAGS,
};
