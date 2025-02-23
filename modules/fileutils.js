import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeProcess from "node:process";
import logger from "./logger.js";
import { createPrompt } from "./prompt.js";

const deleteFolderRecursive = (folderPath) => {
    if (!nodeFs.existsSync(folderPath)) {
        return;
    }
    const folderFiles = nodeFs.readdirSync(folderPath);
    for (let i = 0, n = folderFiles.length; i < n; i++) {
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

const loadJson = async (filePath, defaultData) => {
    if (!nodeFs.existsSync(filePath)) {
        saveJson(filePath, defaultData);
        return defaultData;
    }
    try {
        return JSON.parse(nodeFs.readFileSync(filePath));
    } catch (parseErr) {
        logger.fatal(
            `Inspect the JSON file and follow its strict formatting rules and syntax.\nAn error occured while parsing JSON file: ${filePath}:\n${parseErr.message}\n${parseErr.stack}`,
        );
        await createPrompt("Something went wrong! Press Enter key to exit.");
        nodeProcess.exit(1);
    }
};

const getDirname = (metaUrl) => {
    const filename = nodeUrl.fileURLToPath(metaUrl);
    return nodePath.dirname(filename);
};

export { deleteFolderRecursive, saveJson, loadJson, getDirname };
