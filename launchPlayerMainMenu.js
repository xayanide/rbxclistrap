import * as nodeProcess from "node:process";
import { loadConfig, loadFflags, showMainMenu } from "./versionBootstrapper.js";
import logger from "./modules/logger.js";

try {
    loadConfig();
    loadFflags();
    const binaryType = "WindowsPlayer";
    logger.binaryType = binaryType;
    logger.info(`${binaryType} menu starting...`);
    await showMainMenu(binaryType);
} catch (error) {
    logger.error(`launchPlayerMainMenu():\n${error.message}\n${error.stack}`);
    nodeProcess.exit(1);
}
