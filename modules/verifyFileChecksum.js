import * as nodeFs from "node:fs";
import * as nodeCrypto from "node:crypto";

const verifyFileChecksum = (filePath, expectedChecksum) => {
    return new Promise((resolve, reject) => {
        const cryptoHash = nodeCrypto.createHash("md5");
        const readStream = nodeFs.createReadStream(filePath);
        readStream.on("data", (chunk) => {
            return cryptoHash.update(chunk);
        });
        readStream.on("end", () => {
            const checksum = cryptoHash.digest("hex");
            resolve(checksum === expectedChecksum);
        });
        readStream.on("error", reject);
    });
};

export default verifyFileChecksum;
