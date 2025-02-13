import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import { colors } from "./constants.js";

const LOG_LEVELS = {
    info: `${colors.GREEN}INFO${colors.RESET}`,
    warn: `${colors.YELLOW}WARN${colors.RESET}`,
    error: `${colors.RED}ERROR${colors.RESET}`,
    debug: `${colors.CYAN}DEBUG${colors.RESET}`,
};

const logFileISOTimestamp = new Date().toISOString().split(":").join("-");
const logsPath = nodePath.join(import.meta.dirname, "..", "logs");

try {
    if (!nodeFs.existsSync(logsPath)) {
        nodeFs.mkdirSync(logsPath, { recursive: true });
    }
} catch (dirErr) {
    console.error(`Error creating logs directory: ${dirErr.message}\n${dirErr.stack}`);
}

const deleteOldLogs = (path) => {
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
        console.log(`Deleted old log file: ${logFile}`);
    }
};

deleteOldLogs(logsPath);

const logger = {
    binaryType: "Unknown",
    log(level, message) {
        const currentDate = new Date();
        const isoTimestamp = currentDate.toISOString();
        const logMessage = `[${isoTimestamp}] [${level}] ${message}`;
        console.log(logMessage);
        try {
            const logFileName = `${logFileISOTimestamp}-${logger.binaryType}.log`;
            const logFilePath = nodePath.join(logsPath, logFileName);
            nodeFs.appendFileSync(logFilePath, `${logMessage}\n`);
        } catch (logErr) {
            console.error(`log(): Error appending log message:\n${logErr.message}\n${logErr.stack}`);
        }
    },
    info: (message) => {
        return logger.log(LOG_LEVELS.info, message);
    },
    warn: (message) => {
        return logger.log(LOG_LEVELS.warn, message);
    },
    error: (message) => {
        return logger.log(LOG_LEVELS.error, message);
    },
    debug: (message) => {
        return logger.log(LOG_LEVELS.debug, message);
    },
};

export default logger;
