import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFflags, launchAutoUpdater, launchRoblox } from "./versionBootstrapper.js";
import { BINARY_TYPES } from "./modules/constants.js";
import { createPrompt } from "./modules/prompt.js";

console.log(`rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions.`);

try {
    loadConfig();
    loadFflags();
    const argv = nodeProcess.argv;
    const binaryType = argv.find((arg) => {
        return Object.values(BINARY_TYPES).includes(arg);
    });
    if (!binaryType) {
        throw new Error(`Unknown binary type: ${binaryType}. Must be WindowsPlayer or Studio64.`);
    }
    logger.binaryType = binaryType;
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
