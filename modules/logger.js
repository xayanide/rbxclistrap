const nodeFs = require("fs");
const nodePath = require("path");
const { colors } = require("./constants.js");
const deleteOldLogs = require("./deleteOldLogs.js");

const logFileISOTimestamp = new Date().toISOString().split(":").join("-");
const logsPath = nodePath.join(__dirname, "..", "logs");
try {
    if (!nodeFs.existsSync(logsPath)) {
        nodeFs.mkdirSync(logsPath, { recursive: true });
    }
} catch (dirErr) {
    console.error(`Error creating logs directory: ${dirErr.message}\n${dirErr.stack}`);
}
deleteOldLogs(logsPath);

const LOG_LEVELS = {
    info: `${colors.GREEN}INFO${colors.RESET}`,
    warn: `${colors.YELLOW}WARN${colors.RESET}`,
    error: `${colors.RED}ERROR${colors.RESET}`,
    debug: `${colors.CYAN}DEBUG${colors.RESET}`,
};

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
    info: (message) => logger.log(LOG_LEVELS.info, message),
    warn: (message) => logger.log(LOG_LEVELS.warn, message),
    error: (message) => logger.log(LOG_LEVELS.error, message),
    debug: (message) => logger.log(LOG_LEVELS.debug, message),
};

module.exports = logger;
