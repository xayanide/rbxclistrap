import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeChildProcess from "node:child_process";
import logger from "./logger.js";
import { listRegistryItems } from "./registry.js";
import { WEBVIEW_REGISTRY_KEYPATHS } from "./constants.js";

const checkEdgeWebView = async () => {
    logger.info("Checking for Microsoft Edge WebView2 Runtime...");
    const webViewRegistryKeys = await listRegistryItems(WEBVIEW_REGISTRY_KEYPATHS);
    for (const key in webViewRegistryKeys) {
        if (webViewRegistryKeys[key].exists === false) {
            continue;
        }
        logger.info("Microsoft Edge WebView2 Runtime is already installed.");
        return true;
    }
    logger.info("Microsoft Edge WebView2 Runtime is not installed.");
    return false;
};

const installEdgeWebView = async (installPath) => {
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
    const isWebViewExists = await checkEdgeWebView();
    if (isWebViewExists) {
        return;
    }
    logger.info("Installing Microsoft Edge WebView2 Runtime...");
    nodeChildProcess.execSync(`${webviewSetupFilePath} /silent /install`, (error) => {
        if (error) {
            logger.error(`Error installing Microsoft Edge WebView2 Runtime:\n${error}`);
        }
    });
    logger.info("Successfully installed Microsoft Edge WebView2 Runtime!");
};

export { checkEdgeWebView, installEdgeWebView };
