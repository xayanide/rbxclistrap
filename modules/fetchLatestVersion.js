import axios from "axios";

const fetchLatestVersion = async (runnerType, clientSettingsBaseUrl) => {
    const axiosResponse = await axios.get(`${clientSettingsBaseUrl}/v2/client-version/${runnerType}/channel/live`);
    const axiosResponseData = axiosResponse.data;
    const version = axiosResponseData.clientVersionUpload;
    if (!axiosResponseData || !version) {
        throw new Error("Failed to fetch latest version from Roblox API");
    }
    return version;
};

export default fetchLatestVersion;
