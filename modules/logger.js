import * as nodePath from "node:path";
import * as nodeFs from "node:fs";
import * as nodeProcess from "node:process";
import LoggerClass from "./loggerClass.js";
import { getDirname } from "./fileUtils.js";
import { BINARY_TYPES } from "./constants.js";

const logFileISOTimestamp = new Date().toISOString().split(":").join("-");
const metaUrl = import.meta.url;

const deleteOldLogFiles = (path) => {
    const logFiles = nodeFs.readdirSync(path);
    const currentDate = new Date();
    // 3 days in milliseconds
    const logExpireTime = 3 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < logFiles.length; i++) {
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
const binaryType = argv.find((arg) => {
    return Object.values(BINARY_TYPES).includes(arg) ?? "Unknown";
});

const logsFilePath = nodePath.join(getDirname(metaUrl), "..", "logs", `${binaryType}-${logFileISOTimestamp}.log`);
deleteOldLogFiles(logsFilePath);
const logger = LoggerClass.createLogger(binaryType, { filepath: logsFilePath, appendFile: true });

export default logger;
