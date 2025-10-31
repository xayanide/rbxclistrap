import * as nodePath from "node:path";
import AdmZip from "adm-zip";
import logger from "./logger.js";

function getMapType(folderMappings, fileName) {
    if (folderMappings._playerOnly[fileName]) {
        return "_playerOnly";
    } else if (folderMappings._studioOnly[fileName]) {
        return "_studioOnly";
    }
    return "_common";
}

function getMappedPath(folderMappings, mapType, fileName) {
    const mappedPath = folderMappings[mapType][fileName];
    if (mappedPath === undefined || mappedPath === null) {
        logger.warn(`File '${fileName}' has no mapped path! This file will be extracted at root!`);
        return "";
    }
    return mappedPath;
}

const extractZip = (filePath, extractPath, folderMappings) => {
    const fileName = nodePath.basename(filePath);
    const mapType = getMapType(folderMappings, fileName);
    const mappedPath = getMappedPath(folderMappings, mapType, fileName);
    const targetPath = nodePath.join(extractPath, mappedPath);
    return new Promise((resolve, reject) => {
        try {
            const admZip = new AdmZip(filePath);
            admZip.extractAllTo(targetPath, true);
            resolve(targetPath);
        } catch (extractErr) {
            reject(extractErr);
        }
    });
};

export default extractZip;
