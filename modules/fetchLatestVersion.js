import axios from "axios";
import { getRobloxClientSettingsBaseUrl } from "./robloxUrls.js";

const fetchLatestVersion = async (runnerType) => {
    const clientSettingsBaseUrl = await getRobloxClientSettingsBaseUrl(runnerType);
    const axiosResponse = await axios.get(`${clientSettingsBaseUrl}/v2/client-version/${runnerType}/channel/live`);
    const axiosResponseData = axiosResponse.data;
    if (!axiosResponseData || !axiosResponseData.clientVersionUpload) {
        throw new Error("Failed to fetch latest version from Roblox API");
    }
    return axiosResponseData.clientVersionUpload;
};

export default fetchLatestVersion;
