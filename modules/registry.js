import { promisified as promisifiedRegedit } from "regedit";
import logger from "./logger.js";
import { isEmptyObject } from "./helpers.js";
import { NULL_CHAR } from "./robloxRegistry.js";

const getRegistryKeyPaths = (registryItems, options = { exclude: "none" }) => {
    const exclusion = options.exclude;
    if (!["existing", "missing", "none"].includes(exclusion)) {
        throw new Error("Invalid values provided for property 'exclude'. Must be 'missing', 'existing' or 'none'");
    }
    const keyPaths = [];
    for (const keyPath in registryItems) {
        keyPaths.push(keyPath);
    }
    if (exclusion === "none") {
        return keyPaths;
    }
    const shouldExcludeExisting = exclusion === "existing";
    return keyPaths.filter((keyPath) => {
        return registryItems[keyPath].exists !== shouldExcludeExisting;
    });
};

const getRegistryDataKeyPaths = (registryData, parentPath = "", result = []) => {
    for (const keyPath in registryData) {
        const values = registryData[keyPath];
        if (typeof values === "object" && !("value" in values)) {
            const fullPath = parentPath ? `${parentPath}\\${keyPath}` : keyPath;
            result.push(fullPath);
            getRegistryDataKeyPaths(values, fullPath, result);
        }
    }
    return result;
};

/** Before using PutValueNames for comparison against the registry, we get their actual equivalent in the registry by resolving them. */
const resolvePutValueName = (valueName, valueType) => {
    const isDefaultValue = valueName === "DEFAULT_VALUE_NAME" || valueType === "REG_DEFAULT";
    if (isDefaultValue) {
        return "";
    }
    return valueName;
};

/** Before using PutValueTypes for comparison against the registry, we get their actual equivalent in the registry by resolving them. */
const resolvePutValueType = (valueName, valueType) => {
    const isDefaultValue = valueName === "DEFAULT_VALUE_NAME" || valueType === "REG_DEFAULT";
    if (isDefaultValue) {
        // REG_DEFAULT values are REG_SZ
        return "REG_SZ";
    }
    return valueType;
};

/**
Compares valuesToPut against the current state of the registry's keys and values
to determine which values need updating.

If a key in valuesToPut:
    - Doesn't exist in currentRegistryItems, it's added to filteredValues.
    - Exists but has a different value or type, it's also added.
    - Exists and is the same, it's ignored.

Bug fixes
I was unable to set empty strings as value names.
If a valueName is set to "", it should have a REG_DEFAULT as the type.

fix: Use REG_DEFAULT as the type and choose whatever value name, it'll be set as empty as an empty string.
https://github.com/kessler/node-regedit/issues/124
Error: expected to have groups of 4 arguments for each valueData that is written to the registry
https://github.com/kessler/node-regedit/blob/master/README.md#note-about-setting-default-values
*/
const findChangedRegistryValues = (valuesToPut, currentRegistryItems) => {
    const filteredValues = {};
    for (const putKeyPath in valuesToPut) {
        const putKeyValues = valuesToPut[putKeyPath];
        logger.debug(`Checking for changed values: ${putKeyPath}`);
        if (!putKeyValues) {
            logger.warn("valuesToPut object is undefined. There are no values to set. Skipping...");
            continue;
        }
        const currentKey = currentRegistryItems[putKeyPath];
        const currentValues = currentKey.values;
        if (!currentKey.exists) {
            logger.warn("currentKey doesn't exist. Skipping...");
            continue;
        }
        if (isEmptyObject(currentValues)) {
            logger.warn("currentKey's values object is empty. Adding all values...");
            filteredValues[putKeyPath] = putKeyValues;
            continue;
        }
        for (const putValueName in putKeyValues) {
            const putValue = putKeyValues[putValueName];
            const putValueData = putValue.value;
            const putValueType = putValue.type;
            const resolvedPutValueName = resolvePutValueName(putValueName, putValueType);
            const resolvedPutValueType = resolvePutValueType(putValueName, putValueType);
            const putValueDataLower = putValueData.toLowerCase();
            const currentValue = currentValues[resolvedPutValueName];
            const currentValueDataLower = currentValue.value.toLowerCase();
            const currentValueType = currentValue.type;
            /** No need to have this value set. Skip if the value is unchanged. */
            if (currentValue && putValueDataLower === currentValueDataLower && resolvedPutValueType === currentValueType) {
                continue;
            }
            logger.warn(`ValueName: ${resolvedPutValueName ? resolvedPutValueName : "(Default)"}`);
            logger.warn(`Value has changed:\n${putValueDataLower} !== ${currentValueDataLower} || ${resolvedPutValueType} !== ${currentValueType}\n`);
            if (!filteredValues[putKeyPath]) {
                filteredValues[putKeyPath] = {};
            }
            /**
            Setting empty strings as value names are not allowed.
            Change the type to REG_DEFAULT and set any placeholder name as the value name instead.
            In this case, I set the their placeholder names as DEFAULT_VALUE_NAME.
            */
            filteredValues[putKeyPath][putValueName] = {
                value: putValueData,
                /**
                When setting a value name as an empty string, its type should be REG_DEFAULT.
                After that, any value names you attempt to set will automatically be an empty string.
                */
                type: putValueType,
            };
        }
    }
    return filteredValues;
};

const getValuePathsWithEmptyValueNames = (registryItems) => {
    const valuePaths = [];
    for (const keyPath in registryItems) {
        const keyValues = registryItems[keyPath];
        if (keyValues.values && Object.prototype.hasOwnProperty.call(keyValues.values, "")) {
            /** Re-append the NULL_CHAR to this path. Marking this path for deletion. */
            valuePaths.push(`${keyPath}\\${NULL_CHAR}`);
        }
    }
    return valuePaths;
};

const checkUnsetValuePaths = async (unsetValuePaths) => {
    /**
    Sanitize first, remove the NULL_CHAR from the end of each path to list them as keys,
    because the unsanitized value paths are used only for when we are deleting values
    */
    const sanitizedPaths = unsetValuePaths.map((path) => {
        return path.replace(`\\${NULL_CHAR}`, "");
    });
    const registryItems = await promisifiedRegedit.list(sanitizedPaths);
    /** Find paths that have a default value set */
    const defaultValuePaths = getValuePathsWithEmptyValueNames(registryItems);
    if (defaultValuePaths.length > 0) {
        logger.warn(`Found paths that have default values when they should be unset!:\n${JSON.stringify(defaultValuePaths, null, 2)}`);
        logger.info("Deleting values...");
        await promisifiedRegedit.deleteValue(defaultValuePaths);
        logger.info("Successfully deleted values!");
    }
};

const updateRegistryValues = async (valuesToPut, options = { overwrite: true, currentRegistryItems: {} }) => {
    const isOverwrite = options.overwrite;
    if (typeof isOverwrite !== "boolean") {
        throw new Error("Invalid values provided for property 'overwrite'. Must be a boolean.");
    }
    if (isOverwrite) {
        logger.info("Force updating registry values...");
        await promisifiedRegedit.putValue(valuesToPut);
        logger.info("Successfully put registry values!");
        return;
    }
    const currentRegistryItems = options.currentRegistryItems;
    if (typeof currentRegistryItems !== "object" || currentRegistryItems === undefined || currentRegistryItems === null || Array.isArray(currentRegistryItems)) {
        throw new Error("Invalid values provided for property 'currentRegistryItems'. Must be an object.");
    }
    if (isEmptyObject(currentRegistryItems)) {
        return;
    }
    const filteredValuesToPut = findChangedRegistryValues(valuesToPut, currentRegistryItems);
    if (isEmptyObject(filteredValuesToPut)) {
        return;
    }
    logger.info("Updating registry values...");
    await promisifiedRegedit.putValue(valuesToPut);
    logger.info("Successfully put registry values!");
};

const getConfiguredRobloxChannelName = async (keyPath) => {
    const registryItems = await promisifiedRegedit.list(keyPath);
    const key = registryItems[keyPath];
    const valueData = key.values["www.roblox.com"].value;
    if (!key || !key.exists || !valueData) {
        return "live";
    }
    return valueData;
};

const setRegistryData = async (valuesToPut, keyPaths) => {
    const registryItems = await promisifiedRegedit.list(keyPaths);
    const missingKeyPaths = getRegistryKeyPaths(registryItems, {
        exclude: "existing",
    });
    if (missingKeyPaths.length > 0) {
        logger.debug(`\n${JSON.stringify(missingKeyPaths, null, 2)}`);
        logger.info("Creating missing registry keys...");
        await promisifiedRegedit.createKey(missingKeyPaths);
        logger.info("Successfully created registry keys!");
    }
    const afterCreateRegistryItems = await promisifiedRegedit.list(keyPaths);
    await updateRegistryValues(valuesToPut, {
        overwrite: false,
        currentRegistryItems: afterCreateRegistryItems,
    });
};

export { getRegistryKeyPaths, getRegistryDataKeyPaths, setRegistryData, checkUnsetValuePaths, getConfiguredRobloxChannelName };
