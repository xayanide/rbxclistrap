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

class Logger {
    constructor(category, options) {
        this.category = category;
        const opts = {};
        Object.assign(opts, defaultOptions);
        Object.assign(opts, options);
        this.options = opts;
        /* 
           this.debug = this.debug.bind(this);
           this.log = this.log.bind(this);
           this.info = this.info.bind(this);
           this.warn = this.warn.bind(this);
           this.error = this.error.bind(this);
        */
    }

    log() {
        if (this._shouldLog(LogLevels.DEBUG)) {
            this.debug.apply(this, arguments);
        }
    }

    trace() {
        if (this._shouldLog(LogLevels.TRACE)) {
            this._write(LogLevels.TRACE, nodeUtil.format.apply(null, arguments));
        }
    }

    debug() {
        if (this._shouldLog(LogLevels.DEBUG)) {
            this._write(LogLevels.DEBUG, nodeUtil.format.apply(null, arguments));
        }
    }

    verbose() {
        if (this._shouldLog(LogLevels.VERBOSE)) {
            this._write(LogLevels.VERBOSE, nodeUtil.format.apply(null, arguments));
        }
    }

    info() {
        if (this._shouldLog(LogLevels.INFO)) {
            this._write(LogLevels.INFO, nodeUtil.format.apply(null, arguments));
        }
    }

    warn() {
        if (this._shouldLog(LogLevels.WARN)) {
            this._write(LogLevels.WARN, nodeUtil.format.apply(null, arguments));
        }
    }

    error() {
        if (this._shouldLog(LogLevels.ERROR)) {
            this._write(LogLevels.ERROR, nodeUtil.format.apply(null, arguments));
        }
    }

    fatal() {
        if (this._shouldLog(LogLevels.FATAL)) {
            this._write(LogLevels.FATAL, nodeUtil.format.apply(null, arguments));
        }
    }

    _write(level, text) {
        const logFilePath = this.options.filepath || GlobalLogFilePath;
        if ((logFilePath && !this.fileWriter && isNodejs) || isElectronRenderer) {
            // Extract directory from the file path
            const logDir = nodePath.dirname(logFilePath);
            // Make sure the directory exists
            if (!nodeFs.existsSync(logDir)) {
                nodeFs.mkdirSync(logDir, { recursive: true });
            }
            this.fileWriter = nodeFs.openSync(logFilePath, this.options.appendFile ? "a+" : "w+");
        }
        const format = this._format(level, text);
        let unformattedText = this._createLogMessage(level, text);
        const formattedText = this._createLogMessage(level, text, format.timestamp, format.level, format.category, format.text);
        // https://github.com/haadcode/logplease/pull/21
        if (this.fileWriter && (isNodejs || isElectronRenderer)) {
            if (isElectronRenderer) {
                unformattedText = unformattedText.replace(/%c/gm, "");
            }
            nodeFs.writeSync(this.fileWriter, unformattedText + "\n", null, "utf-8");
        }
        if (isNodejs || !this.options.useColors) {
            console.log(formattedText);
            GlobalEventEmitter.emit("data", this.category, level, text);
        } else {
            if (level === LogLevels.ERROR) {
                if (this.options.showTimestamp && this.options.showLevel) {
                    console.error(formattedText, format.timestamp, format.level, format.category, format.text);
                } else if (this.options.showTimestamp && !this.options.showLevel) {
                    console.error(formattedText, format.timestamp, format.category, format.text);
                } else if (!this.options.showTimestamp && this.options.showLevel) {
                    console.error(formattedText, format.level, format.category, format.text);
                } else {
                    console.error(formattedText, format.category, format.text);
                }
            } else {
                if (this.options.showTimestamp && this.options.showLevel) {
                    console.log(formattedText, format.timestamp, format.level, format.category, format.text);
                } else if (this.options.showTimestamp && !this.options.showLevel) {
                    console.log(formattedText, format.timestamp, format.category, format.text);
                } else if (!this.options.showTimestamp && this.options.showLevel) {
                    console.log(formattedText, format.level, format.category, format.text);
                } else {
                    console.log(formattedText, format.category, format.text);
                }
            }
        }
    }

    _format(level) {
        let timestampFormat = "";
        let levelFormat = "";
        let categoryFormat = "";
        let textFormat = ": ";
        if (this.options.useColors) {
            const levelColor = Object.keys(LogLevels)
                .map((f) => {
                    return LogLevels[f];
                })
                .indexOf(level);
            const categoryColor = this.options.color;
            if (isNodejs) {
                if (this.options.showTimestamp) {
                    timestampFormat = "\u001b[3" + Colors.Grey + "m";
                }
                if (this.options.showLevel) {
                    levelFormat = "\u001b[3" + loglevelColors[levelColor] + ";22m";
                }
                categoryFormat = "\u001b[3" + categoryColor + ";1m";
                textFormat = "\u001b[0m: ";
            } else {
                if (this.options.showTimestamp) {
                    timestampFormat = "color:" + Colors.Grey;
                }
                if (this.options.showLevel) {
                    levelFormat = "color:" + loglevelColors[levelColor];
                }
                categoryFormat = "color:" + categoryColor + "; font-weight: bold";
            }
        }
        return {
            timestamp: timestampFormat,
            level: levelFormat,
            category: categoryFormat,
            text: textFormat,
        };
    }

    _createLogMessage(level, text, timestampFormat, levelFormat, categoryFormat, textFormat) {
        timestampFormat = timestampFormat || "";
        levelFormat = levelFormat || "";
        categoryFormat = categoryFormat || "";
        textFormat = textFormat || ": ";
        if (!isNodejs && this.options.useColors) {
            if (this.options.showTimestamp) {
                timestampFormat = "%c";
            }

            if (this.options.showLevel) {
                levelFormat = "%c";
            }

            categoryFormat = "%c";
            textFormat = ": %c";
        }
        let result = "";
        if (this.options.showTimestamp && !this.options.useLocalTime) {
            result += "" + new Date().toISOString() + " ";
        }
        if (this.options.showTimestamp && this.options.useLocalTime) {
            result += "" + new Date().toLocaleString() + " ";
        }
        result = timestampFormat + result;
        if (this.options.showLevel) {
            result += levelFormat + "[" + level + "]" + (level === LogLevels.INFO || level === LogLevels.WARN ? " " : "") + " ";
        }
        result += categoryFormat + this.category;
        result += textFormat + text;
        return result;
    }

    _shouldLog(level) {
        let envLogLevel =
            typeof nodeProcess !== "undefined" && nodeProcess.env !== undefined && nodeProcess.env.LOG !== undefined ? nodeProcess.env.LOG.toUpperCase() : null;
        envLogLevel = typeof window !== "undefined" && window.LOG ? window.LOG.toUpperCase() : envLogLevel;
        const logLevel = envLogLevel || GlobalLogLevel;
        const levels = Object.keys(LogLevels).map((f) => {
            return LogLevels[f];
        });
        const index = levels.indexOf(level);
        const levelIdx = levels.indexOf(logLevel);
        return index >= levelIdx;
    }
}

/* Public API */
const publicLogger = {
    setLogLevel(level) {
        GlobalLogLevel = level;
    },
    setLogFilePath(filePath) {
        GlobalLogFilePath = filePath;
    },
    createLogger(category, options) {
        return new Logger(category, options);
    },
    forceBrowserMode(force) {
        return (isNodejs = !force);
    },
    // For testing
    events: GlobalEventEmitter,
};

export default publicLogger;
