const { VERSION_STUDIO_HASH, ROBLOX_CDN_URLS, ROBLOX_CLIENTSETTINGS_URLS } = require("./constants.js");
const findOptimalUrl = require("./findOptimalUrl.js");

const getRobloxClientSettingsBaseUrl = async (runnerType) =>
    findOptimalUrl(ROBLOX_CLIENTSETTINGS_URLS, `/v2/client-version/${runnerType}/channel/live`);
const getRobloxCDNBaseUrl = async () => findOptimalUrl(ROBLOX_CDN_URLS, "/versionStudio", VERSION_STUDIO_HASH);

module.exports = {
    getRobloxClientSettingsBaseUrl,
    getRobloxCDNBaseUrl,
};
