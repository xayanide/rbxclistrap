function isEmptyObject(object) {
    for (const property in object) {
        if (Object.hasOwn(object, property)) {
            return false;
        }
    }
    return true;
}

function isValueEmptyObject(value) {
    if (value == null || typeof value !== "object") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) {
        return false;
    }
    return isEmptyObject(value);
}

export { isEmptyObject, isValueEmptyObject };
