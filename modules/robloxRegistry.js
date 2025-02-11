const nodePath = require("path");
const { registerValues, listValuesRegistryItems, createRegistryKeys } = require("./registry.js");

const playerRunPath = nodePath.join(__dirname, "..", "run-player.bat");
const studioRunPath = nodePath.join(__dirname, "..", "run-studio.bat");

const getPlayerRegistryValues = (binaryPath) => {
    const playerOpenCommandPath = `"${playerRunPath}" "%1"`;
    const playerUrlName = "RobloxPlayerCLI";
    const playerProtocolName = `URL:${playerUrlName} Protocol`;
    return [
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: playerProtocolName,
        },
        { valueKeyPath: "HKCU\\Software\\Classes\\roblox", valueName: `URL Protocol`, valueType: "REG_SZ", valueData: "" },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox\\DefaultIcon",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: binaryPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox\\shell\\Open",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: "Open",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox\\shell\\Open\\command",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: playerOpenCommandPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-player",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: playerProtocolName,
        },
        { valueKeyPath: "HKCU\\Software\\Classes\\roblox-player", valueName: "URL Protocol", valueType: "REG_SZ", valueData: "" },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-player\\DefaultIcon",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: binaryPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-player\\shell\\Open",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: "Open",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-player\\shell\\Open\\command",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: playerOpenCommandPath,
        },
    ];
};
const getStudioRegistryValues = (binaryPath, selectedVersion) => {
    const studioOpenCommandPath = `"${studioRunPath}" %1`;
    const studioUrlName = "RobloxStudioCLI";
    const studioProtocolName = `URL:${studioUrlName} Protocol`;
    return [
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioProtocolName,
        },
        { valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio", valueName: `URL Protocol`, valueType: "REG_SZ", valueData: "" },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio\\DefaultIcon",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: binaryPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio\\shell\\open",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: "open",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\command",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioOpenCommandPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\command",
            valueName: "version",
            valueType: "REG_SZ",
            valueData: selectedVersion,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio-auth",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioProtocolName,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio-auth",
            valueName: `URL Protocol`,
            valueType: "REG_SZ",
            valueData: "",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio-auth\\DefaultIcon",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: binaryPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: "open",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open\\command",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioOpenCommandPath,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open\\command",
            valueName: "version",
            valueType: "REG_SZ",
            valueData: selectedVersion,
        },
    ];
};

const getStudioPlaceRegistryValues = (binaryPath) => {
    const placeDefaultIcon = `${binaryPath},0`;
    const placeOpenCommandPath = `"${studioRunPath}" "%1"`;
    return [
        {
            valueKeyPath: "HKCU\\Software\\Classes\\Roblox.Place",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: "Roblox Place",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\Roblox.Place\\DefaultIcon",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: placeDefaultIcon,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: "Open",
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open\\command",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: placeOpenCommandPath,
        },
    ];
};

const getStudioFileExtensionsRegistryValues = () => {
    const studioFilePlaceClassName = "Roblox.Place";
    const studioFileShellNew = `${studioFilePlaceClassName}\\ShellNew`;
    return [
        {
            valueKeyPath: "HKCU\\Software\\Classes\\.rbxl",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioFilePlaceClassName,
        },
        {
            valueKeyPath: `HKCU\\Software\\Classes\\.rbxl\\${studioFileShellNew}`,
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioFilePlaceClassName,
        },
        {
            valueKeyPath: "HKCU\\Software\\Classes\\.rbxlx",
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioFilePlaceClassName,
        },
        {
            valueKeyPath: `HKCU\\Software\\Classes\\.rbxlx\\${studioFileShellNew}`,
            valueName: "",
            valueType: "REG_DEFAULT",
            valueData: studioFilePlaceClassName,
        },
    ];
};

const setupRobloxRegistryValues = async (values) => {
    const currentRegistryItems = await listValuesRegistryItems(values);
    await createRegistryKeys(currentRegistryItems);
    await registerValues(values, { overwrite: false, listedRegistryItems: currentRegistryItems });
};

module.exports = {
    getPlayerRegistryValues,
    getStudioRegistryValues,
    getStudioPlaceRegistryValues,
    getStudioFileExtensionsRegistryValues,
    setupRobloxRegistryValues,
};
