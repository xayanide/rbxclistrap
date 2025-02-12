"use strict";
const nodeProcess = require("process");
const { listRegistryItems, deleteRegistryKeys } = require("./modules/registry.js");

const PLAYER_ROOT_REGISTRY_KEYS = ["HKCU\\Software\\Classes\\roblox", "HKCU\\Software\\Classes\\roblox-player"];
(async () => {
    const registryKeys = await listRegistryItems(PLAYER_ROOT_REGISTRY_KEYS);
    await deleteRegistryKeys(registryKeys);
    nodeProcess.exit(0);
})();
