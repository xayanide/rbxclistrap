import * as nodeProcess from "node:process";
import { listRegistryItems, deleteRegistryKeys } from "./modules/registry.js";
import { createPrompt } from "./modules/prompt.js";

/**
Placeholder:
HKCU\\Software\\ROBLOX Corporation\\Environments
Delete value "roblox-player"
*/

const PLAYER_ROOT_REGISTRY_KEYS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxPlayer",
    "HKCU\\Software\\Classes\\roblox",
    "HKCU\\Software\\Classes\\roblox-player",
];

try {
    const registryKeys = await listRegistryItems(PLAYER_ROOT_REGISTRY_KEYS);
    await deleteRegistryKeys(registryKeys);
    nodeProcess.exit(0);
} catch (error) {
    console.log(`Error while unregistering player:\n${error.message}\n${error.stack}`);
    await createPrompt("Something went wrong! Press any key to exit.");
    nodeProcess.exit(1);
}
