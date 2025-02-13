import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";

const deleteFolderRecursive = (folderPath) => {
    if (!nodeFs.existsSync(folderPath)) {
        return;
    }
    const folderFiles = nodeFs.readdirSync(folderPath);
    for (let i = 0; i < folderFiles.length; i++) {
        const currentPath = nodePath.join(folderPath, folderFiles[i]);
        if (!nodeFs.lstatSync(currentPath).isDirectory()) {
            nodeFs.unlinkSync(currentPath);
            continue;
        }
        deleteFolderRecursive(currentPath);
    }
    nodeFs.rmdirSync(folderPath);
};

const saveJson = (filePath, data) => {
    return nodeFs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const loadJson = (filePath, defaultData) => {
    if (!nodeFs.existsSync(filePath)) {
        saveJson(filePath, defaultData);
        return defaultData;
    }
    return JSON.parse(nodeFs.readFileSync(filePath));
};

const getDirname = (metaUrl) => {
    const filename = nodeUrl.fileURLToPath(metaUrl);
    return nodePath.dirname(filename);
};

export { deleteFolderRecursive, saveJson, loadJson, getDirname };
