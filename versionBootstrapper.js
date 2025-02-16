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
import logger from "./modules/logger.js";
import downloadFile from "./modules/downloadFile.js";
import verifyChecksum from "./modules/verifyChecksum.js";
import extractZip from "./modules/extractZip.js";
import fetchLatestVersion from "./modules/fetchLatestVersion.js";
import fetchPreviousVersion from "./modules/fetchPreviousVersion.js";
import { createPrompt } from "./modules/prompt.js";
import { killProcesses, isProcessesRunning } from "./modules/processes.js";
import { deleteFolderRecursive, saveJson, loadJson, getDirname } from "./modules/fileUtils.js";
import { getRobloxCDNBaseUrl, getRobloxClientSettingsBaseUrl } from "./modules/robloxUrls.js";
import { installEdgeWebView } from "./modules/webview.js";
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
} from "./modules/robloxRegistry.js";
import { checkUnsetValuePaths, setRegistryData } from "./modules/registry.js";
import {
    folderMappings,
    AppSettings,
    colors,
    PLAYER_PROCESSES,
    STUDIO_PROCESSES,
    BINARY_TYPES,
    DEFAULT_CONFIG,
    DEFAULT_FFLAGS,
    REGISTER_PLAYER_KEY_PATHS,
    REGISTER_STUDIO_KEY_PATHS,
    REGISTER_STUDIO_PLACE_KEY_PATHS,
    REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS,
} from "./modules/constants.js";
import { getPackageData, logPackageVersion } from "./modules/packageData.js";

const metaUrl = import.meta.url;
const CONFIG_FILE_PATH = nodePath.join(getDirname(metaUrl), "./config.json");
const FFLAGS_FILE_PATH = nodePath.join(getDirname(metaUrl), "./fflags.json");

let runnerConfig = { ...DEFAULT_CONFIG };
let runnerFflags = { ...DEFAULT_FFLAGS };
let runnerType = BINARY_TYPES.PLAYER;

const isPlayerRunnerType = (type) => {
    return type === BINARY_TYPES.PLAYER;
};

const saveConfig = () => {
    return saveJson(CONFIG_FILE_PATH, runnerConfig);
};
const loadConfig = () => {
    runnerConfig = loadJson(CONFIG_FILE_PATH, DEFAULT_CONFIG);
};
const loadFflags = () => {
    runnerFflags = loadJson(FFLAGS_FILE_PATH, DEFAULT_FFLAGS);
};

const getExistingVersions = (existingVersionsPath) => {
    if (!nodeFs.existsSync(existingVersionsPath)) {
        nodeFs.mkdirSync(existingVersionsPath, { recursive: true });
    }
    return nodeFs.readdirSync(existingVersionsPath).filter((f) => {
        return f.startsWith("version-");
    });
};

const attemptKillProcesses = async (processes) => {
    logger.info(`Checking for processes...`);
    if (!isProcessesRunning(processes)) {
        logger.info("Checking and killing related processes...");
        killProcesses(processes);
        return;
    }
    const answer = await createPrompt("One of the processes is running in the background. Do you want to forcibly close it? (y/n): ");
    if (answer.toLowerCase() !== "y") {
        logger.info("One of the processes is still running.");
        nodeProcess.exit(0);
    }
    logger.info("Killing processes...");
    killProcesses(processes);
};

const applyFflags = (clientSettingsPath) => {
    const clientSettingsFolderPath = nodePath.join(clientSettingsPath, "ClientSettings");
    if (!nodeFs.existsSync(clientSettingsFolderPath)) {
        nodeFs.mkdirSync(clientSettingsFolderPath, { recursive: true });
    }
    logger.info(`Applying fflags.json...`);
    const clientAppSettingsJsonPath = nodePath.join(clientSettingsFolderPath, "ClientAppSettings.json");
    let existingSettings = "";
    if (nodeFs.existsSync(clientAppSettingsJsonPath)) {
        existingSettings = nodeFs.readFileSync(clientAppSettingsJsonPath, "utf8").trim();
    }
    const jsonFflags = JSON.stringify(runnerFflags, null, 2);
    if (existingSettings === jsonFflags) {
        logger.info(`FFlags already applied. No changes made.`);
    } else {
        nodeFs.writeFileSync(clientAppSettingsJsonPath, jsonFflags);
        logger.info(`Successfully applied fflags.json to ${clientAppSettingsJsonPath}`);
    }
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
    console.log(`${colors.RED}1. Back to main menu${colors.RESET}`);
    const answer = await createPrompt("Select an option: ");
    switch (answer) {
        case "1":
            await showMainMenu(runnerType);
            break;
        default:
            console.log(`${colors.RED}Invalid option selected. Please try again.${colors.RESET}`);
            await showLicenseMenu();
            break;
    }
};

const showSettingsMenu = async () => {
    console.clear();
    console.log(`${colors.MAGENTA}Settings Menu${colors.RESET}`);
    console.log(`${colors.GREEN}1. Toggle delete existing folders (Current: ${runnerConfig.deleteExistingFolders})${colors.RESET}`);
    console.log(`${colors.YELLOW}2. Toggle force update (Current: ${runnerConfig.forceUpdate})${colors.RESET}`);
    console.log(`${colors.BLUE}3. Toggle always run latest version (Current: ${runnerConfig.alwaysRunLatest})${colors.RESET}`);
    console.log(`${colors.RED}4. Back to main menu${colors.RESET}`);
    const answer = await createPrompt("Select an option: ");
    switch (answer) {
        case "1":
            runnerConfig.deleteExistingFolders = !runnerConfig.deleteExistingFolders;
            console.log(`${colors.BLUE}Delete existing folders set to: ${runnerConfig.deleteExistingFolders}${colors.RESET}`);
            saveConfig();
            await createPrompt("Press Enter to continue...");
            await showSettingsMenu();
            break;
        case "2":
            runnerConfig.forceUpdate = !runnerConfig.forceUpdate;
            console.log(`${colors.BLUE}Force update set to: ${runnerConfig.forceUpdate}${colors.RESET}`);
            saveConfig();
            await createPrompt("Press Enter to continue...");
            await showSettingsMenu();
            break;
        case "3":
            runnerConfig.alwaysRunLatest = !runnerConfig.alwaysRunLatest;
            console.log(`${colors.BLUE}Force update set to: ${runnerConfig.alwaysRunLatest}${colors.RESET}`);
            saveConfig();
            await createPrompt("Press Enter to continue...");
            await showSettingsMenu();
            break;
        case "4":
            await showMainMenu(runnerType);
            break;
        default:
            console.log(`${colors.RED}Invalid option selected. Please try again.${colors.RESET}`);
            await showSettingsMenu();
            break;
    }
};

const downloadVersion = async (version) => {
    const runnerProcesses = isPlayerRunnerType(runnerType) ? PLAYER_PROCESSES : STUDIO_PROCESSES;
    await attemptKillProcesses(runnerProcesses);
    const versionFolder = version.startsWith("version-") ? version : `version-${version}`;
    const versionsPath = nodePath.join(getDirname(metaUrl), isPlayerRunnerType(runnerType) ? "PlayerVersions" : "StudioVersions");
    const dumpDir = nodePath.join(versionsPath, versionFolder);
    if (nodeFs.existsSync(dumpDir) && !runnerConfig.forceUpdate) {
        logger.info(`Version ${version} is already downloaded...`);
        return;
    }
    if (nodeFs.existsSync(dumpDir) && runnerConfig.deleteExistingFolders) {
        logger.info(`Deleting existing folder: ${dumpDir}`);
        deleteFolderRecursive(dumpDir);
        logger.info(`Successfully deleted existing folder: ${dumpDir}`);
    }
    nodeFs.mkdirSync(dumpDir, { recursive: true });
    const cdnBaseUrl = await getRobloxCDNBaseUrl();
    const cdnUrl = `${cdnBaseUrl}/${version}`;
    const manifestUrl = `${cdnUrl}-rbxPkgManifest.txt`;
    logger.info(`Fetching manifest from ${manifestUrl}...`);
    const axiosResponse = await axios.get(manifestUrl);
    logger.info(`Successfully fetched manifest from ${manifestUrl}!`);
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
            logger.info(`Skipped entry: ${fileName}. Unknown file extension.`);
            continue;
        }
        const packageUrl = `${cdnUrl}-${fileName}`;
        const filePath = `${dumpDir}/${fileName}`;
        logger.info(`Downloading ${fileName} from ${packageUrl}...`);
        await downloadFile(packageUrl, filePath, progressBar);
        logger.info(`Successfully downloaded ${fileName} from ${packageUrl}!`);
        logger.info(`Verifying file checksum: ${fileName}...`);
        const isChecksumValid = await verifyChecksum(filePath, checksum);
        if (!isChecksumValid) {
            logger.error(`Checksum mismatch for ${fileName}. Deleting file.`);
            nodeFs.unlinkSync(filePath);
            continue;
        }
        logger.info(`Successfully verified file checksum: ${fileName}!`);
        if (fileName.endsWith(".zip")) {
            logger.info(`Extracting zip file: ${fileName}...`);
            await extractZip(filePath, dumpDir, folderMappings);
            logger.info(`Successfully extracted zip file: ${fileName} to ${dumpDir}!`);
            logger.info(`Deleting zip file: ${fileName}...`);
            nodeFs.unlinkSync(filePath);
            logger.info(`Successfully deleted zip file: ${fileName}!`);
        }
    }
    logger.info(`Successfully downloaded and extracted ${version} to ${dumpDir}!`);
    logger.info(`Creating AppSettings.xml...`);
    nodeFs.writeFileSync(`${dumpDir}/AppSettings.xml`, AppSettings);
    logger.info(`Successfully created AppSettings.xml at root.`);
};

const downloadLatestVersion = async () => {
    logger.info("Fetching the latest version from channel: Live");
    const latestVersion = await fetchLatestVersion(runnerType);
    logger.info(`Successfully fetched the latest version from channel: Live!`);
    logger.info(`Latest version: ${latestVersion}`);
    await downloadVersion(latestVersion);
};

const downloadCustomVersion = async (version) => {
    logger.info(`Downloading the custom version: ${version}`);
    await downloadVersion(version);
};

const downloadFromChannel = async (channel) => {
    const clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(runnerType);
    const versionUrl = `${clientSettingsBaseUrl}/v2/client-version/${runnerType}/channel/${channel}`;
    logger.info(`Fetching the latest version from channel: ${channel}`);
    const axiosResponse = await axios.get(versionUrl);
    logger.info(`Successfully fetched the latest version from channel: ${channel}`);
    const axiosResponseData = axiosResponse.data;
    const version = axiosResponseData.clientVersionUpload;
    logger.info(`Version from channel ${channel}: ${version}`);
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
    logger.info("Fetching the latest version from channel: Live");
    const latestVersion = await fetchLatestVersion(runnerType);
    logger.info(`Successfully fetched the latest version!`);
    const versionsPath = nodePath.join(getDirname(metaUrl), isPlayerRunnerType(runnerType) ? "PlayerVersions" : "StudioVersions");
    const versions = getExistingVersions(versionsPath);
    if (versions.length === 0) {
        logger.warn(`No installed version found!`);
        await downloadVersion(latestVersion);
        return latestVersion;
    }
    console.log(`${colors.MAGENTA}Available versions:`);
    for (let i = 0; i < versions.length; i++) {
        const version = versions[i];
        console.log(`${colors.CYAN}${i + 1}. ${versions[i]}${colors.RESET}${version === latestVersion ? " (Latest)" : ""}`);
    }
    let selectedVersion = "";
    if (versions.length === 1) {
        selectedVersion = versions[0];
        logger.info(`Skipping prompt. Only one version found: ${selectedVersion}`);
    } else if (runnerConfig.alwaysRunLatest) {
        logger.info(`Skipping prompt. Will always run the latest version: ${latestVersion}`);
        await downloadVersion(latestVersion);
        return latestVersion;
    } else {
        const answer = await createPrompt("Select a version (1/2/3...): ");
        const versionIndex = parseInt(answer, 10) - 1;
        if (isNaN(versionIndex) || typeof versionIndex !== "number" || versionIndex < 0 || versionIndex >= versions.length) {
            throw new Error("Invalid version selected.");
        }
        selectedVersion = versions[versionIndex];
    }
    logger.info(`Selected version: ${selectedVersion}`);
    if (latestVersion === "") {
        logger.info(`Unable to determine the latest version.`);
        return selectedVersion;
    }
    logger.info(`Latest version: ${latestVersion}`);
    if (selectedVersion === latestVersion) {
        logger.info(`You're already on the latest version!`);
        return selectedVersion;
    }
    logger.info(`A new version is available!`);
    await downloadVersion(latestVersion);
    return latestVersion;
};

const launchRoblox = async (hasArgs = false, selectedVersion, argv = []) => {
    const versionsPath = nodePath.join(getDirname(metaUrl), isPlayerRunnerType(runnerType) ? "PlayerVersions" : "StudioVersions");
    const selectedVersionPath = nodePath.join(versionsPath, selectedVersion);
    const binaryName = isPlayerRunnerType(runnerType) ? "RobloxPlayerBeta.exe" : "RobloxStudioBeta.exe";
    const binaryPath = nodePath.join(selectedVersionPath, binaryName);
    if (!nodeFs.existsSync(binaryPath)) {
        logger.warn(`${binaryName} not found in ${selectedVersionPath}`);
        return;
    }
    await installEdgeWebView(selectedVersionPath);
    if (isPlayerRunnerType(runnerType)) {
        await setRegistryData(getPlayerRegistryData(binaryPath, selectedVersion), REGISTER_PLAYER_KEY_PATHS);
        await checkUnsetValuePaths(CORPORATION_UNSET_VALUE_PATHS);
        await checkUnsetValuePaths(PLAYER_UNSET_VALUE_PATHS);
    } else {
        await setRegistryData(getStudioRegistryData(binaryPath, selectedVersion), REGISTER_STUDIO_KEY_PATHS);
        await checkUnsetValuePaths(CORPORATION_UNSET_VALUE_PATHS);
        await checkUnsetValuePaths(STUDIO_UNSET_VALUE_PATHS);
        await setRegistryData(getStudioPlaceRegistryData(binaryPath), REGISTER_STUDIO_PLACE_KEY_PATHS);
        await checkUnsetValuePaths(STUDIO_PLACE_UNSET_VALUE_PATHS);
        await setRegistryData(getStudioFileExtensionsRegistryData(), REGISTER_STUDIO_FILE_EXTENSIONS_KEY_PATHS);
        await checkUnsetValuePaths(STUDIO_FILE_EXTENSIONS_UNSET_VALUE_PATHS);
    }
    applyFflags(selectedVersionPath);
    let launchArgs = "";
    if (hasArgs) {
        launchArgs = await createPrompt("Enter the launch arguments (e.g., roblox://...): ");
    }
    const robloxUri = argv[2];
    if (argv.length > 1 && robloxUri) {
        launchArgs = `${robloxUri} ${launchArgs}`;
    }
    const args = launchArgs.trim().split(" ");
    const spawnArgs = args.length > 0 && args[0] !== "" ? args : [];
    logger.info(`Launching with command: ${binaryPath} ${spawnArgs.join(" ")}`);
    const childProcess = nodeChildProcess.spawn(binaryPath, spawnArgs, { detached: true, stdio: "ignore" });
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
    // No ascii art lol
    const asciiArt = `rbxclistrap  Copyright (C) 2025  xayanide
This program comes with ABSOLUTELY NO WARRANTY; for details type '8'.
This is free software, and you are welcome to redistribute it
under certain conditions; type '8' for details.

Download and launch ${runnerType} versions using just the command line.
`;
    const mainMenu = `
${colors.BLUE}${asciiArt}${colors.RESET}
${colors.CYAN}1. Download latest version/update${colors.RESET}
${colors.CYAN}2. Download the last LIVE version (downgrade)${colors.RESET}
${colors.CYAN}3. Download a custom version hash${colors.RESET}
${colors.CYAN}4. Download from a specific channel${colors.RESET}
${colors.CYAN}5. Launch ${runnerType}${colors.RESET}
${colors.CYAN}6. Launch ${runnerType} with args${colors.RESET}
${colors.GREEN}7. Settings${colors.RESET}
${colors.YELLOW}8. License${colors.RESET}
${colors.RED}9. Exit${colors.RESET}
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
            const previousVersion = await fetchPreviousVersion(runnerType);
            if (!previousVersion) {
                break;
            }
            await downloadVersion(previousVersion);
            break;
        }
        case "3": {
            console.clear();
            const versionHash = await createPrompt("Enter the custom version hash: ");
            await downloadCustomVersion(versionHash);
            break;
        }
        case "4": {
            console.clear();
            const channel = await createPrompt("Enter the channel name: ");
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
            console.log(`${colors.BLUE}Exiting...${colors.RESET}`);
            nodeProcess.exit(0);
            break;
        default:
            console.clear();
            console.log(`${colors.RED}Invalid option selected. Please try again.${colors.RESET}`);
            await showMainMenu(runnerType);
            break;
    }
}

export { loadConfig, loadFflags, showMainMenu, launchAutoUpdater, launchRoblox };
