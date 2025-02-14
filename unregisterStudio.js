import * as nodeProcess from "node:process";
import { listRegistryItems, deleteRegistryKeys } from "./modules/registry.js";
import { createPrompt } from "./modules/prompt.js";

/**
Placeholder:
HKCU\\Software\\ROBLOX Corporation\\Environments
Delete value "roblox-studio"
*/

const STUDIO_ROOT_REGISTRY_KEYS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio",
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\RobloxStudio",
    "HKCU\\Software\\Classes\\roblox-studio",
    "HKCU\\Software\\Classes\\roblox-studio-auth",
    "HKCU\\Software\\Classes\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxl",
    "HKCU\\Software\\Classes\\.rbxlx",
];

try {
    const registryKeys = await listRegistryItems(STUDIO_ROOT_REGISTRY_KEYS);
    await deleteRegistryKeys(registryKeys);
    nodeProcess.exit(0);
} catch (error) {
    console.log(`Error while unregistering player:\n${error.message}\n${error.stack}`);
    await createPrompt("Something went wrong! Press any key to exit.");
    nodeProcess.exit(1);
}
