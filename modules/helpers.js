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

export { isEmptyObject, isPureEmptyObject, compareRobloxClientVersions };
