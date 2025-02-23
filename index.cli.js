import * as nodeProcess from "node:process";
import logger from "./modules/logger.js";
import { loadConfig, loadFastFlags, showMainMenu } from "./modules/bootstrapper.js";
import { createPrompt } from "./modules/prompt.js";
import { BINARY_TYPES_MAP, APP_TYPES } from "./modules/constants.js";

const argv = nodeProcess.argv;
const appType = argv.find((arg) => {
    return APP_TYPES.includes(arg);
});
if (!appType) {
    console.error("Usage Examples:\nnode index.cli.js player\nnode index.cli.js studio");
    await createPrompt("Press Enter key to exit.");
    nodeProcess.exit(1);
}
const binaryType = BINARY_TYPES_MAP[appType];

try {
    await loadConfig(binaryType);
    await loadFastFlags(binaryType);
    logger.info(`${binaryType} menu starting...`);
    await showMainMenu(binaryType);
} catch (error) {
    logger.error(`index.cli.js():\n${error.message}\n${error.stack}`);
    await createPrompt("Something went wrong! Press Enter key to exit.");
    nodeProcess.exit(1);
}
