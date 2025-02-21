import axios from "axios";
import logger from "./logger.js";
import { DEPLOY_TYPES_MAP } from "./constants.js";

const fetchPreviousVersion = async (runnerType, cdnBaseUrl) => {
    const deployType = DEPLOY_TYPES_MAP[runnerType];
    if (!deployType) {
        throw new Error("Unknown deploy type.");
    }
    try {
        const url = `${cdnBaseUrl}/DeployHistory.txt`;
        logger.info(`Fetching previous version from ${url}`);
        const axiosResponse = await axios.get(url);
        logger.info("Successfully fetched previous version!");
        const axiosResponseData = axiosResponse.data;
        const deployHistory = axiosResponseData.trim().split("\n");
        let lastVersionIndex = -1;
        let previousVersion = "";
        for (let i = deployHistory.length - 1; i >= 0; i--) {
            const line = deployHistory[i];
            if (!line.startsWith(`New ${deployType} version-`)) {
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
            logger.error(`Could not find a previous ${deployType} version.`);
            return null;
        }
        logger.info(`Previous ${deployType} version: ${previousVersion}`);
        return previousVersion;
    } catch (error) {
        logger.error(`async fetchPreviousVersion():\n${error.message}\n${error.stack}`);
        return null;
    }
};

export default fetchPreviousVersion;
