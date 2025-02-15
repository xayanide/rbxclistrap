import * as nodeProcess from "node:process";
import { promisified as promisifiedRegedit } from "regedit";
import { getRegistryKeyPaths } from "./modules/registry.js";
import { createPrompt } from "./modules/prompt.js";
import { UNREGISTER_STUDIO_VALUE_PATHS, UNREGISTER_STUDIO_KEY_PATHS } from "./modules/constants.js";

// Currently broken. Issue: Error: access is denied. Open .reg files from root/registry-tools instead.

try {
    console.log("Deleting registry values...");
    await promisifiedRegedit.deleteValue(UNREGISTER_STUDIO_VALUE_PATHS);
    console.log("Successfully deleted registry values!");
} catch (valueErr) {
    console.log(`Error while deleting values:\n${valueErr.message}\n${valueErr.stack}`);
}

try {
    const registryItems = await promisifiedRegedit.list(UNREGISTER_STUDIO_KEY_PATHS);
    const existingKeyPaths = getRegistryKeyPaths(registryItems, {
        exclude: "missing",
    });
    if (existingKeyPaths.length > 0) {
        console.log("Deleting existing registry keys...");
        await promisifiedRegedit.deleteKey(existingKeyPaths);
        console.log("Successfully deleted registry keys!");
    }
} catch (keyErr) {
    console.log(`Error while deleting keys:\n${keyErr.message}\n${keyErr.stack}`);
}

await createPrompt("Press and enter any key to exit.");
nodeProcess.exit(0);
