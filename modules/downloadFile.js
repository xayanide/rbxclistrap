import * as nodeFs from "node:fs";
import logger from "./logger.js";

const downloadFile = (data, filePath, bar) => {
    const writeStream = nodeFs.createWriteStream(filePath);
    data.pipe(writeStream);
    let downloadedBytes = 0;
    data.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        bar.update(downloadedBytes, { filename: filePath });
    });
    return new Promise((resolve, reject) => {
        data.on("end", () => {
            resolve();
        });
        writeStream.on("error", (writeErr) => {
            logger.error(`Error writing ${filePath}:\n${writeErr.message}\n${writeErr.stack}`);
            reject(writeErr);
        });
    });
};

export default downloadFile;
