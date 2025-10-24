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
import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeProcess from "node:process";
import * as nodeChildProcess from "node:child_process";
import cliProgress from "cli-progress";
import axios from "axios";
import logger from "./logger.js";
import downloadFile from "./downloadFile.js";
import verifyFileChecksum from "./verifyFileChecksum.js";
import extractZip from "./extractZip.js";
import fetchLatestVersion from "./fetchLatestVersion.js";
import fetchPreviousVersion from "./fetchPreviousVersion.js";
import { createPrompt } from "./prompt.js";
import { killProcesses, isProcessesRunning } from "./processes.js";
import { deleteFolderRecursive, saveJson, loadJson, getDirname, isDirectoryExists, isPathAccessible } from "./fileutils.js";
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
import { compareRobloxClientVersions } from "./helpers.js";

const rootDirPath = nodePath.join(getDirname(import.meta.url), "..");

let runnerConfig = { ...DEFAULT_CONFIG };
let runnerFastFlags = { ...DEFAULT_FAST_FLAGS };
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
    if (isDumpDirExists && !runnerConfig.forceUpdate) {
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
        const fileChecksum = manifestContent[i + 1].trim();
        if (!fileName.endsWith(".zip") && !fileName.endsWith(".exe")) {
            logger.warn(`${fileName} has an unsupported file extension! Skipping entry...`);
            continue;
        }
        const packageUrl = `${versionDownloadUrl}-${fileName}`;
        const filePath = `${dumpDir}/${fileName}`;
        filesToDownload.push({ fileName, packageUrl, filePath, fileChecksum });
    }
    const downloadSingleBar = new cliProgress.SingleBar(
        {
            format: "{bar} | File {fileNumber}/{totalFiles} | {filename} | {percentage}% | {value}/{total}",
        },
        cliProgress.Presets.shades_classic,
    );
    const totalFiles = filesToDownload.length;
    const zipFiles = filesToDownload.filter(({ fileName }) => {
        return fileName.endsWith(".zip");
    });
    const totalZipFiles = zipFiles.length;
    logger.info("STEP 1: Downloading files...");

    let fileNumber = 1;
    for (const { packageUrl, filePath, fileName } of filesToDownload) {
        const { data: fileData, headers: fileHeaders } = await axios.get(packageUrl, { responseType: "stream" });
        const fileTotalSize = parseInt(fileHeaders["content-length"], 10) || 0;
        downloadSingleBar.start(fileTotalSize, 0, { filename: fileName, fileNumber, totalFiles });
        await downloadFile(fileData, filePath, downloadSingleBar);
        downloadSingleBar.stop();
        fileNumber++;
    }
    logger.info("STEP 1: Successfully downloaded files!");
    logger.info("STEP 2: Verifying file checksums...");
    const singleBar = new cliProgress.SingleBar(
        {
            format: "{bar} | {filename} | {percentage}% | {value}/{total}",
        },
        cliProgress.Presets.shades_classic,
    );
    singleBar.start(totalFiles);
    await Promise.all(
        filesToDownload.map(async ({ fileName, fileChecksum, filePath }) => {
            const isChecksumValid = await verifyFileChecksum(filePath, fileChecksum);
            if (isChecksumValid) {
                singleBar.increment(1, { filename: fileName });
                return;
            }
            logger.error(`Checksum mismatch: ${fileName}. Deleting file...`);
            await nodeFsPromises.unlink(filePath);
            logger.error("Successfully deleted file!");
            singleBar.increment(0, { filename: fileName });
        }),
    );
    singleBar.stop();
    logger.info("STEP 2: Successfully completed file checksums verification!");
    logger.info("STEP 3: Extracting file archives...");
    singleBar.start(totalZipFiles);
    for (const zipFile of zipFiles) {
        const fileName = zipFile.fileName;
        const filePath = zipFile.filePath;
        await extractZip(filePath, dumpDir, FOLDER_MAPPINGS);
        singleBar.increment(1, { filename: fileName });
    }
    singleBar.stop();
    logger.info("STEP 3: File archives extraction complete!");
    logger.info("STEP 4: Deleting file archives...");
    singleBar.start(totalZipFiles);
    for (const zipFile of zipFiles) {
        const fileName = zipFile.fileName;
        const filePath = zipFile.filePath;
        await nodeFsPromises.unlink(filePath);
        singleBar.increment(1, { filename: fileName });
    }
    singleBar.stop();
    logger.info("STEP 4: Successfully deleted file archives!");
    logger.info(`Successfully downloaded and extracted ${version} to ${dumpDir}!`);
    logger.info("Creating AppSettings.xml...");
    await nodeFsPromises.writeFile(`${dumpDir}/AppSettings.xml`, APP_SETTINGS_XML, "utf-8");
    logger.info("Successfully created AppSettings.xml!");
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
            console.clear();
            console.log(`${CLI_COLORS.BLUE}Exiting...${CLI_COLORS.RESET}`);
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
