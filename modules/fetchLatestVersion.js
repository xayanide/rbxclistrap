import * as nodeProcess from "node:process";
import axios from "axios";
import logger from "./logger.js";
import { getRobloxClientSettingsBaseUrl } from "./robloxUrls.js";
import { createPrompt } from "./prompt.js";

const fetchLatestVersion = async (runnerType) => {
    try {
        const clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(runnerType);
        const axiosResponse = await axios.get(`${clientSettingsBaseUrl}/v2/client-version/${runnerType}/channel/live`);
        const axiosResponseData = axiosResponse.data;
        if (!axiosResponseData || !axiosResponseData.clientVersionUpload) {
            throw new Error("Failed to fetch latest version from Roblox API");
        }
        return axiosResponseData.clientVersionUpload;
    } catch (fetchErr) {
        logger.error(`async fetchLatestVersion():\n${fetchErr.message}\n${fetchErr.stack}`);
        await createPrompt("Something went wrong! Press any key to exit.");
        nodeProcess.exit(1);
    }
};

export default fetchLatestVersion;
