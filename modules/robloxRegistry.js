const nodePath = require("path");
const { listRegistryItems, createRegistryKeys, putRegistryValues } = require("./registry.js");
const logger = require("./logger.js");

const playerRunPath = nodePath.join(__dirname, "..", "run-player.bat");
const studioRunPath = nodePath.join(__dirname, "..", "run-studio.bat");

/**
registryKeys Object Structure Example
Used as reference.

const registryKeys = {
    keyPath1: {
        valueName1: {
            valueData: "",
            valueType: "",
        },
        valueName2: {
            valueData: "",
            valueType: "",
        },
    },
    keyPath2: {
        valueName1: {
            valueData: "",
            valueType: "",
        },
        valueName2: {
            valueData: "",
            valueType: "",
        },
    },
};
*/

const getKeyPathsWithValues = (registryKeys, parentPath = "", result = []) => {
    for (const keyPath in registryKeys) {
        const fullPath = parentPath ? `${parentPath}\\${keyPath}` : keyPath;
        result.push(fullPath);
        const keyPathValues = registryKeys[keyPath];
        if (typeof keyPathValues === "object" && !("value" in keyPathValues)) {
            getKeyPaths(keyPathValues, fullPath, result);
        }
    }
    return result;
};

const getKeyPaths = (registryKeys, parentPath = "", result = []) => {
    for (const keyPath in registryKeys) {
        const keyPathValues = registryKeys[keyPath];
        if (typeof keyPathValues === "object" && !("value" in keyPathValues)) {
            const fullPath = parentPath ? `${parentPath}\\${keyPath}` : keyPath;
            result.push(fullPath);
            getKeyPaths(keyPathValues, fullPath, result);
        }
    }
    return result;
};

const getPlayerRegistryValues = (binaryPath) => {
    const playerDefaultIconPath = binaryPath;
    const playerOpenCommandPath = `"${playerRunPath}" "%1"`;
    const playerProtocolName = `URL:RobloxPlayerCLI Protocol`;
    return {
        "HKCU\\Software\\Classes\\roblox": {
            REG_DEFAULT: { value: playerProtocolName, type: "REG_DEFAULT" },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox\\DefaultIcon": {
            REG_DEFAULT: {
                value: playerDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox\\shell\\Open": { REG_DEFAULT: { value: "Open", type: "REG_DEFAULT" } },
        "HKCU\\Software\\Classes\\roblox\\shell\\Open\\command": {
            REG_DEFAULT: {
                value: playerOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-player": {
            REG_DEFAULT: { value: playerProtocolName, type: "REG_DEFAULT" },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-player\\DefaultIcon": {
            REG_DEFAULT: {
                value: playerDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-player\\shell\\Open": { REG_DEFAULT: { value: "Open", type: "REG_DEFAULT" } },
        "HKCU\\Software\\Classes\\roblox-player\\shell\\Open\\command": {
            REG_DEFAULT: {
                value: playerOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
    };
};

const getStudioRegistryValues = (binaryPath, selectedVersion) => {
    const studioDefaultIconPath = binaryPath;
    const studioOpenCommandPath = `"${studioRunPath}" %1`;
    const studioProtocolName = `URL:RobloxStudioCLI Protocol`;
    return {
        "HKCU\\Software\\Classes\\roblox-studio": {
            REG_DEFAULT: { value: studioProtocolName, type: "REG_DEFAULT" },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-studio\\DefaultIcon": {
            REG_DEFAULT: {
                value: studioDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-studio\\shell\\open": { REG_DEFAULT: { value: "open", type: "REG_DEFAULT" } },
        "HKCU\\Software\\Classes\\roblox-studio\\shell\\open\\command": {
            REG_DEFAULT: {
                value: studioOpenCommandPath,
                type: "REG_DEFAULT",
            },
            version: { value: selectedVersion, type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-studio-auth": {
            REG_DEFAULT: { value: studioProtocolName, type: "REG_DEFAULT" },
            "URL Protocol": { value: "", type: "REG_SZ" },
        },
        "HKCU\\Software\\Classes\\roblox-studio-auth\\DefaultIcon": {
            REG_DEFAULT: {
                value: studioDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open": { REG_DEFAULT: { value: "open", type: "REG_DEFAULT" } },
        "HKCU\\Software\\Classes\\roblox-studio-auth\\shell\\open\\command": {
            REG_DEFAULT: {
                value: studioOpenCommandPath,
                type: "REG_DEFAULT",
            },
            version: { value: selectedVersion, type: "REG_SZ" },
        },
    };
};

const getStudioPlaceRegistryValues = (binaryPath) => {
    const placeDefaultIconPath = `${binaryPath},0`;
    const placeOpenCommandPath = `"${studioRunPath}" "%1"`;
    return {
        "HKCU\\Software\\Classes\\Roblox.Place": {
            REG_DEFAULT: {
                value: "Roblox Place",
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\Roblox.Place\\DefaultIcon": {
            REG_DEFAULT: {
                value: placeDefaultIconPath,
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open": {
            REG_DEFAULT: {
                value: "Open",
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\Roblox.Place\\shell\\Open\\command": {
            REG_DEFAULT: {
                value: placeOpenCommandPath,
                type: "REG_DEFAULT",
            },
        },
    };
};

const getStudioFileExtensionsRegistryValues = () => {
    return {
        "HKCU\\Software\\Classes\\.rbxl": {
            REG_DEFAULT: {
                value: "Roblox.Place",
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\.rbxl\\Roblox.Place\\ShellNew": {
            REG_DEFAULT: {
                value: "Roblox.Place",
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\.rbxlx": {
            REG_DEFAULT: {
                value: "Roblox.Place",
                type: "REG_DEFAULT",
            },
        },
        "HKCU\\Software\\Classes\\.rbxlx\\Roblox.Place\\ShellNew": {
            REG_DEFAULT: {
                value: "Roblox.Place",
                type: "REG_DEFAULT",
            },
        },
    };
};

const getRegSZValueType = (valueType) => {
    if (valueType !== "REG_DEFAULT") {
        return valueType;
    }
    return "REG_SZ";
};

const getRegDefaultValueName = (valueName) => {
    if (valueName !== "") {
        return valueName;
    }
    return "REG_DEFAULT";
};

/**
Bug fixes
I was unable to set empty strings as value names.
If a valueName is set to "", it should be a REG_DEFAULT type.

fix: Use REG_DEFAULT as the type and choose whatever value name, it'll be set as empty.
https://github.com/kessler/node-regedit/issues/124
Error: expected to have groups of 4 arguments for each valueData that is written to the registry
https://github.com/kessler/node-regedit/blob/master/README.md#note-about-setting-default-values
*/
const filterRegistryValues = (valuesToPut, currentRegistryItems) => {
    const filteredValues = { ...valuesToPut };
    for (const keyPath in currentRegistryItems) {
        const item = currentRegistryItems[keyPath];
        if (!item.exists) {
            continue;
        }
        for (const itemValueName in item.values) {
            const itemValue = item.values[itemValueName];
            const putValue = valuesToPut[keyPath][getRegDefaultValueName(itemValueName)];
            if (!putValue) {
                break;
            }
            const putValueType = getRegSZValueType(putValue.type);
            if (putValue.value !== itemValue.value || putValueType !== itemValue.type) {
                break;
            }
            /**
            The current key exists, currentValue's name, data and type are the same as the expected valueName, valueData and valueType
            from the bootstrapper, delete this specific key object from the valuesToPut object, excluding the key from being updated.
            */
            delete filteredValues[keyPath];
        }
    }
    return filteredValues;
};

const putRobloxRegistryValues = async (valuesToPut, options = { overwrite: true, currentRegistryItems: {} }) => {
    const isOverwrite = options.overwrite;
    if (typeof isOverwrite !== "boolean") {
        throw new Error("Invalid values provided for property 'overwrite'. Must be a boolean.");
    }
    if (isOverwrite) {
        logger.info("Overwriting registry values...");
        await putRegistryValues(valuesToPut);
        return;
    }
    const currentRegistryItems = options.currentRegistryItems;
    if (typeof currentRegistryItems !== "object" || currentRegistryItems === null || Array.isArray(currentRegistryItems)) {
        throw new Error("Invalid values provided for property 'currentRegistryItems'. Must be an object.");
    }
    const filteredValuesToPut = filterRegistryValues(valuesToPut, currentRegistryItems);
    if (Object.keys(filteredValuesToPut).length === 0) {
        logger.info("No missing or different registry values to update.");
        return;
    }
    logger.info("Updating registry values...");
    await putRegistryValues(filteredValuesToPut);
};

const applyRegistryValues = async (valuesToPut) => {
    const keyPaths = getKeyPaths(valuesToPut);
    const registryItems = await listRegistryItems(keyPaths);
    await createRegistryKeys(registryItems);
    await putRobloxRegistryValues(valuesToPut, { overwrite: false, currentRegistryItems: registryItems });
};

module.exports = {
    getPlayerRegistryValues,
    getStudioRegistryValues,
    getStudioPlaceRegistryValues,
    getStudioFileExtensionsRegistryValues,
    applyRegistryValues,
};
