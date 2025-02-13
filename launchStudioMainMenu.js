import * as nodeProcess from "node:process";
import { loadConfig, loadFflags, showMainMenu } from "./versionBootstrapper.js";
import logger from "./modules/logger.js";

try {
    loadConfig();
    loadFflags();
    const binaryType = "WindowsStudio64";
    logger.binaryType = binaryType;
    logger.info(`${binaryType} menu starting...`);
    await showMainMenu(binaryType);
} catch (error) {
    logger.error(`launchStudioMainMenu():\n${error.message}\n${error.stack}`);
    nodeProcess.exit(1);
}
