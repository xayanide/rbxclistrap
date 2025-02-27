import axios from "axios";
import { DESKTOP_DEPLOYMENT_TYPES_MAP, BOOTSTRAPPER_DEPLOYMENT_TYPES_MAP, DEPLOYMENT_DEFAULT_CHANNEL, PRODUCTION_CHANNEL_NAMES } from "./constants.js";

async function getAppSettings(baseUrl, applicationName, channelName = DEPLOYMENT_DEFAULT_CHANNEL) {
    let fullUrl = `${baseUrl}/v2/settings/application/${applicationName}`;
    const channelNameLower = channelName.toLowerCase();
    if (!PRODUCTION_CHANNEL_NAMES.includes(channelName)) {
        fullUrl = `${fullUrl}/bucket/${channelNameLower}`;
    }
    let isFailed = false;
    let axiosResponse;
    try {
        axiosResponse = await axios.get(fullUrl);
    } catch {
        isFailed = true;
    }
    const axiosResponseData = axiosResponse.data;
    const applicationSettings = axiosResponseData.applicationSettings;
    if (isFailed || !axiosResponse || !axiosResponseData || !applicationSettings) {
        throw new Error(`Failed to fetch ${applicationName} application settings from Roblox API`);
    }
    return applicationSettings;
}

async function getBootstrapperAppSettings(baseUrl, binaryType, channelName) {
    const applicationName = BOOTSTRAPPER_DEPLOYMENT_TYPES_MAP[binaryType];
    if (!applicationName) {
        throw new Error(`Unable to find deployment type for binary type: ${binaryType}`);
    }
    return await getAppSettings(baseUrl, applicationName, channelName);
}

async function getDesktopAppSettings(baseUrl, binaryType, channelName) {
    const applicationName = DESKTOP_DEPLOYMENT_TYPES_MAP[binaryType];
    if (!applicationName) {
        throw new Error(`Unable to find deployment type for binary type: ${binaryType}`);
    }
    return await getAppSettings(baseUrl, applicationName, channelName);
}

export { getBootstrapperAppSettings, getDesktopAppSettings };
