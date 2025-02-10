const nodeProcess = require("process");
const logger = require("./modules/logger.js");
const { loadConfig, loadFflags, showMainMenu } = require("./versionBootstrapper.js");

(async () => {
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
})();
