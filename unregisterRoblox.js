import * as nodeProcess from "node:process";
import { promisified as promisifiedRegedit } from "regedit";
import { getRegistryKeyPaths } from "./modules/registry.js";
import { createPrompt } from "./modules/prompt.js";
import { UNREGISTER_PLAYER_VALUE_PATHS, UNREGISTER_PLAYER_KEY_PATHS, UNREGISTER_STUDIO_VALUE_PATHS, UNREGISTER_STUDIO_KEY_PATHS, APP_TYPES } from "./modules/constants.js";

const argv = nodeProcess.argv;
const appType = argv.find((arg) => {
    return APP_TYPES.includes(arg);
});
if (!appType) {
    console.error("Usage Examples:\nnode unregisterRoblox.js player\nnode unregisterRoblox.js studio");
    await createPrompt("Press and enter any key to exit.");
    nodeProcess.exit(1);
}

async function unregisterApplication(valuePaths, keyPaths) {
    try {
        console.log("Deleting registry values...");
        await promisifiedRegedit.deleteValue(valuePaths);
        console.log("Successfully deleted registry values!");
    } catch (valueErr) {
        console.log(`Error while deleting values:\n${valueErr.message}\n${valueErr.stack}`);
    }
    try {
        const registryItems = await promisifiedRegedit.list(keyPaths);
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
}

if (appType === "player") {
    await unregisterApplication(UNREGISTER_PLAYER_VALUE_PATHS, UNREGISTER_PLAYER_KEY_PATHS);
} else {
    await unregisterApplication(UNREGISTER_STUDIO_VALUE_PATHS, UNREGISTER_STUDIO_KEY_PATHS);
}

await createPrompt("Press and enter any key to exit.");
nodeProcess.exit(0);
