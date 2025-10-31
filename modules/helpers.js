function isEmptyObject(object) {
    for (const property in object) {
        if (Object.hasOwn(object, property)) {
            return false;
        }
    }
    return true;
}

function isPureEmptyObject(value) {
    if (value == null || typeof value !== "object") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) {
        return false;
    }
    return isEmptyObject(value);
}

function verifyMapping(manifestFiles, folderMappings, isPlayer) {
    const expectedFiles = new Set(Object.keys(folderMappings._common));
    if (isPlayer) {
        for (const key of Object.keys(folderMappings._playerOnly)) {
            expectedFiles.add(key);
        }
    } else if (isPlayer === false) {
        for (const key of Object.keys(folderMappings._studioOnly)) {
            expectedFiles.add(key);
        }
    }
    const manifestSet = new Set(manifestFiles);
    const missingMaps = [...manifestSet].filter(function (fileName) { return !expectedFiles.has(fileName); });
    const excessMaps = [...expectedFiles].filter(function (fileName) { return !manifestSet.has(fileName); });
    return { missingMaps, excessMaps };
}

function compareRobloxClientVersions(a, b) {
    const v1Parts = a.split(".").map(Number);
    const v2Parts = b.split(".").map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const num1 = v1Parts[i] || 0;
        const num2 = v2Parts[i] || 0;
        if (num1 > num2) {
            return a;
        }
        if (num1 < num2) {
            return b;
        }
    }
    return null;
}

export { isEmptyObject, isPureEmptyObject, compareRobloxClientVersions, verifyMapping };
