const nodeFs = require("fs");
const nodeProcess = require("process");
const axios = require("axios");
const logger = require("./logger.js");

const downloadFile = async (url, filePath, progressBar) => {
    try {
        const { data, headers } = await axios.get(url, { responseType: "stream" });
        const totalLength = parseInt(headers["content-length"], 10);
        // The content length for RobloxPlayerLauncher is sometimes wrong, maybe it's compressed, and the size received is decompressed.
        logger.info(`Downloading ${filePath} (${totalLength} bytes) from ${url}`);
        progressBar.start(totalLength, 0);
        const writeStream = nodeFs.createWriteStream(filePath);
        data.pipe(writeStream);
        return new Promise((resolve, reject) => {
            data.on("data", (chunk) => {
                progressBar.increment(chunk.length);
            });
            data.on("end", () => {
                progressBar.stop();
                resolve();
            });
            writeStream.on("error", (writeErr) => {
                logger.error(`Error writing ${filePath}:\n${writeErr.message}\n${writeErr.stack}`);
                reject(writeErr);
            });
        });
    } catch (downloadErr) {
        logger.error(`Error downloading ${filePath} from ${url}:\n${downloadErr.message}\n${downloadErr.stack}`);
        nodeProcess.exit(1);
    }
};

module.exports = downloadFile;
