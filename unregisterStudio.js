import * as nodeProcess from "node:process";
import { listRegistryItems, deleteRegistryKeys, deleteRegistryValues, filterRegistryItems } from "./modules/registry.js";
import { createPrompt } from "./modules/prompt.js";
import { UNREGISTER_STUDIO_VALUE_PATHS, UNREGISTER_STUDIO_KEY_PATHS } from "./modules/constants.js";

// Currently broken. Issue: Error: access is denied. Open .reg files from root/registry-tools instead.

try {
    await deleteRegistryValues(UNREGISTER_STUDIO_VALUE_PATHS);
} catch (valueErr) {
    console.log(`Error while deleting values:\n${valueErr.message}\n${valueErr.stack}`);
}

try {
    const registryItems = await listRegistryItems(UNREGISTER_STUDIO_KEY_PATHS);
    const existingKeyPaths = filterRegistryItems(registryItems, {
        exclude: "missing",
    });
    if (existingKeyPaths.length > 0) {
        await deleteRegistryKeys(existingKeyPaths);
    }
} catch (keyErr) {
    console.log(`Error while deleting keys:\n${keyErr.message}\n${keyErr.stack}`);
}

await createPrompt("Press and enter any key to exit.");
nodeProcess.exit(0);
