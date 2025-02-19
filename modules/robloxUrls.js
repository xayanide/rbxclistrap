import { DEPLOYMENT_VERSION_STUDIO_HASH, DEPLOYMENT_ROBLOX_CDN_BASE_URLS, ROBLOX_CLIENTSETTINGS_BASE_URLS } from "./constants.js";
import { findFastestUrl } from "./urlUtils.js";

const getRobloxClientSettingsBaseUrl = async (runnerType) => {
    if (!runnerType) {
        throw new Error("Unable to find ClientSettings BaseURL. Runner type unprovided.");
    }
    return await findFastestUrl(ROBLOX_CLIENTSETTINGS_BASE_URLS, `/v2/client-version/${runnerType}/channel/live`);
};

const getRobloxCDNBaseUrl = async () => {
    return await findFastestUrl(DEPLOYMENT_ROBLOX_CDN_BASE_URLS, "/versionStudio", DEPLOYMENT_VERSION_STUDIO_HASH);
};

export { getRobloxClientSettingsBaseUrl, getRobloxCDNBaseUrl };
