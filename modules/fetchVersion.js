const nodeProcess = require("process");
const axios = require("axios");
const logger = require("./logger.js");
const { getRobloxClientSettingsBaseUrl } = require("./robloxUrls.js");

const fetchVersion = async (runnerType) => {
    try {
        const clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(runnerType);
        const axiosResponse = await axios.get(`${clientSettingsBaseUrl}/v2/client-version/${runnerType}/channel/live`);
        const axiosResponseData = axiosResponse.data;
        if (!axiosResponseData || !axiosResponseData.clientVersionUpload) {
            throw new Error("Failed to fetch version from Roblox API");
        }
        return axiosResponseData.clientVersionUpload;
    } catch (fetchErr) {
        logger.error(`async fetchVersion():\n${fetchErr.message}\n${fetchErr.stack}`);
        nodeProcess.exit(1);
    }
};

module.exports = fetchVersion;
