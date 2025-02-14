import axios from "axios";
import logger from "./logger.js";
import { getRobloxCDNBaseUrl } from "./robloxUrls.js";
import { BINARY_TYPES } from "./constants.js";

const HISTORY_BINARY_TYPES = { PLAYER: "WindowsPlayer", STUDIO: "Studio64" };

const fetchPreviousVersion = async (runnerType) => {
    if (runnerType !== BINARY_TYPES.PLAYER || runnerType !== BINARY_TYPES.STUDIO) {
        throw new Error("Invalid runner type. Must be WindowsPlayer or WindowsStudio64");
    }
    try {
        const binaryType = runnerType === BINARY_TYPES.PLAYER ? HISTORY_BINARY_TYPES.PLAYER : HISTORY_BINARY_TYPES.STUDIO;
        const cdnBaseUrl = await getRobloxCDNBaseUrl();
        const url = `${cdnBaseUrl}/DeployHistory.txt`;
        logger.info(`Fetching DeployHistory from: ${url}...`);
        const axiosResponse = await axios.get(url);
        logger.info(`Successfully fetched DeployHistory!`);
        const axiosResponseData = axiosResponse.data;
        const deployHistory = axiosResponseData.trim().split("\n");
        let lastVersionIndex = -1;
        let previousVersion = "";
        for (let i = deployHistory.length - 1; i >= 0; i--) {
            const line = deployHistory[i];
            if (!line.startsWith(`New ${binaryType} version-`)) {
                continue;
            }
            if (lastVersionIndex === -1) {
                lastVersionIndex = i;
                continue;
            }
            previousVersion = line.match(/version-([\w\d]+)/)[0].trim();
            break;
        }
        if (!previousVersion || previousVersion === "") {
            logger.error(`Could not find a previous ${binaryType} version.`);
            return null;
        }
        logger.info(`Previous ${binaryType} version: ${previousVersion}`);
        return previousVersion;
    } catch (error) {
        logger.error(`async fetchPreviousVersion():\n${error.message}\n${error.stack}`);
        return null;
    }
};

export default fetchPreviousVersion;
