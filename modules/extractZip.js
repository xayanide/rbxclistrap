import * as nodePath from "node:path";
import AdmZip from "adm-zip";
import logger from "./logger.js";

function getMapType(fileName, folderMappings) {
    if (folderMappings._playerOnly[fileName]) {
        return "_playerOnly";
    } else if (folderMappings._studioOnly[fileName]) {
        return "_studioOnly";
    }
    return "_common";
}

function resolveMappedPath(mapType, fileName, folderMappings) {
    const mappedPath = folderMappings[mapType][fileName];
    if (mappedPath === null) {
        logger.warn(`File '${fileName}' has no mapped path! This file will be extracted at root.`);
        return "";
    }
    return mappedPath;
}

const extractZip = (filePath, extractPath, folderMappings) => {
    const fileName = nodePath.basename(filePath);
    const mapType = getMapType(fileName, folderMappings);
    const mappedPath = resolveMappedPath(mapType, fileName, folderMappings);
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
