export function unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr))
}

export function chunk<T>(arr: T[], size: number): T[][] {
    const res: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size))
    }
    return res
}
