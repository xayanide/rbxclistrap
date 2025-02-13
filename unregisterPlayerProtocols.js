import * as nodeProcess from "node:process";
import { listRegistryItems, deleteRegistryKeys } from "./modules/registry.js";

const PLAYER_ROOT_REGISTRY_KEYS = ["HKCU\\Software\\Classes\\roblox", "HKCU\\Software\\Classes\\roblox-player"];

const registryKeys = await listRegistryItems(PLAYER_ROOT_REGISTRY_KEYS);
await deleteRegistryKeys(registryKeys);
nodeProcess.exit(0);
