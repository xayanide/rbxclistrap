import * as nodePath from "node:path";
import { getDirname } from "./fileUtils.js";

const dirName = getDirname(import.meta.url);
const playerRunPath = nodePath.join(dirName, "..", "run-player.bat");
const studioRunPath = nodePath.join(dirName, "..", "run-studio.bat");

/**
Registry Data Structure Example
For reference.

Inside registry data can have multiple different folders (Keys or KeyPaths).
Each folder can hold multiple named values. Every named value has two properties:
- valueData (value)
- valueType (type)

Setting a value's type to REG_DEFAULT makes its name insignificant and
becomes equivalent to a value with a blank name "" (Named as '(Default)' in the Registy.).

When setting a value's name to blank "", its value type should explicitly be set as REG_DEFAULT.

In this registryData1, all values retain data and all of their value names are actually blank "" (even if they have names)
as long as its value type is REG_DEFAULT
There must ONLY be ONE VALUE with a type REG_DEFAULT per key. This object is only for demonstration.

const registryData1 = {
    "KEY\\PATH\\1": {
        "": {
            valueData: "Data1",
            valueType: "REG_DEFAULT",
        },
        valueName2: {
            valueData: "Data2",
            valueType: "REG_DEFAULT",
        },
        "": {
            valueData: "",
            valueType: "REG_DEFAULT",
        },
        valueName4NoData: {
            valueData: "",
            valueType: "REG_DEFAULT",
        },
    },
};

In registryData2, all values retain data and have actual value names as long as their value name is not empty
and their type is not REG_DEFAULT.
const registryData2 = {
    "KEY\\PATH\\2": {
        valueName1: {
            valueData: "Data1",
            valueType: "REG_SZ",
        },
        valueName2NoData: {
            valueData: "",
            valueType: "REG_SZ",
        },
    },
}
*/

/* Placeholder:
const UNSET_VALUE = { value: "DEFAULT_VALUE_DATA", type: "REG_DEFAULT" };
const DEFAULT_VALUE = {
    DEFAULT_VALUE_NAME: UNSET_VALUE,
};
*/

/**
The placeholders will remain placeholders until there is a better solution due to issues setting default values with empty value names with regedit module.
Currently, when those specific keys and values are changed (in the placeholders) manually or changed from an external source,
they will not be caught during checks and will not be updated to the values they're supposed to be set below.
*/

/**
SECTION START: Unset value paths
These lead to paths in which no value should be present in them. Denoted by the NULL_CHAR.
If any kind of value is set under these paths, they should be deleted, because they're supposed to be unset.
*/
const NULL_CHAR = "\0";
const CORPORATION_UNSET_VALUE_PATHS = [`HKCU\\Software\\ROBLOX Corporation\\${NULL_CHAR}`, `HKCU\\Software\\ROBLOX Corporation\\Environments\\${NULL_CHAR}`];
const PLAYER_UNSET_VALUE_PATHS = [
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer\\${NULL_CHAR}`,
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer\\Channel\\${NULL_CHAR}`,
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player\\Capabilities\\${NULL_CHAR}`,
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player\\Capabilities\\UrlAssociations\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox\\shell\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox\\shell\\open\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox-player\\shell\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox-player\\shell\\open\\${NULL_CHAR}`,
];
const STUDIO_UNSET_VALUE_PATHS = [
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio\\${NULL_CHAR}`,
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio\\Channel\\${NULL_CHAR}`,
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio\\Capabilities\\${NULL_CHAR}`,
    `HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio\\Capabilities\\UrlAssociations\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox-studio\\shell\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open\\${NULL_CHAR}`,
];
const STUDIO_PLACE_UNSET_VALUE_PATHS = [`HKCU\\Software\\Classes\\Roblox.Place\\shell\\${NULL_CHAR}`];
const STUDIO_FILE_EXTENSIONS_UNSET_VALUE_PATHS = [
    `HKCU\\Software\\Classes\\.rbxl\\Roblox.Place\\${NULL_CHAR}`,
    `HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place\\${NULL_CHAR}`,
];
/** SECTION END: Unset value paths */

const getPlayerRegistryData = (binaryPath, selectedVersion, channel = "live") => {
    const playerChannel = channel === "live" ? "" : channel;
    const playerDefaultIconPath = binaryPath;
    const playerOpenCommandPath = `"${playerRunPath}" "%1"`;
    const playerProtocolName = "URL:RobloxPlayerCLIStrap Protocol";
    const playerApplicationIconPath = `"${binaryPath},0"`;
    return {
        /** ROBLOX Corporation */
        /**
        If you want to check the channel Roblox has specifically chosen for you, visit this with your Roblox account logged in:
        https://clientsettings.roblox.com/v2/user-channel?binaryType=WindowsPlayer
        */
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer\\Channel": {
            "www.roblox.com": { value: playerChannel, type: "REG_SZ" },
        },
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player": {
            DEFAULT_VALUE_NAME: {
                value: playerRunPath,
                type: "REG_DEFAULT",
            },
            baseHost: { value: "www.roblox.com", type: "REG_SZ" },
            version: { value: selectedVersion, type: "REG_SZ" },
            clientExe: { value: binaryPath, type: "REG_SZ" },
        },
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player\\Capabilities": {
            ApplicationDescription: { value: "Roblox", type: "REG_SZ" },
            ApplicationIcon: { value: playerApplicationIconPath, type: "REG_EXPAND_SZ" },
            ApplicationName: { value: "Roblox Player", type: "REG_SZ" },
        },
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player\\Capabilities\\UrlAssociations": {
            "roblox-player": { value: "roblox-player", type: "REG_SZ" },
            "roblox": { value: "roblox", type: "REG_SZ" },
        },
        /** roblox */
        "HKCU\\Software\\Classes\\roblox": {
            "DEFAULT_VALUE_NAME": {
                value: playerProtocolName,
                type: "REG_DEFAULT",
            },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox\\DefaultIcon": {
            DEFAULT_VALUE_NAME: {
                value: playerDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox\\shell\\open\\command": {
            DEFAULT_VALUE_NAME: {
                value: playerOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
        /** roblox-player */
        "HKCU\\Software\\Classes\\roblox-player": {
            "DEFAULT_VALUE_NAME": {
                value: playerProtocolName,
                type: "REG_DEFAULT",
            },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-player\\DefaultIcon": {
            DEFAULT_VALUE_NAME: {
                value: playerDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-player\\shell\\open\\command": {
            DEFAULT_VALUE_NAME: {
                value: playerOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
    };
};

const getStudioRegistryData = (binaryPath, selectedVersion, channel = "live") => {
    const studioChannel = channel === "live" ? "" : channel;
    const studioDefaultIconPath = binaryPath;
    const studioOpenCommandPath = `"${studioRunPath}" "%1"`;
    const studioProtocolName = "URL:RobloxStudioCLIStrap Protocol";
    return {
        /** ROBLOX Corporation */
        /**
        If you want to check the channel Roblox has specifically chosen for you, visit this with your Roblox account logged in:
        https://clientsettings.roblox.com/v2/user-channel?binaryType=WindowsStudio64
        */
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio\\Channel": {
            "www.roblox.com": { value: studioChannel, type: "REG_SZ" },
        },
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio": {
            DEFAULT_VALUE_NAME: {
                value: studioRunPath,
                type: "REG_DEFAULT",
            },
            baseHost: { value: "www.roblox.com", type: "REG_SZ" },
            version: { value: selectedVersion, type: "REG_SZ" },
            clientExe: { value: binaryPath, type: "REG_SZ" },
        },
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio\\Capabilities": {
            ApplicationDescription: { value: "Roblox Studio", type: "REG_SZ" },
            ApplicationIcon: { value: binaryPath, type: "REG_EXPAND_SZ" },
            ApplicationName: { value: "Roblox Studio", type: "REG_SZ" },
        },
        "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio\\Capabilities\\UrlAssociations": {
            "roblox-studio": { value: "roblox-studio", type: "REG_SZ" },
            "roblox-studio-auth": { value: "roblox-studio-auth", type: "REG_SZ" },
        },
        /** roblox-studio */
        "HKCU\\Software\\Classes\\roblox-studio": {
            "DEFAULT_VALUE_NAME": {
                value: studioProtocolName,
                type: "REG_DEFAULT",
            },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-studio\\DefaultIcon": {
            DEFAULT_VALUE_NAME: {
                value: studioDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\command": {
            DEFAULT_VALUE_NAME: {
                value: studioOpenCommandPath,
                type: "REG_DEFAULT",
            },
            version: { value: selectedVersion, type: "REG_SZ" },
        },
        /** roblox-studio-auth */
        "HKCU\\Software\\Classes\\roblox-studio-auth": {
            "DEFAULT_VALUE_NAME": {
                value: studioProtocolName,
                type: "REG_DEFAULT",
            },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-studio-auth\\DefaultIcon": {
            DEFAULT_VALUE_NAME: {
                value: studioDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open\\command": {
            DEFAULT_VALUE_NAME: {
                value: studioOpenCommandPath,
                type: "REG_DEFAULT",
            },
            version: { value: selectedVersion, type: "REG_SZ" },
        },
    };
};

const getStudioPlaceRegistryData = (binaryPath) => {
    const placeDefaultIconPath = `${binaryPath},0`;
    const placeOpenCommandPath = `"${studioRunPath}" "%1"`;
    return {
        "HKCU\\Software\\Classes\\Roblox.Place": {
            DEFAULT_VALUE_NAME: { value: "Roblox Place", type: "REG_DEFAULT" },
        },
        "HKCU\\Software\\Classes\\Roblox.Place\\DefaultIcon": {
            DEFAULT_VALUE_NAME: {
                value: placeDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open": {
            DEFAULT_VALUE_NAME: { value: "Open", type: "REG_DEFAULT" },
        },
        "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open\\command": {
            DEFAULT_VALUE_NAME: {
                value: placeOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
    };
};

const getStudioFileExtensionsRegistryData = () => {
    return {
        "HKCU\\Software\\Classes\\.rbxl": {
            DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        },
        // "HKCU\\Software\\Classes\\.rbxl\\Roblox.Place\\ShellNew": {
        //     DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        // },
        "HKCU\\Software\\Classes\\.rbxlx": {
            DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        },
        // "HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place\\ShellNew": {
        //     DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        // },
    };
};

export {
    getPlayerRegistryData,
    getStudioRegistryData,
    getStudioPlaceRegistryData,
    getStudioFileExtensionsRegistryData,
    CORPORATION_UNSET_VALUE_PATHS,
    PLAYER_UNSET_VALUE_PATHS,
    STUDIO_UNSET_VALUE_PATHS,
    STUDIO_PLACE_UNSET_VALUE_PATHS,
    STUDIO_FILE_EXTENSIONS_UNSET_VALUE_PATHS,
    NULL_CHAR,
};
