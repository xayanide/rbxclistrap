import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeChildProcess from "node:child_process";
import logger from "./logger.js";
import { promisified as promisifiedRegedit } from "regedit";
import { WEBVIEW_REGISTRY_KEYPATHS } from "./constants.js";

const isWebViewInstalled = async () => {
    logger.info("Checking for Microsoft Edge WebView2 Runtime...");
    const webViewRegistryKeys = await promisifiedRegedit.list(WEBVIEW_REGISTRY_KEYPATHS);
    for (const key in webViewRegistryKeys) {
        if (webViewRegistryKeys[key].exists === false) {
            continue;
        }
        return true;
    }
    return false;
};

const installEdgeWebView = async (installPath) => {
    if (!installPath) {
        return;
    }
    const webViewSetupPath = nodePath.join(installPath, "WebView2RuntimeInstaller");
    if (!nodeFs.existsSync(webViewSetupPath)) {
        logger.warn(`WebView2RuntimeInstaller folder not found in ${installPath}`);
        return;
    }
    const webviewSetupFilePath = nodePath.join(webViewSetupPath, "MicrosoftEdgeWebview2Setup.exe");
    if (!nodeFs.existsSync(webviewSetupFilePath)) {
        logger.warn(`MicrosoftEdgeWebview2Setup.exe not found in ${webViewSetupPath}`);
        return;
    }
    const isInstalled = await isWebViewInstalled();
    if (isInstalled) {
        logger.info("Microsoft Edge WebView2 Runtime is already installed.");
        return;
    }
    logger.info("Installing Microsoft Edge WebView2 Runtime...");
    const spawnArgs = ["/silent", "/install"];
    logger.info(`Launching with command: ${webviewSetupFilePath} ${spawnArgs.join(" ")}`);
    try {
        await new Promise((resolve, reject) => {
            const childProcess = nodeChildProcess.spawn(webviewSetupFilePath, spawnArgs, {
                /** Show installation logs in console so we know what is happening */
                stdio: "inherit",
            });
            childProcess.on("exit", (code) => {
                if (code === 0) {
                    logger.info("Microsoft Edge WebView2 Runtime installed successfully.");
                    resolve();
                } else {
                    logger.error(`Microsoft Edge WebView2 Runtime installation failed with code: ${code}`);
                    reject(new Error(`Installation failed with code: ${code}`));
                }
            });
            childProcess.on("error", (err) => {
                logger.error(`Failed to start installer process:\n${err}`);
                reject(err);
            });
        });
        /** Make sure that WebView2 is installed after the process exits */
        const isNowInstalled = await isWebViewInstalled();
        if (!isNowInstalled) {
            logger.error("Microsoft Edge WebView2 Runtime installation did not complete successfully.");
        }
    } catch (error) {
        logger.error(`Error during Microsoft Edge WebView2 installation:\n${error.message}\n${error.stack}`);
    }
};

export { installEdgeWebView };
