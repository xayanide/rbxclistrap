import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFastFlags, launchAutoUpdater, launchRoblox } from "./bootstrapper.js";
import { BINARY_TYPES } from "./modules/constants.js";
import { createPrompt } from "./modules/prompt.js";
import { getPackageData, logPackageVersion } from "./modules/packageData.js";

console.log(`rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions.`);

try {
    const argv = nodeProcess.argv;
    const binaryType = argv.find((arg) => {
        return Object.values(BINARY_TYPES).includes(arg);
    });
    loadConfig(binaryType);
    loadFastFlags(binaryType);
    if (!binaryType) {
        throw new Error(`Unknown binary type: ${binaryType}. Must be WindowsPlayer or Studio64.`);
    }
    const packageData = getPackageData();
    logPackageVersion(packageData, logger);
    logger.info(`${binaryType} bootstrapper starting...`);
    const selectedVersion = await launchAutoUpdater(binaryType);
    const filteredArgv = argv.filter((arg) => {
        return arg !== binaryType;
    });
    await launchRoblox(false, selectedVersion, filteredArgv);
    logger.info(`${binaryType} bootstrapper finished.`);
    nodeProcess.exit(0);
} catch (bootstrapperErr) {
    logger.error(`async launchBootstrapper():\n${bootstrapperErr.message}\n${bootstrapperErr.stack}`);
    await createPrompt("Something went wrong! Press and enter any key to exit.");
    nodeProcess.exit(1);
}
