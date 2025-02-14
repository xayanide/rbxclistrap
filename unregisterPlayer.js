import * as nodeProcess from "node:process";
import { listRegistryItems, deleteRegistryKeys, deleteRegistryValues } from "./modules/registry.js";
import { createPrompt } from "./modules/prompt.js";
import { PLAYER_REGISTRY_VALUE_PATHS, PLAYER_REGISTRY_KEY_PATHS } from "./modules/constants.js";

// Currently broken. Issue: Error: access is denied. Open .reg files from root/registry-tools instead.

try {
    await deleteRegistryValues(PLAYER_REGISTRY_VALUE_PATHS);
    const registryKeys = await listRegistryItems(PLAYER_REGISTRY_KEY_PATHS);
    await deleteRegistryKeys(registryKeys);
    nodeProcess.exit(0);
} catch (error) {
    console.log(`Error while unregistering player:\n${error.message}\n${error.stack}`);
    await createPrompt("Something went wrong! Press any key to exit.");
    nodeProcess.exit(1);
}
