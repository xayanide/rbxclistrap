import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFflags, showMainMenu } from "./versionBootstrapper.js";
import { createPrompt } from "./modules/prompt.js";

try {
    loadConfig();
    loadFflags();
    const binaryType = "WindowsPlayer";
    logger.binaryType = binaryType;
    logger.info(`${binaryType} menu starting...`);
    await showMainMenu(binaryType);
} catch (error) {
    logger.error(`launchPlayerMainMenu():\n${error.message}\n${error.stack}`);
    await createPrompt("Something went wrong! Press and enter any key to exit.");
    nodeProcess.exit(1);
}
