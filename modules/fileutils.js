const nodeFs = require("fs");
const nodePath = require("path");

const deleteFolderRecursive = (folderPath) => {
    if (!nodeFs.existsSync(folderPath)) {
        return;
    }
    nodeFs.readdirSync(folderPath).forEach((file) => {
        const currentPath = nodePath.join(folderPath, file);
        if (!nodeFs.lstatSync(currentPath).isDirectory()) {
            nodeFs.unlinkSync(currentPath);
        }
        deleteFolderRecursive(currentPath);
    });
    nodeFs.rmdirSync(folderPath);
};

const saveJson = (filePath, data) => nodeFs.writeFileSync(filePath, JSON.stringify(data, null, 2));

const loadJson = (filePath, defaultData) => {
    if (!nodeFs.existsSync(filePath)) {
        saveJson(filePath, defaultData);
        return defaultData;
    }
    return JSON.parse(nodeFs.readFileSync(filePath));
};

module.exports = {
    deleteFolderRecursive,
    saveJson,
    loadJson,
};
