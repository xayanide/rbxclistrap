const nodeChildProcess = require("child_process");
const logger = require("./logger.js");

const isProcessesRunning = (processNames) => {
    try {
        const stdout = nodeChildProcess.execSync("tasklist", { encoding: "utf8" }).toLowerCase();
        if (Array.isArray(processNames)) {
            return processNames.some((name) => stdout.includes(name.toLowerCase()));
        }
        return stdout.includes(processNames.toLowerCase());
    } catch (processErr) {
        if (processErr instanceof Error) {
            return false;
        }
        return false;
    }
};

const killProcesses = (processNames) => {
    if (!Array.isArray(processNames)) {
        processNames = [processNames];
    }
    const runningProcesses = processNames.filter(isProcessesRunning);
    if (runningProcesses.length === 0) return;
    logger.info(`Killing processes: ${runningProcesses.join(", ")}...`);
    for (let i = 0; i < runningProcesses.length; i++) {
        const processName = runningProcesses[i];
        try {
            nodeChildProcess.execSync(`taskkill /F /IM ${processName} /T`, { stdio: "ignore" });
            logger.info(`Successfully killed ${processName}`);
        } catch (processErr) {
            logger.error(`Failed to kill ${processName}\n${processErr.message}\n${processErr.stack}`);
        }
    }
};

module.exports = {
    isProcessesRunning,
    killProcesses,
};
