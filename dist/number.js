export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function random(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
}
