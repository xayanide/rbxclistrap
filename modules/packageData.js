import * as nodePath from "node:path";
import { getDirname, loadJson } from "./fileUtils.js";

const packageDataPath = nodePath.join(getDirname(import.meta.url), "..", "package.json");

async function getPackageData() {
    return await loadJson(packageDataPath, null, false);
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
    const cautionMessage = `${logMessage}\nWARNING: You are using a pre-release version. This version may contain incomplete features, bugs, or other issues.`;
    if (!packageVersion.includes("dev")) {
        if (typeof logger.info !== "function") {
            console.log(logMessage);
            return;
        }
        logger.info(logMessage);
        return;
    }
    if (typeof logger.warn !== "function") {
        console.warn(cautionMessage);
        return;
    }
    logger.warn(cautionMessage);
}

export { getPackageData, logPackageVersion };
