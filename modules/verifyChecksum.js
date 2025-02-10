const nodeFs = require("fs");
const nodeCrypto = require("crypto");

const verifyChecksum = (filePath, expectedChecksum) => {
    return new Promise((resolve, reject) => {
        const cryptoHash = nodeCrypto.createHash("md5");
        const readStream = nodeFs.createReadStream(filePath);
        readStream.on("data", (chunk) => cryptoHash.update(chunk));
        readStream.on("end", () => {
            const checksum = cryptoHash.digest("hex");
            resolve(checksum === expectedChecksum);
        });
        readStream.on("error", reject);
    });
};

module.exports = verifyChecksum;
