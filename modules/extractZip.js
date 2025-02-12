"use strict";
const nodePath = require("path");
const AdmZip = require("adm-zip");

const extractZip = (filePath, extractTo, mappings) => {
    const fileName = nodePath.basename(filePath);
    let type = "_common";
    if (mappings._playerOnly[fileName]) {
        type = "_playerOnly";
    } else if (mappings._studioOnly[fileName]) {
        type = "_studioOnly";
    }
    const mappedPath = mappings[type][fileName] || "";
    const extractPath = nodePath.join(extractTo, mappedPath);
    return new Promise((resolve, reject) => {
        try {
            const admZip = new AdmZip(filePath);
            admZip.extractAllTo(extractPath, true);
            resolve(extractPath);
        } catch (extractErr) {
            reject(extractErr);
        }
    });
};

module.exports = extractZip;
