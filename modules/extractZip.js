import * as nodePath from "node:path";
import AdmZip from "adm-zip";

const extractZip = (filePath, extractToPath, folderMappings) => {
    const fileName = nodePath.basename(filePath);
    let type = "_common";
    if (folderMappings._playerOnly[fileName]) {
        type = "_playerOnly";
    } else if (folderMappings._studioOnly[fileName]) {
        type = "_studioOnly";
    }
    const mappedPath = folderMappings[type][fileName] || "";
    const extractPath = nodePath.join(extractToPath, mappedPath);
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

export default extractZip;
