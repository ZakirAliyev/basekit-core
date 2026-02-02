export function deepClone<T>(value: T): T {
    if (value === null || typeof value !== "object") return value

    if (Array.isArray(value)) {
        return value.map(deepClone) as T
    }

    const result: any = {}
    for (const key in value) {
        result[key] = deepClone((value as any)[key])
    }

    return result
}

export function isEmpty(value: any): boolean {
    if (value == null) return true
    if (Array.isArray(value) || typeof value === "string")
        return value.length === 0
    if (typeof value === "object")
        return Object.keys(value).length === 0
    return false
}

export function merge<T extends object, U extends object>(
    target: T,
    source: U
): T & U {
    const result: any = { ...target }

    for (const key in source) {
        const val = (source as any)[key]
        result[key] =
            typeof val === "object" && !Array.isArray(val)
                ? merge((target as any)[key] || {}, val)
                : val
    }

    return result
}
