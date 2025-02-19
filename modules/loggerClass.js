/**
Refactored by: xayanide (With assistance of StackOverflow and AI :>)
Original code: https://github.com/haadcode/logplease
*/
import * as nodeProcess from "node:process";
import * as nodeFs from "node:fs";
import * as nodeUtil from "node:util";
import * as nodeEvents from "events";
import * as nodePath from "node:path";

const isElectronRenderer = nodeProcess.type && nodeProcess.type === "renderer";

let isNodejs = !!(!isElectronRenderer && nodeProcess.version);

const ansiColors = {
    Black: 0,
    Red: 1,
    Green: 2,
    Yellow: 3,
    Blue: 4,
    Magenta: 5,
    Cyan: 6,
    Grey: 7,
    White: 9,
    Default: 9,
};

const cssColors = {
    Black: "Black",
    Red: "IndianRed",
    Green: "LimeGreen",
    Yellow: "Orange",
    Blue: "RoyalBlue",
    Magenta: "Orchid",
    Cyan: "SkyBlue",
    Grey: "DimGrey",
    White: "White",
    Default: "Black",
};

const logLevels = {
    TRACE: "TRACE",
    DEBUG: "DEBUG",
    VERBOSE: "VERBOSE",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    FATAL: "FATAL",
    NONE: "NONE",
};

let GlobalLogLevel = logLevels.DEBUG;
let GlobalLogFilePath = null;
const GlobalEventEmitter = new nodeEvents.EventEmitter();

const logLevelValues = Object.values(logLevels);

const logLevelIndices = {};
let valueIndex = 0;
for (const [, value] of Object.entries(logLevels)) {
    logLevelIndices[value] = valueIndex++;
}

const Colors = isNodejs ? ansiColors : cssColors;

const loglevelColors = [Colors.Grey, Colors.Cyan, Colors.Blue, Colors.Green, Colors.Yellow, Colors.Red, Colors.Red, Colors.Default];

const defaultOptions = {
    useColors: true,
    color: Colors.Default,
    showTimestamp: true,
    useLocalTime: false,
    showLevel: true,
    filePath: GlobalLogFilePath,
    appendFile: true,
};

class InternalLogger {
    constructor(category, options) {
        this.category = category;
        this.options = { ...defaultOptions, ...options };
    }

    log(...args) {
        this._log(logLevels.DEBUG, ...args);
    }

    trace(...args) {
        this._log(logLevels.TRACE, ...args);
    }

    debug(...args) {
        this._log(logLevels.DEBUG, ...args);
    }

    verbose(...args) {
        this._log(logLevels.VERBOSE, ...args);
    }

    info(...args) {
        this._log(logLevels.INFO, ...args);
    }

    warn(...args) {
        this._log(logLevels.WARN, ...args);
    }

    error(...args) {
        this._log(logLevels.ERROR, ...args);
    }

    fatal(...args) {
        this._log(logLevels.FATAL, ...args);
    }

    _getFileDescriptor() {
        const logFilePath = this.options.filePath ?? GlobalLogFilePath;
        if (!logFilePath || this.fileDescriptor || (!isNodejs && !isElectronRenderer)) {
            return;
        }
        const logDir = nodePath.dirname(logFilePath);
        if (!nodeFs.existsSync(logDir)) {
            nodeFs.mkdirSync(logDir, { recursive: true });
        }
        return nodeFs.openSync(logFilePath, this.options.appendFile ? "a+" : "w+");
    }

    _writeToLogFile(text) {
        const resolvedText = isElectronRenderer ? text.replace(/%c/gm, "") : text;
        nodeFs.writeSync(this.fileDescriptor, `${resolvedText}\n`, null, "utf-8");
    }

    _write(level, text) {
        const style = this._getStyle(level);
        const unformattedText = this._createLogMessage(level, text);
        const formattedText = this._createLogMessage(level, text, style.timestamp, style.level, style.category, style.text);
        /** Implements https://github.com/haadcode/logplease/pull/21 */
        if ((this.fileDescriptor && isNodejs) || (this.fileDescriptor && isElectronRenderer)) {
            this._writeToLogFile(unformattedText);
        }
        if (isNodejs || !this.options.useColors) {
            console.log(formattedText);
            /** For testing */
            GlobalEventEmitter.emit("data", this.category, level, text);
            return;
        }
        const consoleMethod = level === logLevels.ERROR || level === logLevels.FATAL ? console.error : console.log;
        const logArgs = [formattedText];
        if (this.options.showTimestamp) {
            logArgs.push(style.timestamp);
        }
        if (this.options.showLevel) {
            logArgs.push(style.level);
        }
        logArgs.push(style.category, style.text);
        consoleMethod(...logArgs);
        /** Reference from refactoring:
        // Both timestamp and level display are enabled
        if (this.options.showTimestamp && this.options.showLevel) {
            consoleMethod(formattedText, style.timestamp, style.level, style.category, style.text);
        }
        // Only timestamp display is enabled
        else if (this.options.showTimestamp && !this.options.showLevel) {
            consoleMethod(formattedText, style.timestamp, style.category, style.text);
        }
        // Only level display is enabled
        else if (!this.options.showTimestamp && this.options.showLevel) {
            consoleMethod(formattedText, style.level, style.category, style.text);
        }
        // Neither timestamp nor level display is enabled
        else {
            consoleMethod(formattedText, style.category, style.text);
        }
        */
    }

    _getStyle(level) {
        const { useColors, color: categoryColor, showTimestamp, showLevel } = this.options;
        if (!useColors) {
            return { timestamp: "", level: "", category: "", text: ": " };
        }
        const levelColorIndex = logLevelValues.indexOf(level);
        const levelColor = loglevelColors[levelColorIndex];
        if (isNodejs) {
            /** ANSI style */
            return {
                timestamp: showTimestamp ? `\u001b[3${Colors.Grey}m` : "",
                level: showLevel ? `\u001b[3${levelColor};22m` : "",
                category: `\u001b[3${categoryColor};1m`,
                text: "\u001b[0m: ",
            };
        }
        /** CSS style */
        return {
            timestamp: showTimestamp ? `color:${Colors.Grey}` : "",
            level: showLevel ? `color:${levelColor}` : "",
            category: `color:${categoryColor}; font-weight: bold`,
            text: ": ",
        };
    }

    _createLogMessage(level, text, timestampFormat = "", style = "", categoryFormat = "", textFormat = ": ") {
        const { useColors, showTimestamp, useLocalTime, showLevel } = this.options;
        if (!isNodejs && useColors) {
            if (showTimestamp) {
                timestampFormat = "%c";
            }
            if (showLevel) {
                style = "%c";
            }
            categoryFormat = "%c";
            textFormat = ": %c";
        }
        let logMessage = "";
        if (showTimestamp) {
            logMessage += useLocalTime ? new Date().toLocaleString() : new Date().toISOString();
            logMessage += " ";
        }
        logMessage = `${timestampFormat}${logMessage}`;
        if (showLevel) {
            const spacing = level === logLevels.INFO || level === logLevels.WARN ? " " : "";
            logMessage += `${style}[${level}]${spacing} `;
        }
        return `${logMessage}${categoryFormat}${this.category}${textFormat}${text}`;
    }

    _log(level, ...args) {
        if (!this.fileDescriptor) {
            this.fileDescriptor = this._getFileDescriptor();
        }
        if (this._shouldLog(level)) {
            this._write(level, nodeUtil.format(...args));
        }
    }

    _shouldLog(level) {
        const envLogLevel = nodeProcess.env?.LOG?.toUpperCase() || (typeof window !== "undefined" && window.LOG?.toUpperCase()) || null;
        return logLevelIndices[level] >= logLevelIndices[envLogLevel || GlobalLogLevel];
    }
}

const SimpleLogger = {
    setLogLevel(level) {
        GlobalLogLevel = level;
    },
    setLogFilePath(filePath) {
        GlobalLogFilePath = filePath;
    },
    createLogger(category, options) {
        return new InternalLogger(category, options);
    },
    toggleBrowserMode(isEnabled) {
        return (isNodejs = !isEnabled);
    },
    /** For testing */
    events: GlobalEventEmitter,
    LogLevels: logLevels,
    Colors: Colors,
};

export { SimpleLogger, InternalLogger };
