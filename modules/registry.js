import regedit from "regedit";
const promisifiedRegedit = regedit.promisified;
import logger from "./logger.js";

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

const createRegistryKeys = async (registryItems) => {
    // Creates only non-existent keys and excludes existing keys
    const keysToCreate = filterRegistryItems(registryItems, {
        exclude: "existing",
    });
    if (keysToCreate.length === 0) {
        return;
    }
    logger.info("Creating registry keys...");
    await promisifiedRegedit.createKey(keysToCreate);
    logger.info("Successfully created registry keys!");
};

const deleteRegistryKeys = async (registryItems) => {
    // Deletes only existing keys and excludes non-existent keys
    const keysToDelete = filterRegistryItems(registryItems, {
        exclude: "missing",
    });
    if (keysToDelete.length === 0) {
        return;
    }
    logger.info("Deleting registry keys...");
    await promisifiedRegedit.deleteKey(keysToDelete);
    logger.info("Successfully deleted registry keys!");
};

export { listRegistryItems, putRegistryValues, createRegistryKeys, deleteRegistryKeys, deleteRegistryValues };
