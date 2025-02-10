const promisifiedRegedit = require("regedit").promisified;
const logger = require("./logger.js");

const putRegistryValues = async (valuesToPut) => {
    try {
        logger.info("Putting registry values...");
        await promisifiedRegedit.putValue(valuesToPut);
        logger.info("Successfully put registry values!");
    } catch (registryErr) {
        logger.error(`async putRegistryValues(): Error putting registry values:\n${registryErr.message}\n${registryErr.stack}`);
    }
};

const listRegistryItems = async (keysToList) => {
    try {
        return promisifiedRegedit.list(keysToList);
    } catch (registryErr) {
        logger.error(`async listRegistryItems(): Error listing registry keys:\n${registryErr.message}\n${registryErr.stack}`);
    }
};

const getRegistryItemKeys = (registryItems, options = { exclude: "none" }) => {
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
    return registryItemKeys.filter((key) => registryItems[key].exists !== isExistsExcluded);
};

const createRegistryKeys = async (registryItems) => {
    const keysToCreate = getRegistryItemKeys(registryItems, { exclude: "existing" });
    if (keysToCreate.length === 0) {
        return;
    }
    try {
        logger.info("Creating registry keys...");
        await promisifiedRegedit.createKey(keysToCreate);
        logger.info("Successfully created registry keys!");
    } catch (registryErr) {
        logger.error(`async createRegistryKeys(): Error creating registry keys:\n${registryErr.message}\n${registryErr.stack}`);
    }
};

const deleteRegistryKeys = async (registryItems) => {
    const keysToDelete = getRegistryItemKeys(registryItems, { exclude: "missing" });
    if (keysToDelete.length === 0) {
        return;
    }
    try {
        logger.info("Deleting registry keys...");
        await promisifiedRegedit.deleteKey(keysToDelete);
        logger.info("Successfully deleted registry keys!");
    } catch (registryErr) {
        logger.error(`async deleteRegistryKeys(): Error deleting registry keys:\n${registryErr.message}\n${registryErr.stack}`);
    }
};

/**
Purpose of this is to construct the "Values" to a suitable argument for regedit#putValue() method.

Bug fixes
I am unable to set empty strings as value names.
If key's valueName to be set = ""
fix: Use REG_DEFAULT as the type and choose whatever value name, it'll be set as empty.
https://github.com/kessler/node-regedit/issues/124
Error: expected to have groups of 4 arguments for each valueData that is written to the registry
https://github.com/kessler/node-regedit/blob/master/README.md#note-about-setting-default-values
*/
const getValuesRegistryValues = (values) => {
    const registryValues = {};
    for (const { valueKeyPath, valueName, valueType, valueData } of values) {
        if (!registryValues[valueKeyPath]) {
            registryValues[valueKeyPath] = {};
        }
        const isEmptyValueName = valueName === "" && valueType === "REG_DEFAULT";
        registryValues[valueKeyPath][isEmptyValueName ? valueType : valueName] = { value: valueData, type: valueType };
    }
    return registryValues;
};

const getValuesRegistryKeys = (values) => {
    const registryKeys = [];
    for (const { valueKeyPath } of values) {
        registryKeys.push(valueKeyPath);
    }
    return registryKeys;
};

const registerValues = async (values, options = { overwrite: true, listedRegistryItems: {} }) => {
    const isOverwrite = options.overwrite;
    if (typeof isOverwrite !== "boolean") {
        throw new Error("Invalid values provided for property 'overwrite'. Must be a boolean.");
    }
    const valuesToPut = getValuesRegistryValues(values);
    if (isOverwrite) {
        logger.info("Overwriting registry values...");
        await putRegistryValues(valuesToPut);
        return;
    }
    const listedRegistryItems = options.listedRegistryItems;
    if (typeof listedRegistryItems !== "object" || listedRegistryItems === null || Array.isArray(listedRegistryItems)) {
        throw new Error("Invalid values provided for property 'listedRegistryItems'. Must be an object.");
    }
    for (const key in listedRegistryItems) {
        if (listedRegistryItems[key].exists === false) {
            continue;
        }
        delete valuesToPut[key];
    }
    if (Object.keys(valuesToPut).length === 0) {
        logger.info("No new values to register.");
        return;
    }
    logger.info("Writing missing registry values...");
    await putRegistryValues(valuesToPut);
};

const listValuesRegistryItems = async (values) => {
    const keysToList = getValuesRegistryKeys(values);
    return listRegistryItems(keysToList);
};

module.exports = {
    registerValues,
    listValuesRegistryItems,
    listRegistryItems,
    putRegistryValues,
    createRegistryKeys,
    deleteRegistryKeys,
};
