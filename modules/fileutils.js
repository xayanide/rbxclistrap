import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeProcess from "node:process";
import logger from "./logger.js";
import { createPrompt } from "./prompt.js";

const isFileExists = async (path) => {
    try {
        await nodeFsPromises.access(path);
        return true;
    } catch {
        return false;
    }
};

const isDirectoryExists = async (path) => {
    try {
        const stats = await nodeFsPromises.stat(path);
        return stats.isDirectory();
    } catch {
        return false;
    }
};

const deleteFolderRecursive = async (folderPath) => {
    if (!isDirectoryExists(folderPath)) {
        return;
    }
    const folderFiles = await nodeFsPromises.readdir(folderPath);
    await Promise.all(
        folderFiles.map(async (file) => {
            const currentPath = nodePath.join(folderPath, file);
            const stats = await nodeFsPromises.lstat(currentPath);
            if (stats.isDirectory()) {
                await deleteFolderRecursive(currentPath);
            } else {
                await nodeFsPromises.unlink(currentPath);
            }
        }),
    );
    await nodeFsPromises.rmdir(folderPath);
};

const saveJson = async (filePath, data) => {
    return await nodeFsPromises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const loadJson = async (filePath, defaultData) => {
    if (!isFileExists) {
        await saveJson(filePath, defaultData);
        return defaultData;
    }
    try {
        const buffer = await nodeFsPromises.readFile(filePath, "utf-8");
        return JSON.parse(buffer);
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

export { deleteFolderRecursive, saveJson, loadJson, getDirname, isFileExists, isDirectoryExists };
