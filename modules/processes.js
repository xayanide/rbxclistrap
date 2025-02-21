import * as nodeChildProcess from "node:child_process";
import logger from "./logger.js";

const isProcessesRunning = (processNames) => {
    try {
        const stdout = nodeChildProcess.execSync("tasklist", { encoding: "utf8" }).toLowerCase();
        if (Array.isArray(processNames)) {
            return processNames.some((processName) => {
                return stdout.includes(processName.toLowerCase());
            });
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
    if (runningProcesses.length === 0) {
        return;
    }
    logger.info(`Killing processes: ${runningProcesses.join(", ")}...`);
    for (let i = 0, n = runningProcesses.length; i < n; i++) {
        const processName = runningProcesses[i];
        nodeChildProcess.execSync(`taskkill /F /IM ${processName} /T`, { stdio: "ignore" });
        logger.info(`Successfully killed ${processName}`);
    }
};

export { isProcessesRunning, killProcesses };
