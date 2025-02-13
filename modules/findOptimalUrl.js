import axios from "axios";
import logger from "./logger.js";

const testUrl = async (
    url,
    endpoint,
    priority,
    abortSignal,
    expectedData = null,
) => {
    await new Promise((resolve) => {
        return setTimeout(resolve, priority * 1000);
    });
    const fullUrl = endpoint === "" ? url : `${url}${endpoint}`;
    logger.info(`Testing URL: ${fullUrl}...`);
    try {
        const { status, data } = await axios.get(fullUrl, {
            signal: abortSignal,
        });
        if (status !== 200 || (expectedData && data !== expectedData)) {
            return null;
        }
        return url;
    } catch (error) {
        if (axios.isCancel(error)) {
            logger.info(`async testUrl(): Canceled testing ${fullUrl}`);
        } else {
            logger.error(
                `async testUrl(): Failed testing ${fullUrl}:\n${error.message}\n${error.stack}`,
            );
        }
        return error;
    }
};

const findOptimalUrl = async (baseUrls, endpoint, expectedData = null) => {
    const abortController = new AbortController();
    const testedUrls = baseUrls.map(async ({ baseUrl, priority }) => {
        return await testUrl(
            baseUrl,
            endpoint,
            priority,
            abortController.signal,
            expectedData,
        );
    });
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
    throw exceptions.length
        ? exceptions[0]
        : new Error("All test connection attempts failed.");
};

export default findOptimalUrl;
