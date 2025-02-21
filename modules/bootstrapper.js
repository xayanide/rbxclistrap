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
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeProcess from "node:process";
import * as nodeChildProcess from "node:child_process";
import cliProgress from "cli-progress";
import axios from "axios";
import logger from "./logger.js";
import downloadFile from "./downloadFile.js";
import verifyChecksum from "./verifyChecksum.js";
import extractZip from "./extractZip.js";
import fetchLatestVersion from "./fetchLatestVersion.js";
import fetchPreviousVersion from "./fetchPreviousVersion.js";
import { createPrompt } from "./prompt.js";
import { killProcesses, isProcessesRunning } from "./processes.js";
import { deleteFolderRecursive, saveJson, loadJson, getDirname } from "./fileUtils.js";
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
import { checkUnsetValuePaths, setRegistryData } from "./registry.js";
import {
    CLI_COLORS,
    FOLDER_MAPPINGS,
    APP_SETTINGS,
    PLAYER_PROCESSES,
    STUDIO_PROCESSES,
    BINARY_TYPES,
    DEFAULT_CONFIG,
    DEFAULT_FAST_FLAGS,
    REGISTER_PLAYER_KEY_PATHS,
    REGISTER_STUDIO_KEY_PATHS,
    REGISTER_STUDIO_PLACE_KEY_PATHS,
    REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS,
} from "./constants.js";
import { getPackageData, logPackageVersion } from "./packageData.js";

/** This path is associated with the location of the bootstrapper file. Must point to root. */
const dirName = `${getDirname(import.meta.url)}/../`;

let runnerConfig = { ...DEFAULT_CONFIG };
let runnerFastFlags = { ...DEFAULT_FAST_FLAGS };
let runnerType = BINARY_TYPES.PLAYER;
let clientSettingsBaseUrl = null;
let cdnBaseUrl = null;

const isPlayerRunnerType = (type) => {
    return type === BINARY_TYPES.PLAYER;
};

const resolveBinaryType = (type) => {
    if (type === "WindowsPlayer") {
        return "player";
    } else if (type === "WindowsStudio64") {
        return "studio";
    } else {
        throw new Error(`Unable to resolve binary type: ${type}`);
    }
};

const saveConfig = (type) => {
    const CONFIG_FILE_PATH = nodePath.join(dirName, `${resolveBinaryType(type)}-config.json`);
    return saveJson(CONFIG_FILE_PATH, runnerConfig);
};
const loadConfig = (type) => {
    const CONFIG_FILE_PATH = nodePath.join(dirName, `${resolveBinaryType(type)}-config.json`);
    runnerConfig = loadJson(CONFIG_FILE_PATH, DEFAULT_CONFIG);
};
const loadFastFlags = (type) => {
    const FAST_FLAGS_FILE_PATH = nodePath.join(dirName, `${resolveBinaryType(type)}-fflags.json`);
    runnerFastFlags = loadJson(FAST_FLAGS_FILE_PATH, DEFAULT_FAST_FLAGS);
};

const getExistingVersions = (existingVersionsPath) => {
    if (!nodeFs.existsSync(existingVersionsPath)) {
        nodeFs.mkdirSync(existingVersionsPath, { recursive: true });
    }
    return nodeFs.readdirSync(existingVersionsPath).filter((folderName) => {
        return folderName.startsWith("version-");
    });
};

const attemptKillProcesses = async (processes) => {
    logger.info("Checking for Roblox processes to kill...");
    if (!isProcessesRunning(processes)) {
        killProcesses(processes);
        return;
    }
    const answer = await createPrompt("One of Roblox's processes is running in the background. Do you want to forcibly close it? (y/n): ");
    if (answer.toLowerCase() !== "y") {
        logger.info("One of Roblox's processes is still running.");
        nodeProcess.exit(0);
    }
    killProcesses(processes);
};

const applyFastFlags = (clientSettingsPath) => {
    const clientSettingsFolderPath = nodePath.join(clientSettingsPath, "ClientSettings");
    if (!nodeFs.existsSync(clientSettingsFolderPath)) {
        nodeFs.mkdirSync(clientSettingsFolderPath, { recursive: true });
    }
    const clientAppSettingsJsonPath = nodePath.join(clientSettingsFolderPath, "ClientAppSettings.json");
    let existingSettings = "";
    if (nodeFs.existsSync(clientAppSettingsJsonPath)) {
        existingSettings = nodeFs.readFileSync(clientAppSettingsJsonPath, "utf8").trim();
    }
    const jsonFastFlags = JSON.stringify(runnerFastFlags, null, 2);
    if (existingSettings === jsonFastFlags) {
        return;
    }
    logger.info("Applying fast flags...");
    nodeFs.writeFileSync(clientAppSettingsJsonPath, jsonFastFlags);
    logger.info(`Successfully applied fast flags to ${clientAppSettingsJsonPath}!`);
};

const showLicenseMenu = async () => {
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
    const answer = await createPrompt("Select an option: ");
    switch (answer) {
        case "1":
            await showMainMenu(runnerType);
            break;
        default:
            console.log(`${CLI_COLORS.RED}Invalid option selected. Please try again.${CLI_COLORS.RESET}`);
            await showLicenseMenu();
            break;
    }
};

const showSettingsMenu = async () => {
    console.clear();
    console.log(`${CLI_COLORS.MAGENTA}Settings Menu${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.GREEN}1. Toggle delete existing folders (Current: ${runnerConfig.deleteExistingFolders})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.YELLOW}2. Toggle force update (Current: ${runnerConfig.forceUpdate})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.BLUE}3. Toggle always run latest version (Current: ${runnerConfig.alwaysRunLatest})${CLI_COLORS.RESET}`);
    console.log(`${CLI_COLORS.RED}4. Back to main menu${CLI_COLORS.RESET}`);
    const answer = await createPrompt("Select an option: ");
    switch (answer) {
        case "1":
            runnerConfig.deleteExistingFolders = !runnerConfig.deleteExistingFolders;
            console.log(`${CLI_COLORS.BLUE}Delete existing folders set to: ${runnerConfig.deleteExistingFolders}${CLI_COLORS.RESET}`);
            saveConfig(runnerType);
            await createPrompt("Press Enter to continue...");
            await showSettingsMenu();
            break;
        case "2":
            runnerConfig.forceUpdate = !runnerConfig.forceUpdate;
            console.log(`${CLI_COLORS.BLUE}Force update set to: ${runnerConfig.forceUpdate}${CLI_COLORS.RESET}`);
            saveConfig(runnerType);
            await createPrompt("Press Enter to continue...");
            await showSettingsMenu();
            break;
        case "3":
            runnerConfig.alwaysRunLatest = !runnerConfig.alwaysRunLatest;
            console.log(`${CLI_COLORS.BLUE}Force update set to: ${runnerConfig.alwaysRunLatest}${CLI_COLORS.RESET}`);
            saveConfig(runnerType);
            await createPrompt("Press Enter to continue...");
            await showSettingsMenu();
            break;
        case "4":
            await showMainMenu(runnerType);
            break;
        default:
            console.log(`${CLI_COLORS.RED}Invalid option selected. Please try again.${CLI_COLORS.RESET}`);
            await showSettingsMenu();
            break;
    }
};

const downloadVersion = async (version) => {
    logger.info(`Downloading ${version}...`);
    const runnerProcesses = isPlayerRunnerType(runnerType) ? PLAYER_PROCESSES : STUDIO_PROCESSES;
    await attemptKillProcesses(runnerProcesses);
    const versionFolder = version.startsWith("version-") ? version : `version-${version}`;
    const versionsPath = nodePath.join(dirName, isPlayerRunnerType(runnerType) ? "PlayerVersions" : "StudioVersions");
    const dumpDir = nodePath.join(versionsPath, versionFolder);
    if (nodeFs.existsSync(dumpDir) && !runnerConfig.forceUpdate) {
        logger.info(`${version} is already downloaded!`);
        return;
    }
    if (nodeFs.existsSync(dumpDir) && runnerConfig.deleteExistingFolders) {
        logger.info(`Deleting existing folder: ${dumpDir}...`);
        deleteFolderRecursive(dumpDir);
        logger.info("Successfully deleted existing folder!");
    }
    nodeFs.mkdirSync(dumpDir, { recursive: true });
    if (!cdnBaseUrl) {
        cdnBaseUrl = await getRobloxCDNBaseUrl();
    }
    const cdnUrl = `${cdnBaseUrl}/${version}`;
    const manifestUrl = `${cdnUrl}-rbxPkgManifest.txt`;
    logger.info(`Fetching manifest: ${manifestUrl}...`);
    const axiosResponse = await axios.get(manifestUrl);
    logger.info("Successfully fetched manifest!");
    const axiosResponseData = axiosResponse.data;
    const manifestContent = axiosResponseData.trim().split("\n");
    const firstLine = manifestContent[0].trim();
    if (firstLine !== "v0") {
        logger.error(`Unexpected manifest version: ${firstLine}. Expected 'v0'.`);
        return;
    }
    logger.info(`Manifest version: ${firstLine}`);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    for (let i = 1; i < manifestContent.length; i += 4) {
        const fileName = manifestContent[i].trim();
        const checksum = manifestContent[i + 1].trim();
        /**
        const compressedSize = parseInt(manifestContent[i + 2], 10);
        const uncompressedSize = parseInt(manifestContent[i + 3], 10);
        */
        if (!(fileName.endsWith(".zip") || fileName.endsWith(".exe"))) {
            logger.info(`Unknown file extension! Skipping entry: ${fileName}...`);
            continue;
        }
        const packageUrl = `${cdnUrl}-${fileName}`;
        const filePath = `${dumpDir}/${fileName}`;
        logger.info(`Downloading file ${fileName} from ${packageUrl}`);
        await downloadFile(packageUrl, filePath, progressBar);
        logger.info(`Successfully downloaded file ${fileName}!`);
        logger.info(`Verifying file checksum: ${fileName}...`);
        const isChecksumValid = await verifyChecksum(filePath, checksum);
        if (!isChecksumValid) {
            logger.error(`Checksum mismatch for file: ${fileName}. Deleting file...`);
            nodeFs.unlinkSync(filePath);
            logger.error(`Successfully deleted file: ${fileName}!`);
            continue;
        }
        logger.info(`Successfully verified file checksum: ${fileName}!`);
        if (fileName.endsWith(".zip")) {
            logger.info(`Extracting zip file ${fileName} to ${dumpDir}...`);
            await extractZip(filePath, dumpDir, FOLDER_MAPPINGS);
            logger.info(`Successfully extracted zip file ${fileName}!`);
            logger.info(`Deleting zip file: ${fileName}...`);
            nodeFs.unlinkSync(filePath);
            logger.info(`Successfully deleted zip file: ${fileName}!`);
        }
    }
    logger.info(`Successfully downloaded and extracted ${version} to ${dumpDir}!`);
    logger.info("Creating AppSettings.xml...");
    nodeFs.writeFileSync(`${dumpDir}/AppSettings.xml`, APP_SETTINGS);
    logger.info("Successfully created AppSettings.xml!");
};

const downloadLatestVersion = async () => {
    logger.info("Fetching latest version from channel: Live...");
    const latestVersion = await fetchLatestVersion(runnerType, clientSettingsBaseUrl);
    logger.info("Successfully fetched latest version!");
    logger.info(`Latest version: ${latestVersion}. Channel: Live`);
    await downloadVersion(latestVersion);
};

const downloadCustomVersion = async (version) => {
    logger.info(`Custom version: ${version}`);
    await downloadVersion(version);
};

const downloadFromChannel = async (channel) => {
    const versionUrl = `${clientSettingsBaseUrl}/v2/client-version/${runnerType}/channel/${channel}`;
    logger.info(`Fetching latest version from channel: ${channel}...`);
    const axiosResponse = await axios.get(versionUrl);
    logger.info("Successfully fetched latest version!");
    const axiosResponseData = axiosResponse.data;
    const version = axiosResponseData.clientVersionUpload;
    logger.info(`Version: ${version}. Channel: ${channel}`);
    await downloadVersion(version);
};

const launchAutoUpdater = async (binaryType) => {
    if (!binaryType) {
        throw new Error("Unknown binary type. Must be WindowsPlayer or WindowsStudio64.");
    }
    runnerType = binaryType;
    const runnerProcesses = isPlayerRunnerType(runnerType) ? PLAYER_PROCESSES : STUDIO_PROCESSES;
    if (isPlayerRunnerType(runnerType)) {
        await attemptKillProcesses(runnerProcesses);
    }
    logger.info(`Checking for ${runnerType} updates...`);
    logger.info("Fetching latest version from channel: Live...");
    if (!clientSettingsBaseUrl) {
        clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(runnerType);
    }
    const latestVersion = await fetchLatestVersion(runnerType, clientSettingsBaseUrl);
    logger.info("Successfully fetched latest version!");
    const versionsPath = nodePath.join(dirName, isPlayerRunnerType(runnerType) ? "PlayerVersions" : "StudioVersions");
    const versions = getExistingVersions(versionsPath);
    if (versions.length === 0) {
        logger.warn("No installed version found!");
        await downloadVersion(latestVersion);
        return latestVersion;
    }
    console.log(`${CLI_COLORS.MAGENTA}Available versions:`);
    for (let i = 0; i < versions.length; i++) {
        const version = versions[i];
        console.log(`${CLI_COLORS.CYAN}${i + 1}. ${versions[i]}${CLI_COLORS.RESET}${version === latestVersion ? " (Latest)" : ""}`);
    }
    let selectedVersion = "";
    if (versions.length === 1) {
        selectedVersion = versions[0];
        logger.info(`Only one version found: ${selectedVersion}. Skipping prompt...`);
    } else if (runnerConfig.alwaysRunLatest) {
        logger.info(`Configured to always run the latest version: ${latestVersion}. Skipping prompt...`);
        await downloadVersion(latestVersion);
        return latestVersion;
    } else {
        const answer = await createPrompt("Select a version (1/2/3...): ");
        const versionIndex = parseInt(answer, 10) - 1;
        if (isNaN(versionIndex) || typeof versionIndex !== "number" || versionIndex < 0 || versionIndex >= versions.length) {
            throw new Error("Invalid version selected!");
        }
        selectedVersion = versions[versionIndex];
    }
    logger.info(`Selected version: ${selectedVersion}`);
    if (latestVersion === "") {
        logger.warn("Unable to determine the latest version!");
        return selectedVersion;
    }
    logger.info(`Latest version: ${latestVersion}`);
    if (selectedVersion === latestVersion) {
        logger.info("You're already on the latest version!");
        return selectedVersion;
    }
    logger.info("A new version is available!");
    await downloadVersion(latestVersion);
    return latestVersion;
};

const launchRoblox = async (hasPromptArgs = false, selectedVersion, robloxLaunchArgv = []) => {
    const versionsPath = nodePath.join(dirName, isPlayerRunnerType(runnerType) ? "PlayerVersions" : "StudioVersions");
    const selectedVersionPath = nodePath.join(versionsPath, selectedVersion);
    const binaryName = isPlayerRunnerType(runnerType) ? "RobloxPlayerBeta.exe" : "RobloxStudioBeta.exe";
    const binaryPath = nodePath.join(selectedVersionPath, binaryName);
    if (!nodeFs.existsSync(binaryPath)) {
        logger.warn(`${binaryName} was not found in ${selectedVersionPath}`);
        return;
    }
    await installEdgeWebView(selectedVersionPath);
    if (isPlayerRunnerType(runnerType)) {
        await setRegistryData(getPlayerRegistryData(binaryPath, selectedVersion), REGISTER_PLAYER_KEY_PATHS);
        await checkUnsetValuePaths([...CORPORATION_UNSET_VALUE_PATHS, ...PLAYER_UNSET_VALUE_PATHS]);
    } else {
        await setRegistryData(
            {
                ...getStudioRegistryData(binaryPath, selectedVersion),
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
    applyFastFlags(selectedVersionPath);
    const launchArgs = [];
    if (robloxLaunchArgv.length > 2 && !hasPromptArgs) {
        const robloxUri = robloxLaunchArgv[2];
        if (robloxUri) {
            launchArgs.push(robloxUri);
        }
    } else if (hasPromptArgs) {
        const userArgs = await createPrompt("Enter launch arguments (e.g., roblox://...): ");
        const trimmedArgs = userArgs.trim();
        if (trimmedArgs) {
            launchArgs.push(...trimmedArgs.split(" "));
        }
    }
    logger.info(`Launching with command: "${binaryPath}" "${launchArgs.join(" ")}"`);
    const childProcess = nodeChildProcess.spawn(binaryPath, launchArgs, { detached: true, stdio: "ignore" });
    childProcess.unref();
    logger.info(`Successfully launched ${binaryName}!`);
};

async function showMainMenu(launchType) {
    runnerType = launchType;
    if (!Object.values(BINARY_TYPES).includes(runnerType)) {
        throw new Error(`Unknown binary type: ${runnerType}. Must be WindowsPlayer or Studio64.`);
    }
    console.clear();
    logPackageVersion(getPackageData(), logger);
    if (!clientSettingsBaseUrl) {
        clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(runnerType);
    }
    // No ascii art lol
    const asciiArt = `rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY; for details type '8'.
This is free software, and you are welcome to redistribute it
under certain conditions; type '8' for details.

Download and launch ${runnerType} versions using just the command line.
`;
    const mainMenu = `
${CLI_COLORS.BLUE}${asciiArt}${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}1. Download latest version/update${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}2. Download the last LIVE version (downgrade)${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}3. Download a custom version hash${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}4. Download from a specific channel${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}5. Launch ${runnerType}${CLI_COLORS.RESET}
${CLI_COLORS.CYAN}6. Launch ${runnerType} with args${CLI_COLORS.RESET}
${CLI_COLORS.GREEN}7. Settings${CLI_COLORS.RESET}
${CLI_COLORS.YELLOW}8. License${CLI_COLORS.RESET}
${CLI_COLORS.RED}9. Exit${CLI_COLORS.RESET}
`;
    console.log(mainMenu);
    const answer = await createPrompt("Select an option: ");
    switch (answer) {
        case "1":
            console.clear();
            await downloadLatestVersion();
            break;
        case "2": {
            console.clear();
            if (!cdnBaseUrl) {
                cdnBaseUrl = await getRobloxCDNBaseUrl();
            }
            const previousVersion = await fetchPreviousVersion(runnerType, cdnBaseUrl);
            if (!previousVersion) {
                break;
            }
            await downloadVersion(previousVersion);
            break;
        }
        case "3": {
            console.clear();
            const versionHash = await createPrompt("Enter custom version hash: ");
            await downloadCustomVersion(versionHash);
            break;
        }
        case "4": {
            console.clear();
            const channel = await createPrompt("Enter channel name: ");
            await downloadFromChannel(channel);
            break;
        }
        case "5": {
            console.clear();
            const selectedVersion = await launchAutoUpdater(runnerType);
            await launchRoblox(false, selectedVersion);
            break;
        }
        case "6": {
            console.clear();
            const selectedVersion = await launchAutoUpdater(runnerType);
            await launchRoblox(true, selectedVersion);
            break;
        }
        case "7":
            console.clear();
            await showSettingsMenu();
            break;
        case "8":
            console.clear();
            await showLicenseMenu();
            break;
        case "9":
            console.clear();
            console.log(`${CLI_COLORS.BLUE}Exiting...${CLI_COLORS.RESET}`);
            nodeProcess.exit(0);
            break;
        default:
            console.clear();
            console.log(`${CLI_COLORS.RED}Invalid option selected. Please try again.${CLI_COLORS.RESET}`);
            await showMainMenu(runnerType);
            break;
    }
}

export { loadConfig, loadFastFlags, showMainMenu, launchAutoUpdater, launchRoblox };
