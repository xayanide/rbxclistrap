import * as nodeFsPromises from "node:fs/promises";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeProcess from "node:process";
import logger from "./logger.js";
import { createPrompt } from "./prompt.js";

const deleteFolderRecursiveSync = (folderPath) => {
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
        deleteFolderRecursiveSync(currentPath);
    }
    nodeFs.rmdirSync(folderPath);
};

const saveJson = async (filePath, data) => {
    return await nodeFsPromises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const deleteFolderRecursive = async (folderPath) => {
    try {
        await nodeFsPromises.access(folderPath);
    } catch (err) {
        if (err.code === "ENOENT") {
            return;
        }
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

const loadJson = async (filePath, defaultData) => {
    try {
        await nodeFsPromises.access(filePath);
    } catch (accessErr) {
        if (accessErr.code === "ENOENT") {
            await saveJson(filePath, defaultData);
            return defaultData;
        }
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

export { deleteFolderRecursive, saveJson, loadJson, getDirname, deleteFolderRecursiveSync };
