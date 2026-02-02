export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

export function random(min = 0, max = 1): number {
    return Math.random() * (max - min) + min
}
