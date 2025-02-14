import { DEPLOYMENT_VERSION_STUDIO_HASH, DEPLOYMENT_ROBLOX_CDN_URLS, ROBLOX_CLIENTSETTINGS_URLS } from "./constants.js";
import { findFastestUrl } from "./urlUtils.js";

// Currently for every request, it tries to find the fastest URL and returns that.
const getRobloxClientSettingsBaseUrl = async (runnerType) => {
    return await findFastestUrl(ROBLOX_CLIENTSETTINGS_URLS, `/v2/client-version/${runnerType}/channel/live`);
};
const getRobloxCDNBaseUrl = async () => {
    return await findFastestUrl(DEPLOYMENT_ROBLOX_CDN_URLS, "/versionStudio", DEPLOYMENT_VERSION_STUDIO_HASH);
};

export { getRobloxClientSettingsBaseUrl, getRobloxCDNBaseUrl };
