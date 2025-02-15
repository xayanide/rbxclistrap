import * as nodePath from "node:path";
import { getDirname, loadJson } from "./fileUtils.js";

const packageDataPath = nodePath.join(getDirname(import.meta.url), "..", "package.json");

function getPackageData() {
    return loadJson(packageDataPath, null);
}

function logPackageVersion(packageData, logger = console) {
    const packageVersion = packageData.version;
    if (!packageData || !packageVersion) {
        const warningMessage = "Package Version: Unknown!";
        if (typeof logger.warn !== "function") {
            console.warn(warningMessage);
            return;
        }
        logger.warn(warningMessage);
        return;
    }
    const logMessage = `Package Version: v${packageVersion}`;
    if (!packageVersion.includes("dev")) {
        if (typeof logger.info !== "function") {
            console.log(logMessage);
            return;
        }
        logger.info(logMessage);
        return;
    }
    if (typeof logger.warn !== "function") {
        console.warn(logMessage);
        return;
    }
    logger.warn(logMessage);
}

export { getPackageData, logPackageVersion };
