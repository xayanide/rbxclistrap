"use strict";
const nodeProcess = require("process");
const { listRegistryItems, deleteRegistryKeys } = require("./modules/registry.js");

const STUDIO_ROOT_REGISTRY_KEYS = [
    "HKCU\\Software\\Classes\\roblox-studio",
    "HKCU\\Software\\Classes\\roblox-studio-auth",
    "HKCU\\Software\\Classes\\Roblox.Place",
    "HKCU\\Software\\Classes\\.rbxl",
    "HKCU\\Software\\Classes\\.rbxlx",
];
(async () => {
    const registryKeys = await listRegistryItems(STUDIO_ROOT_REGISTRY_KEYS);
    await deleteRegistryKeys(registryKeys);
    nodeProcess.exit(0);
})();
