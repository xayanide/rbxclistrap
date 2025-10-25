import * as nodePath from "node:path";
import * as nodeFsPromises from "node:fs/promises";
import * as nodeProcess from "node:process";
import * as winston from "winston";
import { getDirname } from "./fileUtils.js";
import { APP_TYPES, BINARY_TYPES_MAP } from "./constants.js";

const { combine, printf, colorize, timestamp: winstonTimestamp } = winston.format;
const utcTimestamp = winstonTimestamp({
    format: function () {
        return new Date().toISOString();
    },
});
const logFileISOTimestamp = new Date().toISOString().split(":").join("-");
const metaUrl = import.meta.url;

const deleteOldLogFiles = async (path) => {
    const logFiles = await nodeFsPromises.readdir(path);
    const currentDate = new Date();
    // 3 days in milliseconds
    const logExpireTime = 3 * 24 * 60 * 60 * 1000;
    for (let i = 0, n = logFiles.length; i < n; i++) {
        const logFile = logFiles[i];
        const filePath = nodePath.join(path, logFile);
        const fileStats = await nodeFsPromises.stat(filePath);
        const fileAgeDiffMillis = currentDate - fileStats.mtime;
        if (fileAgeDiffMillis < logExpireTime) {
            continue;
        }
        await nodeFsPromises.unlink(filePath);
    }
};

const argv = nodeProcess.argv;
const appType = argv.find((arg) => {
    return APP_TYPES.includes(arg);
});
const binaryType = BINARY_TYPES_MAP[appType];

function printLog({ level, message, timestamp }) {
    return `${timestamp} [${level}]  ${binaryType}: ${message}`;
}
const logsFilePath = nodePath.join(getDirname(metaUrl), "..", "logs", `${binaryType ?? "unknown"}-${logFileISOTimestamp}.log`);
await deleteOldLogFiles(nodePath.dirname(logsFilePath));
const logger = winston.createLogger({
    level: "debug",
    format: combine(utcTimestamp, printf(printLog)),
    transports: [
        new winston.transports.Console({
            format: combine(utcTimestamp, colorize(), printf(printLog)),
        }),
        new winston.transports.File({
            filename: logsFilePath,
            // 5MB per file
            maxsize: 5 * 1024 * 1024,
            // optional, keep last 5 files
            maxFiles: 5,
        }),
    ],
});
export default logger;
