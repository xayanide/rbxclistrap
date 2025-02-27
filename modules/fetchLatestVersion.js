import axios from "axios";
import { DEPLOYMENT_DEFAULT_CHANNEL } from "./constants.js";

const fetchLatestVersion = async (binaryType, clientSettingsBaseUrl, channel = "live") => {
    if (channel.toLowerCase() === DEPLOYMENT_DEFAULT_CHANNEL) {
        channel = "live";
    }
    const axiosResponse = await axios.get(`${clientSettingsBaseUrl}/v2/client-version/${binaryType}/channel/${channel}`);
    const axiosResponseData = axiosResponse.data;
    const version = axiosResponseData.clientVersionUpload;
    if (!axiosResponseData || !version) {
        throw new Error("Failed to fetch latest version from Roblox API");
    }
    return version;
};

export default fetchLatestVersion;
