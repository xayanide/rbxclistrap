// https://github.com/haadcode/logplease
import * as nodeProcess from "node:process";
import * as nodeFs from "node:fs";
import * as nodeUtil from "node:util";
import * as nodeEvents from "events";
import * as nodePath from "node:path";

const isElectronRenderer = nodeProcess.type && nodeProcess.type === "renderer";
let isNodejs = !!(!isElectronRenderer && nodeProcess.version);

const LogLevels = {
    TRACE: "TRACE",
    DEBUG: "DEBUG",
    VERBOSE: "VERBOSE",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    FATAL: "FATAL",
    NONE: "NONE",
};

const logLevelValues = Object.values(LogLevels);

/**
Essentially creates a list of different levels of logging messages (like "INFO" or "ERROR") and
assigns a unique number to each level. This numbering helps in comparing the importance or severity of messages below at _shouldLog()
*/
const logLevelIndices = logLevelValues.reduce((acc, level, index) => {
    acc[level] = index;
    return acc;
}, {});

// Global log level
let GlobalLogLevel = LogLevels.DEBUG;

// Global log file path and filename
let GlobalLogFilePath = null;

const GlobalEventEmitter = new nodeEvents.EventEmitter();

// ANSI colors
let Colors = {
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

// CSS colors
if (!isNodejs) {
    Colors = {
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
}

const loglevelColors = [Colors.Grey, Colors.Cyan, Colors.Blue, Colors.Green, Colors.Yellow, Colors.Red, Colors.Red, Colors.Default];

const defaultOptions = {
    useColors: true,
    color: Colors.Default,
    showTimestamp: true,
    useLocalTime: false,
    showLevel: true,
    filepath: GlobalLogFilePath,
    appendFile: true,
};

class InternalLogger {
    constructor(category, options) {
        this.category = category;
        this.options = { ...defaultOptions, ...options };
        this.fileDescriptor = this._getLogFileDescriptor();
    }

    _log(level, ...args) {
        if (this._shouldLog(level)) {
            this._write(level, nodeUtil.format(...args));
        }
    }

    log(...args) {
        this._log(LogLevels.DEBUG, ...args);
    }

    trace(...args) {
        this._log(LogLevels.TRACE, ...args);
    }

    debug(...args) {
        this._log(LogLevels.DEBUG, ...args);
    }

    verbose(...args) {
        this._log(LogLevels.VERBOSE, ...args);
    }

    info(...args) {
        this._log(LogLevels.INFO, ...args);
    }

    warn(...args) {
        this._log(LogLevels.WARN, ...args);
    }

    error(...args) {
        this._log(LogLevels.ERROR, ...args);
    }

    fatal(...args) {
        this._log(LogLevels.FATAL, ...args);
    }

    _getLogFileDescriptor() {
        const logFilePath = this.options.filepath ?? GlobalLogFilePath;
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
        // https://github.com/haadcode/logplease/pull/21
        if (this.fileWriter && (isNodejs || isElectronRenderer)) {
            if (isElectronRenderer) {
                text = text.replace(/%c/gm, "");
            }
            nodeFs.writeSync(this.fileWriter, text + "\n", null, "utf-8");
        }
    }

    _write(level, text) {
        const levelFormat = this._getLevelFormat(level);
        const unformattedText = this._createLogMessage(level, text);
        const formattedText = this._createLogMessage(level, text, levelFormat.timestamp, levelFormat.level, levelFormat.category, levelFormat.text);
        this._writeToLogFile(unformattedText);
        if (isNodejs || !this.options.useColors) {
            console.log(formattedText);
            /** For testing */
            GlobalEventEmitter.emit("data", this.category, level, text);
            return;
        }
        const consoleMethod = level === LogLevels.ERROR || level === LogLevels.FATAL ? console.error : console.log;
        // Initialize an array with the formatted text
        const logArgs = [formattedText];
        // Conditionally add timestamp and level to the log arguments
        if (this.options.showTimestamp) {
            logArgs.push(levelFormat.timestamp);
        }
        if (this.options.showLevel) {
            logArgs.push(levelFormat.level);
        }
        // Add category and text to the log arguments,
        logArgs.push(levelFormat.category, levelFormat.text);
        // Log the message with the appropriate console method
        consoleMethod(...logArgs);
        /** Reference from refactoring:
        // Both timestamp and level display are enabled
        if (this.options.showTimestamp && this.options.showLevel) {
            consoleMethod(formattedText, levelFormat.timestamp, levelFormat.level, levelFormat.category, levelFormat.text);
        }
        // Only timestamp display is enabled
        else if (this.options.showTimestamp && !this.options.showLevel) {
            consoleMethod(formattedText, levelFormat.timestamp, levelFormat.category, levelFormat.text);
        }
        // Only level display is enabled
        else if (!this.options.showTimestamp && this.options.showLevel) {
            consoleMethod(formattedText, levelFormat.level, levelFormat.category, levelFormat.text);
        }
        // Neither timestamp nor level display is enabled
        else {
            consoleMethod(formattedText, levelFormat.category, levelFormat.text);
        }
        */
    }

    _getLevelFormat(level) {
        const { useColors, color: categoryColor, showTimestamp, showLevel } = this.options;
        if (!useColors) {
            return { timestamp: "", level: "", category: "", text: ": " };
        }
        const levelColorIndex = logLevelValues.indexOf(level);
        const levelColor = loglevelColors[levelColorIndex];
        if (isNodejs) {
            return {
                timestamp: showTimestamp ? `\u001b[3${Colors.Grey}m` : "",
                level: showLevel ? `\u001b[3${levelColor};22m` : "",
                category: `\u001b[3${categoryColor};1m`,
                text: "\u001b[0m: ",
            };
        }
        // Electron
        return {
            timestamp: showTimestamp ? `color:${Colors.Grey}` : "",
            level: showLevel ? `color:${levelColor}` : "",
            category: `color:${categoryColor}; font-weight: bold`,
            text: ": ",
        };
    }

    _createLogMessage(level, text, timestampFormat = "", levelFormat = "", categoryFormat = "", textFormat = ": ") {
        const { useColors, showTimestamp, useLocalTime, showLevel } = this.options;
        if (!isNodejs && useColors) {
            if (showTimestamp) {
                timestampFormat = "%c";
            }
            if (showLevel) {
                levelFormat = "%c";
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
            const spacing = level === LogLevels.INFO || level === LogLevels.WARN ? " " : "";
            logMessage += `${levelFormat}[${level}]${spacing} `;
        }
        return `${logMessage}${categoryFormat}${this.category}${textFormat}${text}`;
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
    forceBrowserMode(force) {
        return (isNodejs = !force);
    },
    /**
    For testing
    */
    events: GlobalEventEmitter,
};

export { SimpleLogger };
