const nodeFs = require("fs");
const nodePath = require("path");

const deleteOldLogs = (logsPath) => {
    const logFiles = nodeFs.readdirSync(logsPath);
    const currentDate = new Date();
    // 3 days in milliseconds
    const logExpireTime = 3 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < logFiles.length; i++) {
        const logFile = logFiles[i];
        const filePath = nodePath.join(logsPath, logFile);
        const fileStat = nodeFs.statSync(filePath);
        const fileAgeDiffMillis = currentDate - fileStat.mtime;
        if (fileAgeDiffMillis < logExpireTime) {
            continue;
        }
        nodeFs.unlinkSync(filePath);
        console.log(`Deleted old log file: ${logFile}`);
    }
};

module.exports = deleteOldLogs;
