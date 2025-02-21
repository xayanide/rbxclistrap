import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFastFlags, launchAutoUpdater, launchRoblox } from "./modules/bootstrapper.js";
import { BINARY_TYPES } from "./modules/constants.js";
import { createPrompt } from "./modules/prompt.js";
import { getPackageData, logPackageVersion } from "./modules/packageData.js";

console.log(`rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions.`);

const argv = nodeProcess.argv;
const binaryType = argv.find((arg) => {
    return Object.values(BINARY_TYPES).includes(arg);
});
if (!binaryType) {
    console.error("Usage: node launchBootstrapper.js <WindowsPlayer | WindowsStudio64>");
    nodeProcess.exit(1);
}
const robloxLaunchArgv = argv.filter((arg) => {
    return arg !== binaryType;
});

try {
    loadConfig(binaryType);
    loadFastFlags(binaryType);
    const packageData = getPackageData();
    logPackageVersion(packageData, logger);
    logger.info(`${binaryType} bootstrapper starting...`);
    const selectedVersion = await launchAutoUpdater(binaryType);
    await launchRoblox(false, selectedVersion, robloxLaunchArgv);
    logger.info(`${binaryType} bootstrapper finished.`);
    nodeProcess.exit(0);
} catch (bootstrapperErr) {
    logger.error(`async launchBootstrapper():\n${bootstrapperErr.message}\n${bootstrapperErr.stack}`);
    await createPrompt("Something went wrong! Press and enter any key to exit.");
    nodeProcess.exit(1);
}
