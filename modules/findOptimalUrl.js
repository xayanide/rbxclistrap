const axios = require("axios");
const logger = require("./logger.js");

const testUrl = async (url, endpoint, priority, abortSignal, expectedData = null) => {
    await new Promise((resolve) => setTimeout(resolve, priority * 1000));
    const testUrl = endpoint !== "" ? `${url}${endpoint}` : url;
    logger.info(`Testing URL: ${testUrl}...`);
    try {
        const { status, data } = await axios.get(testUrl, { signal: abortSignal });
        if (status !== 200 || (expectedData && data !== expectedData)) {
            return null;
        }
        return url;
    } catch (error) {
        if (!axios.isCancel(error)) {
            logger.error(`async testUrl(): Failed testing ${url}:\n${error.message}\n${error.stack}`);
        } else {
            logger.info(`async testUrl(): Canceled testing ${url}`);
        }
        return error;
    }
};

const findOptimalUrl = async (baseUrls, endpoint, expectedData = null) => {
    const abortController = new AbortController();
    const testedUrls = baseUrls.map(async ({ baseUrl, priority }) =>
        testUrl(baseUrl, endpoint, priority, abortController.signal, expectedData),
    );
    const exceptions = [];
    for await (const result of testedUrls) {
        if (!result) {
            continue;
        }
        if (result instanceof Error && !axios.isCancel(result)) {
            exceptions.push(result);
            continue;
        }
        abortController.abort();
        logger.info(`Using ${result} as the optimal URL`);
        return result;
    }
    throw exceptions.length ? exceptions[0] : new Error("All test connection attempts failed.");
};

module.exports = findOptimalUrl;
