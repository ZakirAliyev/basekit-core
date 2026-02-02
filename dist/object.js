export function deepClone(value) {
    if (value === null || typeof value !== "object")
        return value;
    if (Array.isArray(value)) {
        return value.map(deepClone);
    }
    const result = {};
    for (const key in value) {
        result[key] = deepClone(value[key]);
    }
    return result;
}
export function isEmpty(value) {
    if (value == null)
        return true;
    if (Array.isArray(value) || typeof value === "string")
        return value.length === 0;
    if (typeof value === "object")
        return Object.keys(value).length === 0;
    return false;
}
export function merge(target, source) {
    const result = { ...target };
    for (const key in source) {
        const val = source[key];
        result[key] =
            typeof val === "object" && !Array.isArray(val)
                ? merge(target[key] || {}, val)
                : val;
    }
    return result;
}
