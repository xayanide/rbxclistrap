/**
rbxclistrap - A CLI alternative Roblox Player and Roblox Studio bootstrapper
Copyright (C) 2025 xayanide

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import * as nodeStream from "node:stream";
import * as nodeFsPromises from "node:fs/promises";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeProcess from "node:process";
import * as nodeChildProcess from "node:child_process";
import cliProgress from "cli-progress";
import axios from "axios";
import logger from "./logger.js";
import verifyFileChecksum from "./verifyFileChecksum.js";
import extractZip from "./extractZip.js";
import fetchLatestVersion from "./fetchLatestVersion.js";
import fetchPreviousVersion from "./fetchPreviousVersion.js";
import { createPrompt } from "./prompt.js";
import { killProcesses, isProcessesRunning } from "./processes.js";
import { deleteFolderRecursive, saveJson, loadJson, getDirname, isDirectoryExists, isPathAccessible } from "./fileUtils.js";
import { getRobloxCDNBaseUrl, getRobloxClientSettingsBaseUrl } from "./robloxUrls.js";
import { installEdgeWebView } from "./webview.js";
import {
    getPlayerRegistryData,
    getStudioRegistryData,
    getStudioPlaceRegistryData,
    getStudioFileExtensionsRegistryData,
    PLAYER_UNSET_VALUE_PATHS,
    STUDIO_UNSET_VALUE_PATHS,
    STUDIO_PLACE_UNSET_VALUE_PATHS,
    STUDIO_FILE_EXTENSIONS_UNSET_VALUE_PATHS,
    CORPORATION_UNSET_VALUE_PATHS,
} from "./robloxRegistry.js";
import { checkUnsetValuePaths, getConfiguredRobloxChannelName, setRegistryData } from "./registry.js";
import {
    CLI_COLORS,
    DEFAULT_BOOTSTRAPPER_STATE,
    FOLDER_MAPPINGS,
    APP_SETTINGS_XML,
    PLAYER_PROCESSES,
    STUDIO_PROCESSES,
    APP_TYPES_MAP,
    BINARY_TYPES,
    DEFAULT_CONFIG,
    DEFAULT_FAST_FLAGS,
    REGISTER_PLAYER_KEY_PATHS,
    REGISTER_STUDIO_KEY_PATHS,
    REGISTER_STUDIO_PLACE_KEY_PATHS,
    REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS,
    PLAYER_CHANNEL_KEYPATH,
    STUDIO_CHANNEL_KEYPATH,
    PRODUCTION_CHANNEL_NAMES,
} from "./constants.js";
import { getPackageData, logPackageVersion } from "./packageData.js";
import { getRobloxDownloadUrl } from "./robloxDownloadUrl.js";
import { getBootstrapperAppSettings } from "./appSettings.js";
import { compareRobloxClientVersions, verifyMapping } from "./helpers.js";

const rootDirPath = nodePath.join(getDirname(import.meta.url), "..");

let runnerConfig = { ...DEFAULT_CONFIG };
let runnerFastFlags = { ...DEFAULT_FAST_FLAGS };
let runnerState = { ...DEFAULT_BOOTSTRAPPER_STATE };
let runnerChannel = null;
let clientSettingsBaseUrl = null;
let cdnBaseUrl = null;

const isPlayerBinaryType = (binaryType) => {
    return binaryType === "WindowsPlayer";
};

const getAppType = (binaryType) => {
    const appType = APP_TYPES_MAP[binaryType];
    if (!appType) {
        throw new Error(`Unable to get app type for binary type: ${binaryType}`);
    }
    return appType;
};

const saveState = async (statePath) => {
    return await saveJson(statePath, runnerState);
};

const loadState = async (statePath, version) => {
    runnerState = await loadJson(statePath, { ...DEFAULT_BOOTSTRAPPER_STATE, version }, false);
    if (runnerState.version !== version) throw new Error("Version mismatch");
};

// because Some CDNs block ranged HEAD; GET shows real behavior.
const supportsRange = async (url) => {
    try {
        const response = await axios.get(url, {
            method: "GET",
            headers: { Range: "bytes=0-0" },
            responseType: "stream",
            validateStatus: null,
            maxRedirects: 5,
        });
        const responseHeaders = response.headers;
        // 206 = accepts range requests. 200 = ignores range. 403 = blocked.
        const responseStatus = response.status;
        try {
            const responseData = response.data;
            const dataDestroy = responseData.destroy;
            if (responseData && dataDestroy) {
                dataDestroy();
            }
        } catch (err) {
            logger.error(`Encountered error dataDestroy():\n${err.message}\n${err.stack}`);
        }
        return responseStatus === 206 || (responseHeaders && (responseHeaders["accept-ranges"] || "").includes("bytes"));
    } catch {
        return false;
    }
};

const safeStreamToFile = async (stream, destPath, flags = "w") => {
    const tmp = `${destPath}.part`;
    const writeStream = nodeFs.createWriteStream(tmp, { flags });
    await new Promise((resolve, reject) => {
        nodeStream.pipeline(stream, writeStream, function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

const tryDownloadWithResume = async (packageUrl, filePath, fileChecksum, bar) => {
    const tmpPath = `${filePath}.part`;
    if (await isPathAccessible(filePath)) {
        const isValid = await verifyFileChecksum(filePath, fileChecksum);
        if (isValid) {
            return "verified";
        }
        logger.warn(`Corrupted file '${nodePath.basename(filePath)}'. This file will be re-downloaded.`);
        await nodeFsPromises.unlink(filePath);
    }
    if (await isPathAccessible(tmpPath)) {
        // We can't verify checksum until fully downloaded; we'll attempt resume if supported
    }
    const isRangeSupported = await supportsRange(packageUrl);
    const stats = await nodeFsPromises.stat(tmpPath).catch(function () { return { size: 0 }; });
    const existingBytes = stats.size || 0;
    const headers = {};
    if (existingBytes > 0 && isRangeSupported) {
        logger.info("Download server supports Range and Partial for resuming downloads.");
        headers.Range = `bytes=${existingBytes}-`;
    }
    const response = await axios.get(packageUrl, {
        responseType: "stream",
        headers,
        validateStatus: null,
        maxRedirects: 5,
    });
    const responseStatus = response.status;
    const responseData = response.data;
    let downloadedBytes = existingBytes;
    const downloadPayload = { filename: filePath };
    bar.update(downloadedBytes, downloadPayload);
    responseData.on("data", function (chunk) {
        downloadedBytes += chunk.length;
        bar.update(downloadedBytes, downloadPayload);
    });
    if ([200, 206].includes(responseStatus)) {
        // 206 -> append; 200 -> overwrite
        const writeFlags = responseStatus === 206 ? "a" : "w";
        if (writeFlags === "w") {
            try {
                await nodeFsPromises.unlink(tmpPath);
            } catch {
                logger.info(`Unable to delete file '${nodePath.basename(tmpPath)}'. Overwriting...`);
            }
        }
        await safeStreamToFile(responseData, filePath, writeFlags);
    } else {
        if (responseStatus === 403 && existingBytes > 0) {
            logger.warn(`Retrying full download for file '${nodePath.basename(tmpPath)}'`);
            const retryRes = await axios.get(packageUrl, {
                responseType: "stream",
                validateStatus: null,
                maxRedirects: 5,
            });
            if (retryRes.status !== 200) {
                throw new Error(`Download failed with status ${retryRes.status}`);
            }
            try {
                await nodeFsPromises.unlink(tmpPath);
            } catch {
                logger.info(`Unable to delete file '${nodePath.basename(tmpPath)}'. Overwriting...`);
            }
            await safeStreamToFile(retryRes.data, filePath, "w");
        } else {
            throw new Error(`Download failed with status ${responseStatus}`);
        }
    }
    const headResponse = await axios.head(packageUrl, { validateStatus: null, maxRedirects: 5 });
    let remoteSize = null;
    if (headResponse && headResponse.status === 200) {
        remoteSize = parseInt(headResponse.headers["content-length"] || "0", 10);
    }
    const localSize = (await nodeFsPromises.stat(tmpPath).catch(function () { return { size: 0 }; })).size || 0;
    if (remoteSize && localSize !== 0 && localSize !== remoteSize) {
        logger.warn(`Incomplete downloaded file '${nodePath.basename(tmpPath)}'`);
        return "partial";
    }
    try {
        await nodeFsPromises.rename(tmpPath, filePath);
    } catch (err) {
        logger.error(`There was an error while renaming '${nodePath.basename(tmpPath)}' to '${nodePath.basename(filePath)}'. Copying file instead...`);
        logger.error(`${err.message}\n${err.stack}`);
        await nodeFsPromises.copyFile(tmpPath, filePath);
        await nodeFsPromises.unlink(tmpPath);
    }
    return "downloaded";
};

const saveConfig = async (binaryType) => {
    const CONFIG_FILE_PATH = nodePath.join(rootDirPath, `${getAppType(binaryType)}-config.json`);
    return await saveJson(CONFIG_FILE_PATH, runnerConfig);
};

const saveFastFlags = async (clientAppSettingsPath) => {
    return await saveJson(clientAppSettingsPath, runnerFastFlags);
};

const loadConfig = async (binaryType) => {
    const CONFIG_FILE_PATH = nodePath.join(rootDirPath, `${getAppType(binaryType)}-config.json`);
    runnerConfig = await loadJson(CONFIG_FILE_PATH, DEFAULT_CONFIG, true);
};

const loadFastFlags = async (binaryType) => {
    const FAST_FLAGS_FILE_PATH = nodePath.join(rootDirPath, `${getAppType(binaryType)}-fflags.json`);
    runnerFastFlags = await loadJson(FAST_FLAGS_FILE_PATH, DEFAULT_FAST_FLAGS, false);
};

const getExistingVersions = async (existingVersionsPath) => {
    const isFolderExists = await isDirectoryExists(existingVersionsPath);
    if (!isFolderExists) {
        await nodeFsPromises.mkdir(existingVersionsPath, { recursive: true });
    }
    const folders = await nodeFsPromises.readdir(existingVersionsPath);
    return folders.filter((folderName) => {
        return folderName.startsWith("version-");
    });
};

const attemptKillProcesses = async (processes) => {
    logger.info("Checking for Roblox processes to kill...");
    if (!isProcessesRunning(processes)) {
        return false;
    }
    const answer = await createPrompt(
        "One of Roblox's processes is running in the background. Do you want to forcibly close it? Type y (yes) or type any key if no and press enter: ",
    );
    const answerLower = answer.toLowerCase();
    const agreeAnswers = ["y", "yes"];
    if (!agreeAnswers.includes(answerLower)) {
        logger.warn("One of Roblox's processes is still running!");
        return false;
    }
    killProcesses(processes);
    return true;
};

const applyFastFlags = async (clientSettingsPath) => {
    const clientSettingsFolderPath = nodePath.join(clientSettingsPath, "ClientSettings");
    const isFolderExists = await isDirectoryExists(clientSettingsFolderPath);
    if (!isFolderExists) {
        await nodeFsPromises.mkdir(clientSettingsFolderPath, { recursive: true });
    }
    const clientAppSettingsJsonPath = nodePath.join(clientSettingsFolderPath, "ClientAppSettings.json");
    let existingSettingsJson = "";
    const isJsonAccessible = await isPathAccessible(clientAppSettingsJsonPath);
    if (isJsonAccessible) {
        const textContent = await nodeFsPromises.readFile(clientAppSettingsJsonPath, "utf8");
        existingSettingsJson = textContent.trim();
    }
    if (existingSettingsJson === JSON.stringify(runnerFastFlags, null, 2)) {
        return;
    }
    logger.info("Applying fast flags...");
    await saveFastFlags(clientAppSettingsJsonPath);
    logger.info(`Successfully applied fast flags to ${clientAppSettingsJsonPath}!`);
};

const showLicenseMenu = async (binaryType) => {
    console.clear();
    const licenseInfo = `rbxclistrap - A CLI alternative Roblox Player and Roblox Studio bootstrapper
Copyright (C) 2025 xayanide

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
GNU General Public License v3.0

Permissions:
- Commercial use
- Modification
- Distribution
- Patent use
- Private use

Limitations:
- Liability
- Warranty

Conditions:
- License and copyright notice

See: https://choosealicense.com/licenses/gpl-3.0`;
    console.log(licenseInfo);
    console.log(`${CLI_COLORS.RED}1. Back to main menu${CLI_COLORS.RESET}`);
    const answer = await createPrompt("Type and enter to select an option: ");
    switch (answer) {
        case "1":
            await showMainMenu(binaryType);
            break;
        default:
            console.log(`${CLI_COLORS.RED}Invalid option selected. Please try again.${CLI_COLORS.RESET}`);
            await showLicenseMenu(binaryType);
            break;
    }
};

const showSettingsMenu = async (binaryType) => {
    console.clear();
    console.log(`${CLI_COLORS.MAGENTA}Settings Menu${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}1. Toggle delete existing folders (Current: ${runnerConfig.deleteExistingVersion})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}2. Toggle force update (Current: ${runnerConfig.forceUpdate})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}3. Toggle always run latest version (Current: ${runnerConfig.alwaysRunLatest})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}4. Toggle only keep latest version (Current: ${runnerConfig.onlyKeepLatest})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}5. Toggle let roblox choose channels (Current: ${runnerConfig.letRobloxChooseChannels})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}6. Set preferred channel (Current: ${runnerConfig.preferredChannel})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.RED}7. Back to main menu${CLI_COLORS.RESET}`);
    const answer = await createPrompt("Type and enter to select an option: ");
    switch (answer) {
        case "1":
            runnerConfig.deleteExistingVersion = !runnerConfig.deleteExistingVersion;
            console.log(`${CLI_COLORS.BLUE}"deleteExistingVersion" has been set to: ${runnerConfig.deleteExistingVersion}${CLI_COLORS.RESET}`);
            await saveConfig(binaryType);
            await createPrompt("Press Enter key to continue.");
            await showSettingsMenu(binaryType);
            break;
        case "2":
            runnerConfig.forceUpdate = !runnerConfig.forceUpdate;
            console.log(`${CLI_COLORS.BLUE}"forceUpdate" has been set to: ${runnerConfig.forceUpdate}${CLI_COLORS.RESET}`);
            await saveConfig(binaryType);
            await createPrompt("Press Enter key to continue.");
            await showSettingsMenu(binaryType);
            break;
        case "3":
            runnerConfig.alwaysRunLatest = !runnerConfig.alwaysRunLatest;
            console.log(`${CLI_COLORS.BLUE}"alwaysRunLatest" has been set to: ${runnerConfig.alwaysRunLatest}${CLI_COLORS.RESET}`);
            await saveConfig(binaryType);
            await createPrompt("Press Enter key to continue.");
            await showSettingsMenu(binaryType);
            break;
        case "4":
            runnerConfig.onlyKeepLatest = !runnerConfig.onlyKeepLatest;
            console.log(`${CLI_COLORS.BLUE}"onlyKeepLatest" has been set to: ${runnerConfig.onlyKeepLatest}${CLI_COLORS.RESET}`);
            await saveConfig(binaryType);
            await createPrompt("Press Enter key to continue.");
            await showSettingsMenu(binaryType);
            break;
        case "5":
            runnerConfig.letRobloxChooseChannels = !runnerConfig.letRobloxChooseChannels;
            console.log(`${CLI_COLORS.BLUE}"letRobloxChooseChannels" has been set to: ${runnerConfig.letRobloxChooseChannels}${CLI_COLORS.RESET}`);
            await saveConfig(binaryType);
            await createPrompt("Press Enter key to continue.");
            await showSettingsMenu(binaryType);
            break;
        case "6": {
            const channel = await createPrompt("Type and enter a channel name you prefer: ");
            runnerConfig.preferredChannel = channel ? channel.toLowerCase() : "live";
            runnerChannel = runnerConfig.preferredChannel;
            console.log(`${CLI_COLORS.BLUE}"preferredChannel" has been set to: ${runnerConfig.preferredChannel}${CLI_COLORS.RESET}`);
            await saveConfig(binaryType);
            await createPrompt("Press Enter key to continue.");
            await showSettingsMenu(binaryType);
            break;
        }
        case "7":
            await showMainMenu(binaryType);
            break;
        default:
            console.log(`${CLI_COLORS.RED}Invalid option selected. Please try again.${CLI_COLORS.RESET}`);
            await showSettingsMenu(binaryType);
            break;
    }
};

const downloadVersion = async (binaryType, version, isUpdate = false) => {
    const isPlayer = isPlayerBinaryType(binaryType);
    const runnerVersionsFolder = isPlayer ? "PlayerVersions" : "StudioVersions";
    const versionFolder = version.startsWith("version-") ? version : `version-${version}`;
    const versionsPath = nodePath.join(rootDirPath, runnerVersionsFolder);
    const dumpDir = nodePath.join(versionsPath, versionFolder);
    const runnerProcesses = isPlayer ? PLAYER_PROCESSES : STUDIO_PROCESSES;
    // Save path for state file
    const statePath = nodePath.join(dumpDir, ".bootstrapper-state.json");
    // SIGINT handler: save current runnerState and exit
    let isSigintAttached = false;
    const attachSigint = () => {
        if (isSigintAttached) {
            return;
        }
        isSigintAttached = true;
        process.on("SIGINT", async function () {
            try {
                logger.warn("Interrupted by user (SIGINT). Saving state...");
                await saveState(statePath);
            } catch (err) {
                logger.error(`Failed to save state on SIGINT:\n${err.message}\n${err.stack}`,);
            } finally {
                process.exit(0);
            }
        });
    };
    const isProcessKilled = await attemptKillProcesses(runnerProcesses);
    const existingVersions = await getExistingVersions(versionsPath);
    const hasDifferentVersion = existingVersions.some((folderName) => {
        return folderName !== versionFolder;
    });
    if (runnerConfig.onlyKeepLatest && isUpdate && hasDifferentVersion) {
        logger.info(`Configured to only keep the latest version: ${versionFolder}. Deleting existing versions except latest...`);
        for (const folderName of existingVersions) {
            const folderPath = nodePath.join(versionsPath, folderName);
            const isFolderExists = await isDirectoryExists(folderPath);
            if (!isFolderExists || folderName === versionFolder) {
                continue;
            }
            logger.info(`Deleting existing folder: ${folderPath}...`);
            await deleteFolderRecursive(folderPath);
            logger.info("Successfully deleted existing folder!");
        }
    }
    const isDumpDirExists = await isDirectoryExists(dumpDir);
    // initialize or load state
    await loadState(statePath, version);
    if (isDumpDirExists && !runnerConfig.forceUpdate && runnerState.step === "complete") {
        logger.info(`${version} is already downloaded!`);
        return;
    }
    logger.info(`Downloading ${version}...`);
    if (isDumpDirExists && runnerConfig.deleteExistingVersion && isProcessKilled) {
        logger.info(`Configured to delete the existing version: ${version}. Deleting existing version...`);
        logger.info(`Deleting existing folder: ${dumpDir}...`);
        await deleteFolderRecursive(dumpDir);
        logger.info("Successfully deleted existing folder!");
    }
    await nodeFsPromises.mkdir(dumpDir, { recursive: true });
    attachSigint();
    if (!cdnBaseUrl) {
        cdnBaseUrl = await getRobloxCDNBaseUrl();
    }
    const bootStrapperAppSettings = await getBootstrapperAppSettings(clientSettingsBaseUrl, binaryType, runnerChannel);
    const downloadUrl = getRobloxDownloadUrl(cdnBaseUrl, runnerChannel, bootStrapperAppSettings);
    const versionDownloadUrl = `${downloadUrl}/${version}`;
    const versionManifestUrl = `${versionDownloadUrl}-rbxPkgManifest.txt`;
    logger.info(`Fetching manifest: ${versionManifestUrl}...`);
    const axiosResponse = await axios.get(versionManifestUrl);
    logger.info("Successfully fetched manifest!");
    const axiosResponseData = axiosResponse.data;
    const manifestContent = axiosResponseData.trim().split("\n");
    const firstLine = manifestContent[0].trim();
    if (firstLine !== "v0") {
        logger.error(`Unexpected manifest version: ${firstLine}. Expected 'v0'.`);
        return;
    }
    logger.info(`Manifest version: ${firstLine}`);
    const filesToDownload = [];
    for (let i = 1, n = manifestContent.length; i < n; i += 4) {
        const fileName = manifestContent[i].trim();
        if (fileName === "RobloxPlayerInstaller.exe") {
            continue;
        }
        const fileChecksum = manifestContent[i + 1].trim();
        if (!fileName.endsWith(".zip") && !fileName.endsWith(".exe")) {
            logger.warn(`${fileName} has an unsupported file extension! Skipping entry...`);
            continue;
        }
        const packageUrl = `${versionDownloadUrl}-${fileName}`;
        const filePath = `${dumpDir}/${fileName}`;
        filesToDownload.push({ fileName, packageUrl, filePath, fileChecksum });
    }
    const manifestFiles = filesToDownload.map(function (f) { return f.fileName; });
    const { missingMaps, excessMaps } = verifyMapping(manifestFiles, FOLDER_MAPPINGS, isPlayer);
    if (missingMaps.length === 0 && excessMaps.length === 0) {
        logger.info("Folder mappings verified: no missing or excess mapped files.");
    } else {
        if (missingMaps.length > 0) logger.warn(`Missing in folder mappings: ${missingMaps.join(", ")}`);
        if (excessMaps.length > 0) logger.warn(`Excess in folder mappings: ${excessMaps.join(", ")}`);
    }
    const downloadSingleBar = new cliProgress.SingleBar(
        {
            format: "{bar} | File {fileNumber}/{totalFiles} | {filename} | {percentage}% | {value}/{total}",
        },
        cliProgress.Presets.shades_classic,
    );
    const totalFiles = filesToDownload.length;
    const zipFiles = filesToDownload.filter(function ({ fileName }) { return fileName.endsWith(".zip"); });
    const totalZipFiles = zipFiles.length;
    // ===== STEP 1: Download (resumable per-file) =====
    logger.info("STEP 1: Downloading files...");
    let fileNumber = 1;
    for (const { packageUrl, filePath, fileName, fileChecksum } of filesToDownload) {
        // if already downloaded in state and exists -> skip
        if (runnerState.downloaded.includes(fileName) && (await isPathAccessible(filePath))) {
            logger.info(`Skipping already downloaded file: ${fileName}`);
            fileNumber++;
            continue;
        }
        // start progress bar for this file
        let fileTotalSize = 0;
        try {
            // attempt a HEAD for size (may fail)
            const headRes = await axios.head(packageUrl, { validateStatus: null });
            if (headRes && headRes.status === 200) fileTotalSize = parseInt(headRes.headers["content-length"] || "0", 10);
        } catch (err) {
            logger.error(`Error attempting head.\n${err.message}\n${err.stack}`);
        }
        downloadSingleBar.start(fileTotalSize, 0, { filename: fileName, fileNumber, totalFiles });
        try {
            const result = await tryDownloadWithResume(packageUrl, filePath, fileChecksum, downloadSingleBar);
            if (result === "verified") {
                logger.info(`Already present and valid: ${fileName}`);
            } else if (result === "partial") {
                logger.warn(`Partial download for ${fileName} — saved progress. Run again to continue.`);
                // save state and abort so user can run again to resume
                await saveState(statePath);
                downloadSingleBar.stop();
                throw new Error(`Partial download for ${fileName}`);
            } else {
                // mark downloaded
                if (!runnerState.downloaded.includes(fileName)) runnerState.downloaded.push(fileName);
                await saveState(statePath);
            }
        } catch (err) {
            logger.error(`Download failed for ${fileName}: ${err.message}`);
            downloadSingleBar.stop();
            await saveState(statePath);
            throw err;
        }
        downloadSingleBar.stop();
        fileNumber++;
    }
    logger.info("STEP 1: Successfully downloaded files!");
    if (!runnerState.completedSteps.includes("download")) {
        runnerState.completedSteps.push("download");
        runnerState.step = "verify";
        await saveState(statePath);
    }
    // ===== STEP 2: Verify per-file checksums =====
    logger.info("STEP 2: Verifying file checksums...");
    const verifyBar = new cliProgress.SingleBar(
        {
            format: "{bar} | {filename} | {percentage}% | {value}/{total}",
        },
        cliProgress.Presets.shades_classic,
    );
    verifyBar.start(totalFiles, 0, { filename: "" });
    for (const { fileName, fileChecksum, filePath } of filesToDownload) {
        if (runnerState.verified && runnerState.verified.includes && runnerState.verified.includes(fileName)) {
            verifyBar.increment(1, { filename: fileName });
            continue;
        }
        const exists = await isPathAccessible(filePath);
        if (!exists) {
            logger.error(`Expected file missing for verification: ${fileName}`);
            verifyBar.increment(0, { filename: fileName });
            continue;
        }
        const isChecksumValid = await verifyFileChecksum(filePath, fileChecksum);
        if (isChecksumValid) {
            runnerState.verified = runnerState.verified || [];
            runnerState.verified.push(fileName);
            await saveState(statePath);
            verifyBar.increment(1, { filename: fileName });
            continue;
        }
        // checksum mismatch -> delete file and fail (user can retry to re-download)
        logger.error(`Checksum mismatch: ${fileName}. Deleting file...`);
        await nodeFsPromises.unlink(filePath).catch(() => { });
        // also remove from downloaded state if present
        runnerState.downloaded = runnerState.downloaded.filter(function (n) { return n !== fileName; });
        await saveState(statePath);
        verifyBar.increment(0, { filename: fileName });
    }
    verifyBar.stop();
    logger.info("STEP 2: Successfully completed file checksums verification!");
    if (!runnerState.completedSteps.includes("verify")) {
        runnerState.completedSteps.push("verify");
        runnerState.step = "extract";
        await saveState(statePath);
    }
    // ===== STEP 3: Extract archives (resumable per-file) =====
    logger.info("STEP 3: Extracting file archives...");
    const extractBar = new cliProgress.SingleBar(
        { format: "{bar} | {filename} | {percentage}% | {value}/{total}" },
        cliProgress.Presets.shades_classic,
    );
    extractBar.start(totalZipFiles, 0, { filename: "" });
    for (const zipFile of zipFiles) {
        const fileName = zipFile.fileName;
        const filePath = zipFile.filePath;
        runnerState.extracted = runnerState.extracted || [];
        if (runnerState.extracted.includes(fileName)) {
            extractBar.increment(1, { filename: fileName });
            continue;
        }
        try {
            await extractZip(filePath, dumpDir, FOLDER_MAPPINGS);
            runnerState.extracted.push(fileName);
            await saveState(statePath);
            extractBar.increment(1, { filename: fileName });
        } catch (err) {
            logger.error(`Extraction failed for ${fileName}: ${err.message}`);
            await saveState(statePath);
            extractBar.stop();
            throw err;
        }
    }
    extractBar.stop();
    logger.info("STEP 3: File archives extraction complete!");
    if (!runnerState.completedSteps.includes("extract")) {
        runnerState.completedSteps.push("extract");
        runnerState.step = "cleanup";
        await saveState(statePath);
    }
    // ===== STEP 4: Delete archives (cleanup) =====
    logger.info("STEP 4: Deleting file archives...");
    const cleanupBar = new cliProgress.SingleBar(
        { format: "{bar} | {filename} | {percentage}% | {value}/{total}" },
        cliProgress.Presets.shades_classic,
    );
    cleanupBar.start(totalZipFiles, 0, { filename: "" });
    runnerState.deleted = runnerState.deleted || [];
    for (const zipFile of zipFiles) {
        const fileName = zipFile.fileName;
        const filePath = zipFile.filePath;
        if (runnerState.deleted.includes(fileName)) {
            cleanupBar.increment(1, { filename: fileName });
            continue;
        }
        try {
            await nodeFsPromises.unlink(filePath);
            runnerState.deleted.push(fileName);
            await saveState(statePath);
            cleanupBar.increment(1, { filename: fileName });
        } catch (err) {
            logger.warn(`Failed to delete archive ${fileName}: ${err.message}`);
            // don't abort for deletion failures; mark deleted anyway if missing
            const exists = await isPathAccessible(filePath);
            if (exists) {
                cleanupBar.increment(0, { filename: fileName });
            } else {
                runnerState.deleted.push(fileName);
                await saveState(statePath);
                cleanupBar.increment(1, { filename: fileName });
            }
        }
    }
    cleanupBar.stop();
    logger.info("STEP 4: Successfully deleted file archives!");
    if (!runnerState.completedSteps.includes("cleanup")) {
        runnerState.completedSteps.push("cleanup");
        await saveState(statePath);
    }
    logger.info(`Successfully downloaded and extracted ${version} to ${dumpDir}!`);
    logger.info("STEP 5: Creating AppSettings.xml...");
    await nodeFsPromises.writeFile(`${dumpDir}/AppSettings.xml`, APP_SETTINGS_XML, "utf-8");
    logger.info("STEP 5: Successfully created AppSettings.xml!");
    if (!runnerState.completedSteps.includes("appsettings")) {
        runnerState.completedSteps.push("appsettings");
        runnerState.step = "complete";
        await saveState(statePath);
    }
};

const downloadLatestVersion = async (binaryType, channel = "live") => {
    logger.info(`Fetching latest version from channel: ${channel}...`);
    const latestVersion = await fetchLatestVersion(binaryType, clientSettingsBaseUrl, channel);
    logger.info("Successfully fetched latest version!");
    logger.info(`Latest version: ${latestVersion}. Channel: ${channel}`);
    await downloadVersion(binaryType, latestVersion);
};

const downloadCustomVersion = async (binaryType, version) => {
    logger.info(`Custom version: ${version}`);
    await downloadVersion(binaryType, version);
};

const downloadFromChannel = async (binaryType, channel) => {
    const version = await fetchLatestVersion(binaryType, clientSettingsBaseUrl, channel);
    logger.info(`Version: ${version}. Channel: ${channel}`);
    await downloadVersion(binaryType, version);
};

const launchAutoUpdater = async (binaryType) => {
    if (!BINARY_TYPES.includes(binaryType)) {
        throw new Error(`Unknown binary type: ${binaryType}. Must be WindowsPlayer or WindowsStudio64.`);
    }
    const isPlayer = isPlayerBinaryType(binaryType);
    const runnerVersionsFolder = isPlayer ? "PlayerVersions" : "StudioVersions";
    logger.info(`Checking for ${binaryType} updates...`);
    if (!clientSettingsBaseUrl) {
        clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(binaryType);
    }
    if (!runnerConfig.preferredChannel) {
        runnerConfig.preferredChannel = "live";
    }
    if (runnerConfig.letRobloxChooseChannels) {
        runnerChannel = await getConfiguredRobloxChannelName(isPlayer ? PLAYER_CHANNEL_KEYPATH : STUDIO_CHANNEL_KEYPATH);
    } else if (!runnerChannel) {
        runnerChannel = runnerConfig.preferredChannel.toLowerCase();
    }
    logger.info(`Fetching latest version from channel: ${runnerChannel}...`);
    const latestVersion = await fetchLatestVersion(binaryType, clientSettingsBaseUrl, runnerChannel);
    logger.info("Successfully fetched latest version!");
    if (!PRODUCTION_CHANNEL_NAMES.includes(runnerChannel)) {
        logger.info("Fetching latest version from channel: live...");
        const liveLatestVersion = await fetchLatestVersion(binaryType, clientSettingsBaseUrl, "live");
        logger.info("Successfully fetched latest version!");
        const laterVersion = compareRobloxClientVersions(latestVersion, liveLatestVersion);
        if (laterVersion === liveLatestVersion) {
            logger.warn(`Channel ${runnerChannel} is behind the live channel.`);
        } else {
            logger.info(`Channel ${runnerChannel} is ahead of the live channel.`);
        }
    }
    const versionsPath = nodePath.join(rootDirPath, runnerVersionsFolder);
    const versions = await getExistingVersions(versionsPath);
    if (versions.length === 0) {
        logger.warn("No installed version found!");
        await downloadVersion(binaryType, latestVersion);
        return latestVersion;
    }
    console.log(`${CLI_COLORS.MAGENTA}Available versions:`);
    for (let i = 0, n = versions.length; i < n; i++) {
        const version = versions[i];
        console.log(`${CLI_COLORS.CYAN}${i + 1}. ${versions[i]}${CLI_COLORS.RESET}${version === latestVersion ? " (Latest)" : ""}`);
    }
    let selectedVersion = "";
    if (versions.length === 1 && !runnerConfig.alwaysRunLatest) {
        selectedVersion = versions[0];
        logger.info(`Only one version found: ${selectedVersion}. Skipping prompt...`);
    } else if (runnerConfig.alwaysRunLatest) {
        logger.info(`Configured to always run the latest version: ${latestVersion}. Skipping prompt...`);
        await downloadVersion(binaryType, latestVersion, true);
        return latestVersion;
    } else {
        const answer = await createPrompt("Type and enter to select a version (1/2/3...): ");
        const versionIndex = parseInt(answer, 10) - 1;
        if (isNaN(versionIndex) || typeof versionIndex !== "number" || versionIndex < 0 || versionIndex >= versions.length) {
            throw new Error("Invalid version selected!");
        }
        selectedVersion = versions[versionIndex];
    }
    logger.info(`Selected version: ${selectedVersion}`);
    if (!latestVersion) {
        logger.warn("Unable to determine the latest version!");
        return selectedVersion;
    }
    logger.info(`Latest version: ${latestVersion}`);
    if (selectedVersion === latestVersion) {
        logger.info("You're already on the latest version!");
        return selectedVersion;
    }
    if (selectedVersion && !runnerConfig.forceUpdate) {
        return selectedVersion;
    }
    logger.info("A new version is available!");
    await downloadVersion(binaryType, latestVersion, true);
    return latestVersion;
};

const launchRoblox = async (binaryType, hasPromptArgs = false, selectedVersion, robloxLaunchArgv = []) => {
    if (!BINARY_TYPES.includes(binaryType)) {
        throw new Error(`Unknown runner type: ${binaryType}. Must be WindowsPlayer or WindowsStudio64.`);
    }
    const isPlayer = isPlayerBinaryType(binaryType);
    const binaryName = isPlayer ? "RobloxPlayerBeta.exe" : "RobloxStudioBeta.exe";
    const runnerVersionsFolder = isPlayer ? "PlayerVersions" : "StudioVersions";
    const versionsPath = nodePath.join(rootDirPath, runnerVersionsFolder);
    const selectedVersionPath = nodePath.join(versionsPath, selectedVersion);
    const binaryPath = nodePath.join(selectedVersionPath, binaryName);
    const isBinaryAccessible = await isPathAccessible(binaryPath);
    if (!isBinaryAccessible) {
        throw new Error(`Unable to launch as ${binaryName} was not found in ${selectedVersionPath}`);
    }
    await installEdgeWebView(selectedVersionPath);
    if (isPlayer) {
        await setRegistryData(getPlayerRegistryData(binaryPath, selectedVersion, runnerChannel), REGISTER_PLAYER_KEY_PATHS);
        await checkUnsetValuePaths([...CORPORATION_UNSET_VALUE_PATHS, ...PLAYER_UNSET_VALUE_PATHS]);
    } else {
        await setRegistryData(
            {
                ...getStudioRegistryData(binaryPath, selectedVersion, runnerChannel),
                ...getStudioPlaceRegistryData(binaryPath),
                ...getStudioFileExtensionsRegistryData(),
            },
            [...REGISTER_STUDIO_KEY_PATHS, ...REGISTER_STUDIO_PLACE_KEY_PATHS, ...REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS],
        );
        await checkUnsetValuePaths([
            ...CORPORATION_UNSET_VALUE_PATHS,
            ...STUDIO_UNSET_VALUE_PATHS,
            ...STUDIO_PLACE_UNSET_VALUE_PATHS,
            ...STUDIO_FILE_EXTENSIONS_UNSET_VALUE_PATHS,
        ]);
    }
    await applyFastFlags(selectedVersionPath);
    const spawnArgs = [];
    if (robloxLaunchArgv.length > 2 && !hasPromptArgs) {
        const robloxUri = robloxLaunchArgv[2];
        if (robloxUri) {
            spawnArgs.push(robloxUri);
        }
    } else if (hasPromptArgs) {
        const userArgs = await createPrompt("Type and enter to set launch arguments (e.g., roblox://...): ");
        const trimmedArgs = userArgs.trim();
        if (trimmedArgs) {
            spawnArgs.push(...trimmedArgs.split(" "));
        }
    }
    const launchArgs = spawnArgs.join(" ");
    logger.info(`Launching with command: "${binaryPath}"${launchArgs ? ` "${launchArgs}"` : ""}`);
    const runnerProcesses = isPlayer ? PLAYER_PROCESSES : STUDIO_PROCESSES;
    await attemptKillProcesses(runnerProcesses);
    const childProcess = nodeChildProcess.spawn(binaryPath, spawnArgs, { detached: true, stdio: "ignore" });
    childProcess.unref();
    logger.info(`Successfully launched ${binaryName}!`);
};

async function showMainMenu(binaryType) {
    if (!BINARY_TYPES.includes(binaryType)) {
        throw new Error(`Unknown binary type: ${binaryType}. Must be WindowsPlayer or WindowsStudio64.`);
    }
    console.clear();
    const packageData = await getPackageData();
    logPackageVersion(packageData, logger);
    if (!clientSettingsBaseUrl) {
        clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(binaryType);
    }
    if (!runnerConfig.preferredChannel) {
        runnerConfig.preferredChannel = "live";
    }
    if (runnerConfig.letRobloxChooseChannels) {
        runnerChannel = await getConfiguredRobloxChannelName(isPlayerBinaryType(binaryType) ? PLAYER_CHANNEL_KEYPATH : STUDIO_CHANNEL_KEYPATH);
    }
    if (!runnerChannel) {
        runnerChannel = runnerConfig.preferredChannel;
    }
    // No ascii art lol
    const asciiArt = `rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY; for details type '8'.
This is free software, and you are welcome to redistribute it
under certain conditions; type '8' for details.

Download and launch ${binaryType} versions using just the command line.
`;
    const mainMenu = `
${CLI_COLORS.BLUE}${asciiArt}${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}1. Download latest version/update${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}2. Download the last LIVE version (downgrade)${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}3. Download a custom version hash${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}4. Download from a specific channel${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}5. Launch ${binaryType}${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}6. Launch ${binaryType} with args${CLI_COLORS.RESET}
${CLI_COLORS.GREEN}7. Settings${CLI_COLORS.RESET}
${CLI_COLORS.YELLOW}8. License${CLI_COLORS.RESET}
${CLI_COLORS.RED}9. Exit${CLI_COLORS.RESET}
`;
    console.log(mainMenu);
    const answer = await createPrompt("Type and enter to select an option: ");
    switch (answer) {
        case "1":
            console.clear();
            await downloadLatestVersion(binaryType, runnerChannel);
            break;
        case "2": {
            console.clear();
            if (!cdnBaseUrl) {
                cdnBaseUrl = await getRobloxCDNBaseUrl();
            }
            const previousVersion = await fetchPreviousVersion(binaryType, cdnBaseUrl);
            if (!previousVersion) {
                break;
            }
            await downloadVersion(binaryType, previousVersion);
            break;
        }
        case "3": {
            console.clear();
            const versionHash = await createPrompt("Type and enter to set a custom version hash: ");
            await downloadCustomVersion(binaryType, versionHash);
            break;
        }
        case "4": {
            console.clear();
            const channel = await createPrompt("Type and enter to set a channel name: ");
            await downloadFromChannel(binaryType, channel);
            break;
        }
        case "5": {
            console.clear();
            const selectedVersion = await launchAutoUpdater(binaryType);
            await launchRoblox(binaryType, false, selectedVersion);
            break;
        }
        case "6": {
            console.clear();
            const selectedVersion = await launchAutoUpdater(binaryType);
            await launchRoblox(binaryType, true, selectedVersion);
            break;
        }
        case "7":
            console.clear();
            await showSettingsMenu(binaryType);
            break;
        case "8":
            console.clear();
            await showLicenseMenu(binaryType);
            break;
        case "9":
            logger.debug({ name: "alice" });
            nodeProcess.exit(0);
            break;
        default:
            console.clear();
            console.log(`${CLI_COLORS.RED}Invalid option selected. Please try again.${CLI_COLORS.RESET}`);
            await showMainMenu(binaryType);
            break;
    }
}

export { loadConfig, loadFastFlags, showMainMenu, launchAutoUpdater, launchRoblox };
