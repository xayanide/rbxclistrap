import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFflags, showMainMenu } from "./versionBootstrapper.js";
import { createPrompt } from "./modules/prompt.js";
import { BINARY_TYPES } from "./modules/constants.js";

/**
Get binary type from command-line arguments
Expecting "WindowsPlayer" or "WindowsStudio64"
*/
const binaryType = process.argv[2];

if (!binaryType || (binaryType !== BINARY_TYPES.PLAYER && binaryType !== BINARY_TYPES.STUDIO)) {
    console.error("Usage: node launchCLI.js <WindowsPlayer|WindowsStudio64>");
    nodeProcess.exit(1);
}

try {
    loadConfig(binaryType);
    loadFflags(binaryType);
    logger.binaryType = binaryType;
    logger.info(`${binaryType} menu starting...`);
    await showMainMenu(binaryType);
} catch (error) {
    logger.error(`launch${binaryType}MainMenu():\n${error.message}\n${error.stack}`);
    await createPrompt("Something went wrong! Press and enter any key to exit.");
    nodeProcess.exit(1);
}
