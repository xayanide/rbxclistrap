import * as nodePerfHooks from "node:perf_hooks";
import axios from "axios";
import logger from "./logger.js";

const testUrl = async (baseUrl, fullUrl, priority, abortSignal, expectedData = null) => {
    await new Promise((resolve) => {
        return setTimeout(resolve, priority * 1000);
    });
    try {
        const { status, data } = await axios.get(fullUrl, {
            signal: abortSignal,
        });
        if (status !== 200 || (expectedData && data !== expectedData)) {
            return null;
        }
        return baseUrl;
    } catch (error) {
        return error;
    }
};

const findOptimalUrl = async (baseUrls, endpoint, expectedData = null) => {
    const abortController = new AbortController();
    const testedUrls = baseUrls.map(async ({ baseUrl, priority }) => {
        const fullUrl = !endpoint || endpoint === "" ? baseUrl : `${baseUrl}/${endpoint.startsWith("/") ? endpoint.slice(1) : endpoint}`;
        return await testUrl(baseUrl, fullUrl, priority, abortController.signal, expectedData);
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
    throw exceptions.length > 0 ? exceptions[0] : new Error("All test connection attempts failed.");
};

async function findFastestUrl(baseUrls, endpoint, expectedData = null) {
    let fastestUrl = null;
    let fastestTime = 10000;
    for (const { baseUrl } of baseUrls) {
        const fullUrl = !endpoint || endpoint === "" ? baseUrl : `${baseUrl}/${endpoint.startsWith("/") ? endpoint.slice(1) : endpoint}`;
        const abortController = new AbortController();
        const timeoutId = setTimeout(function () {
            return abortController.abort();
        }, fastestTime);
        try {
            const startTime = nodePerfHooks.performance.now();
            const { status, data } = await axios.get(fullUrl, {
                signal: abortController.signal,
            });
            clearTimeout(timeoutId);
            if (status !== 200) {
                continue;
            }
            const elapsedTime = nodePerfHooks.performance.now() - startTime;
            if (expectedData && data !== expectedData) {
                return null;
            }
            if (elapsedTime > fastestTime) {
                continue;
            }
            fastestTime = elapsedTime;
            fastestUrl = baseUrl;
        } catch (error) {
            if (axios.isCancel(error)) {
                continue;
            }
        }
    }
    if (!fastestUrl) {
        throw new Error("None of the base URLs have responded!");
    }
    logger.info(`Using ${fastestUrl} as the fastest URL`);
    return fastestUrl;
}

export { findOptimalUrl, findFastestUrl };
