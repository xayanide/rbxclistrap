import * as nodePath from "node:path";
import * as nodeProcess from "node:process";
import LoggerClass from "./loggerClass.js";
import { getDirname } from "./fileUtils.js";
import { BINARY_TYPES } from "./constants.js";

const logFileISOTimestamp = new Date().toISOString().split(":").join("-");
const metaUrl = import.meta.url;

const argv = nodeProcess.argv;
const binaryType = argv.find((arg) => {
    return Object.values(BINARY_TYPES).includes(arg) ?? "Unknown";
});

const logsFilePath = nodePath.join(getDirname(metaUrl), "..", "logs", `${binaryType}-${logFileISOTimestamp}.log`);
const logger = LoggerClass.createLogger(binaryType, { filepath: logsFilePath, appendFile: true });

export default logger;
