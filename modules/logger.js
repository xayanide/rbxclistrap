import * as nodePath from "node:path";
import * as nodeFs from "node:fs";
import * as nodeProcess from "node:process";
import SimpleLogger from "./loggerClass.js";
import { getDirname } from "./fileUtils.js";
import { APP_TYPES, BINARY_TYPES_MAP } from "./constants.js";

const logFileISOTimestamp = new Date().toISOString().split(":").join("-");
const metaUrl = import.meta.url;

const deleteOldLogFiles = (path) => {
    const logFiles = nodeFs.readdirSync(path);
    const currentDate = new Date();
    // 3 days in milliseconds
    const logExpireTime = 3 * 24 * 60 * 60 * 1000;
    for (let i = 0, n = logFiles.length; i < n; i++) {
        const logFile = logFiles[i];
        const filePath = nodePath.join(path, logFile);
        const fileStat = nodeFs.statSync(filePath);
        const fileAgeDiffMillis = currentDate - fileStat.mtime;
        if (fileAgeDiffMillis < logExpireTime) {
            continue;
        }
        nodeFs.unlinkSync(filePath);
    }
};

const argv = nodeProcess.argv;
const appType = argv.find((arg) => {
    return APP_TYPES.includes(arg);
});
const binaryType = BINARY_TYPES_MAP[appType];

const logsFilePath = nodePath.join(getDirname(metaUrl), "..", "logs", `${binaryType ?? "unknown"}-${logFileISOTimestamp}.log`);
deleteOldLogFiles(nodePath.dirname(logsFilePath));
const logger = SimpleLogger.createLogger(binaryType ?? "Unknown", { filePath: logsFilePath, appendFile: true });

export default logger;
