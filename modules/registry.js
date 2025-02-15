import regedit from "regedit";
const promisifiedRegedit = regedit.promisified;
import logger from "./logger.js";
import { isEmptyObject } from "./helpers.js";

const putRegistryValues = async (valuesToPut) => {
    logger.info("Putting registry values...");
    await promisifiedRegedit.putValue(valuesToPut);
    logger.info("Successfully put registry values!");
};

const deleteRegistryValues = async (valuesToDelete) => {
    logger.info("Deleting registry values...");
    await promisifiedRegedit.deleteValue(valuesToDelete);
    logger.info("Successfully deleted registry values!");
};

const listRegistryItems = async (keysToList) => {
    return await promisifiedRegedit.list(keysToList);
};

const filterRegistryItems = (registryItems, options = { exclude: "none" }) => {
    const exclusion = options.exclude;
    if (!["existing", "missing", "none"].includes(exclusion)) {
        throw new Error("Invalid values provided for property 'exclude'. Must be 'missing', 'existing' or 'none'");
    }
    const registryItemKeys = [];
    for (const key in registryItems) {
        registryItemKeys.push(key);
    }
    if (exclusion === "none") {
        return registryItemKeys;
    }
    const isExistsExcluded = exclusion === "existing";
    return registryItemKeys.filter((key) => {
        return registryItems[key].exists !== isExistsExcluded;
    });
};

const createRegistryKeys = async (keysToCreate) => {
    logger.info("Creating registry keys...");
    await promisifiedRegedit.createKey(keysToCreate);
    logger.info("Successfully created registry keys!");
};

const deleteRegistryKeys = async (keysToDelete) => {
    logger.info("Deleting registry keys...");
    await promisifiedRegedit.deleteKey(keysToDelete);
    logger.info("Successfully deleted registry keys!");
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
        if (!putKeyValues) {
            logger.warn("valuesToPut object has no values to set");
            continue;
        }
        const currentKey = currentRegistryItems[putKeyPath];
        const currentValues = currentKey.values;
        if (!currentKey.exists) {
            continue;
        }
        if (isEmptyObject(currentValues)) {
            filteredValues[putKeyPath] = putKeyValues;
            continue;
        }
        for (const putValueName in putKeyValues) {
            const putValue = putKeyValues[putValueName];
            const putValueData = putValue.value;
            const putValueType = putValue.type;
            const currentValue = currentValues[resolvePutValueName(putValueName, putValueType)];
            /** No need to have this value set. Skip if the value is unchanged. */
            if (currentValue && putValueData === currentValue.value && resolvePutValueType(putValueName, putValueType) === currentValue.type) {
                continue;
            }
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
    await putRegistryValues(filteredValuesToPut);
};

const setRegistryData = async (valuesToPut, keyPaths) => {
    const registryItems = await listRegistryItems(keyPaths);
    const missingKeyPaths = filterRegistryItems(registryItems, {
        exclude: "existing",
    });
    if (missingKeyPaths.length > 0) {
        await createRegistryKeys(missingKeyPaths);
    }
    const afterCreateRegistryItems = await listRegistryItems(keyPaths);
    await updateRegistryValues(valuesToPut, {
        overwrite: false,
        currentRegistryItems: afterCreateRegistryItems,
    });
};

export {
    listRegistryItems,
    putRegistryValues,
    createRegistryKeys,
    deleteRegistryKeys,
    deleteRegistryValues,
    filterRegistryItems,
    getRegistryDataKeyPaths,
    setRegistryData,
};
