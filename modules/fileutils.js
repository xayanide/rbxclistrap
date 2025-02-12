"use strict";
const nodeFs = require("fs");
const nodePath = require("path");

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

module.exports = {
    deleteFolderRecursive,
    saveJson,
    loadJson,
};
