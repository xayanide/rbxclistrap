import { PRODUCTION_CHANNEL_NAMES } from "./constants.js";

function getRobloxDownloadUrl(baseUrl, channelName, bootStrapperAppSettings) {
    let channelNameLower = channelName.toLowerCase();
    if (PRODUCTION_CHANNEL_NAMES.includes(channelNameLower)) {
        return baseUrl;
    }
    if (bootStrapperAppSettings.FFlagReplaceChannelNameForDownload === "True") {
        channelNameLower = "common";
    }
    return `${baseUrl}/channel/${channelNameLower}`;
}

export { getRobloxDownloadUrl };
