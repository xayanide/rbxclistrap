import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFastFlags, launchAutoUpdater, launchRoblox } from "./modules/bootstrapper.js";
import { BINARY_TYPES_MAP, APP_TYPES } from "./modules/constants.js";
import { createPrompt } from "./modules/prompt.js";
import { getPackageData, logPackageVersion } from "./modules/packageData.js";

console.log(`rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions.`);

const argv = nodeProcess.argv;
const appType = argv.find((arg) => {
    return APP_TYPES.includes(arg);
});
if (!appType) {
    console.error("Usage Examples:\nnode . player\nnode . studio\nnode index.js player\nnode index.js studio");
    await createPrompt("Press Enter key to exit.");
    nodeProcess.exit(1);
}
const robloxLaunchArgv = argv.filter((arg) => {
    return arg !== appType;
});
const binaryType = BINARY_TYPES_MAP[appType];

try {
    await loadConfig(binaryType);
    await loadFastFlags(binaryType);
    const packageData = getPackageData();
    logPackageVersion(packageData, logger);
    logger.info(`${binaryType} bootstrapper starting...`);
    const selectedVersion = await launchAutoUpdater(binaryType);
    await launchRoblox(false, selectedVersion, robloxLaunchArgv);
    logger.info(`${binaryType} bootstrapper finished.`);
    nodeProcess.exit(0);
} catch (bootstrapperErr) {
    logger.error(`index.js():\n${bootstrapperErr.message}\n${bootstrapperErr.stack}`);
    await createPrompt("Something went wrong! Press Enter key to exit.");
    nodeProcess.exit(1);
}
