import { DEPLOYMENT_VERSION_STUDIO_HASH, DEPLOYMENT_ROBLOX_CDN_BASE_URLS, ROBLOX_CLIENTSETTINGS_BASE_URLS } from "./constants.js";
import { findFastestUrl } from "./urlUtils.js";

const getRobloxClientSettingsBaseUrl = async (binaryType) => {
    if (!binaryType) {
        throw new Error("Unable to find ClientSettings BaseURL. Runner type unprovided.");
    }
    /** Alternative endpoint we can query: /v2/client-version/${binaryType}/channel/${channel} */
    return await findFastestUrl(ROBLOX_CLIENTSETTINGS_BASE_URLS, `/v2/user-channel?binaryType=${binaryType}`);
};

const getRobloxCDNBaseUrl = async () => {
    return await findFastestUrl(DEPLOYMENT_ROBLOX_CDN_BASE_URLS, "/versionStudio", DEPLOYMENT_VERSION_STUDIO_HASH);
};

export { getRobloxClientSettingsBaseUrl, getRobloxCDNBaseUrl };
