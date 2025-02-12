"use strict";
const nodeProcess = require("process");
const logger = require("./modules/logger.js");
const { loadConfig, loadFflags, showMainMenu } = require("./versionBootstrapper.js");

(async () => {
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
})();
