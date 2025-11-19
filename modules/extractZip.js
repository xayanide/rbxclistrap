import * as nodePath from "node:path";
import AdmZip from "adm-zip";
import logger from "./logger.js";

function getMapType(fileName, folderMappings) {
    const playerOnly = folderMappings._playerOnly;
    if (playerOnly && fileName in playerOnly) {
        return "_playerOnly";
    }
    const studioOnly = folderMappings._studioOnly;
    if (studioOnly && fileName in studioOnly) {
        return "_studioOnly";
    }
    return "_common";
}

function resolveMappedPath(fileName, folderMappings) {
    const mapType = getMapType(fileName, folderMappings);
    const mappedPath = folderMappings[mapType][fileName];
    // do not use !mappedPath guard because "" should be accepted
    if (mappedPath === null) {
        logger.warn(`Map type: ${mapType}. File '${fileName}' has no mapped path! This file will be extracted at root.`);
        return "";
    }
    if (mappedPath === undefined) {
        throw new Error(`Map type: ${mapType}. File '${fileName}' has an undefined mapped path!`);
    }
    return mappedPath;
}

const extractZip = (filePath, extractPath, folderMappings) => {
    const fileName = nodePath.basename(filePath);
    const mappedPath = resolveMappedPath(fileName, folderMappings);
    const targetPath = nodePath.join(extractPath, mappedPath);
    return new Promise(function (resolve, reject) {
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
