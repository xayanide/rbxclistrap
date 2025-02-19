import * as nodeFs from "node:fs";
import axios from "axios";
import logger from "./logger.js";

const downloadFile = async (url, filePath, progressBar) => {
    const { data, headers } = await axios.get(url, {
        responseType: "stream",
    });
    const totalLength = parseInt(headers["content-length"], 10);
    // The content length for RobloxPlayerLauncher is sometimes wrong. Maybe it's compressed, then the size received is decompressed.
    logger.info(`File size: ${totalLength} bytes`);
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
};

export default downloadFile;
