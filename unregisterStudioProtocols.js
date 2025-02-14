import * as nodeProcess from "node:process";
import { listRegistryItems, deleteRegistryKeys } from "./modules/registry.js";

const STUDIO_ROOT_REGISTRY_KEYS = [
    "HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-studio,",
    "HKCU\\Software\\Classes\\roblox-studio",
    "HKCU\\Software\\Classes\\roblox-studio-auth",
    "HKCU\\Software\\Classes\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxl",
    "HKCU\\Software\\Classes\\.rbxlx",
];

const registryKeys = await listRegistryItems(STUDIO_ROOT_REGISTRY_KEYS);
await deleteRegistryKeys(registryKeys);
nodeProcess.exit(0);
