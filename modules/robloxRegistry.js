import * as nodePath from "node:path";
import { listRegistryItems, createRegistryKeys, putRegistryValues } from "./registry.js";
import { getDirname } from "./fileUtils.js";
import logger from "./logger.js";

const metaUrl = import.meta.url;
const playerRunPath = nodePath.join(getDirname(metaUrl), "..", "run-player.bat");
const studioRunPath = nodePath.join(getDirname(metaUrl), "..", "run-studio.bat");

/**
Registry Data Structure Example
For reference.

Inside registry data can have multiple different folders (Keys or KeyPaths).
Each folder can hold multiple named values. Every named value has two properties:
- valueData (value)
- valueType (type)

When setting a value's name to blank '', its value type should explicitly be set as REG_DEFAULT.

Setting a value's type to REG_DEFAULT makes its name insignificant and
becomes equivalent to a value with a blank name '' (Named as '(Default)' in the Registy.).

const registryKeys = {
    "KEY\\PATH\\1": {
        valueName1: {
            valueData: "Data1",
            valueType: "REG_DEFAULT",
        },
        "": {
            valueData: "",
            valueType: "REG_DEFAULT",
        },
    },
    "KEY\\PATH\\2": {
        valueName1: {
            valueData: "Data1",
            valueType: "REG_DEFAULT",
        },
        "": {
            valueData: "",
            valueType: "REG_DEFAULT",
        },
    },
};
*/

/*
const UNSET_VALUE = { value: "DEFAULT_VALUE_DATA", type: "REG_DEFAULT" };
const DEFAULT_VALUE = {
    DEFAULT_VALUE_NAME: UNSET_VALUE,
};
*/

const getPlayerRegistryData = (binaryPath) => {
    const playerDefaultIconPath = binaryPath;
    const playerOpenCommandPath = `"${playerRunPath}" "%1"`;
    const playerProtocolName = `URL:RobloxPlayerCLIStrap Protocol`;
    return {
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
        // "HKCU\\Software\\Classes\\roblox\\shell": DEFAULT_VALUE,
        "HKCU\\Software\\Classes\\roblox\\shell\\Open": {
            DEFAULT_VALUE_NAME: { value: "Open", type: "REG_DEFAULT" },
        },
        "HKCU\\Software\\Classes\\roblox\\shell\\Open\\command": {
            DEFAULT_VALUE_NAME: {
                value: playerOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
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
        // "HKCU\\Software\\Classes\\roblox-player\\shell": DEFAULT_VALUE,
        "HKCU\\Software\\Classes\\roblox-player\\shell\\Open": {
            DEFAULT_VALUE_NAME: { value: "Open", type: "REG_DEFAULT" },
        },
        "HKCU\\Software\\Classes\\roblox-player\\shell\\Open\\command": {
            DEFAULT_VALUE_NAME: {
                value: playerOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
    };
};

const getStudioRegistryData = (binaryPath, selectedVersion) => {
    const studioDefaultIconPath = binaryPath;
    const studioOpenCommandPath = `"${studioRunPath}" %1`;
    const studioProtocolName = `URL:RobloxStudioCLIStrap Protocol`;
    return {
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
        // "HKCU\\Software\\Classes\\roblox-studio\\shell": DEFAULT_VALUE,
        "HKCU\\Software\\Classes\\roblox-studio\\shell\\open": {
            DEFAULT_VALUE_NAME: { value: "open", type: "REG_DEFAULT" },
        },
        "HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\command": {
            DEFAULT_VALUE_NAME: {
                value: studioOpenCommandPath,
                type: "REG_DEFAULT",
            },
            version: { value: selectedVersion, type: "REG_SZ" },
        },
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
        // "HKCU\\Software\\Classes\\roblox-studio-auth\\shell": DEFAULT_VALUE,
        "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open": {
            DEFAULT_VALUE_NAME: { value: "open", type: "REG_DEFAULT" },
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
        // "HKCU\\Software\\Classes\\Roblox.Place\\shell": DEFAULT_VALUE,
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
        // "HKCU\\Software\\Classes\\.rbxl\\Roblox.Place": DEFAULT_VALUE,
        "HKCU\\Software\\Classes\\.rbxl\\Roblox.Place\\ShellNew": {
            DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        },
        "HKCU\\Software\\Classes\\.rbxlx": {
            DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        },
        // "HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place": DEFAULT_VALUE,
        "HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place\\ShellNew": {
            DEFAULT_VALUE_NAME: { value: "Roblox.Place", type: "REG_DEFAULT" },
        },
    };
};

const getRegistryDataKeyPaths = (registryKeys, parentPath = "", result = []) => {
    for (const keyPath in registryKeys) {
        const keyPathValues = registryKeys[keyPath];
        if (typeof keyPathValues === "object" && !("value" in keyPathValues)) {
            const fullPath = parentPath ? `${parentPath}\\${keyPath}` : keyPath;
            result.push(fullPath);
            getRegistryDataKeyPaths(keyPathValues, fullPath, result);
        }
    }
    return result;
};

const getItemValueType = (valueName, valueType) => {
    if (valueName === "" || valueType === "REG_DEFAULT" || (valueName === "" && valueType === "REG_SZ")) {
        return "REG_DEFAULT";
    }
    return valueType;
};

const getPutValueName = (valueName, valueType) => {
    if (valueName === "" || valueType === "REG_DEFAULT" || (valueName === "" && valueType === "REG_SZ")) {
        return "DEFAULT_VALUE_NAME";
    }
    return valueName;
};

/**
Bug fixes
I was unable to set empty strings as value names.
If a valueName is set to "", it should have a REG_DEFAULT as the type.

fix: Use REG_DEFAULT as the type and choose whatever value name, it'll be set as empty as an empty string.
https://github.com/kessler/node-regedit/issues/124
Error: expected to have groups of 4 arguments for each valueData that is written to the registry
https://github.com/kessler/node-regedit/blob/master/README.md#note-about-setting-default-values
*/
const filterRegistryValues = (valuesToPut, currentRegistryItems) => {
    const filteredValues = {};
    for (const keyPath in currentRegistryItems) {
        const item = currentRegistryItems[keyPath];
        const itemValues = item.values;
        if (!item.exists === 0) {
            continue;
        }
        const valuesToPutValues = valuesToPut[keyPath];
        if (Object.keys(itemValues).length === 0) {
            filteredValues[keyPath] = valuesToPutValues;
            continue;
        }
        for (const itemValueName in itemValues) {
            const itemValue = itemValues[itemValueName];
            const itemValueType = getItemValueType(itemValueName, itemValue.type);
            const putValueName = getPutValueName(itemValueName, itemValueType);
            const putValue = valuesToPutValues[putValueName];
            if (!putValue) {
                continue;
            }
            const putValueType = putValue.type;
            const putValueData = putValue.value;
            if (putValueData !== itemValue.value || putValueType !== itemValueType) {
                if (!filteredValues[keyPath]) {
                    filteredValues[keyPath] = {};
                }
                /**
                Setting empty strings as value names are not allowed.
                Change the type to REG_DEFAULT and set any placeholder name as the value name instead.
                */
                filteredValues[keyPath][putValueName] = {
                    value: putValueData,
                    /**
                    When setting a value name as an empty string, its type should be REG_DEFAULT.
                    After that, any value names you attempt to set will automatically be an empty string.
                    */
                    type: putValueType,
                };
                continue;
            }
        }
    }
    return filteredValues;
};

const updateRegistryValues = async (valuesToPut, options = { overwrite: true, currentRegistryItems: {} }) => {
    const isOverwrite = options.overwrite;
    if (typeof isOverwrite !== "boolean") {
        throw new Error("Invalid values provided for property 'overwrite'. Must be a boolean.");
    }
    if (isOverwrite) {
        logger.info("Force updating registry values...");
        await putRegistryValues(valuesToPut);
        return;
    }
    const currentRegistryItems = options.currentRegistryItems;
    if (typeof currentRegistryItems !== "object" || currentRegistryItems === null || Array.isArray(currentRegistryItems)) {
        throw new Error("Invalid values provided for property 'currentRegistryItems'. Must be an object.");
    }
    if (Object.keys(currentRegistryItems).length === 0) {
        return;
    }
    const filteredValuesToPut = filterRegistryValues(valuesToPut, currentRegistryItems);
    if (Object.keys(filteredValuesToPut).length === 0) {
        return;
    }
    logger.info("Updating registry values...");
    await putRegistryValues(filteredValuesToPut);
};

const setRegistryData = async (valuesToPut) => {
    const keyPaths = getRegistryDataKeyPaths(valuesToPut);
    const registryItems = await listRegistryItems(keyPaths);
    await createRegistryKeys(registryItems);
    await updateRegistryValues(valuesToPut, {
        overwrite: false,
        currentRegistryItems: registryItems,
    });
};

export { getPlayerRegistryData, getStudioRegistryData, getStudioPlaceRegistryData, getStudioFileExtensionsRegistryData, setRegistryData };
