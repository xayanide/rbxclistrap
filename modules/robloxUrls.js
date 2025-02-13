import { VERSION_STUDIO_HASH, ROBLOX_CDN_URLS, ROBLOX_CLIENTSETTINGS_URLS } from "./constants.js";
import { findFastestUrl } from "./urlUtils.js";

const getRobloxClientSettingsBaseUrl = async (runnerType) => {
    return await findFastestUrl(ROBLOX_CLIENTSETTINGS_URLS, `/v2/client-version/${runnerType}/channel/live`);
};
const getRobloxCDNBaseUrl = async () => {
    return await findFastestUrl(ROBLOX_CDN_URLS, "/versionStudio", VERSION_STUDIO_HASH);
};

export { getRobloxClientSettingsBaseUrl, getRobloxCDNBaseUrl };
