export type AnyFn = (...args: any[]) => any

type AnyThis = any
type Timer = ReturnType<typeof setTimeout>

function now(): number {
    const p: any = (globalThis as any).performance
    if (p && typeof p.now === "function") return p.now()
    return Date.now()
}

function toIntNonNeg(n: number): number {
    const x = n | 0
    return x < 0 ? 0 : x
}

function lruTouch<K, V>(m: Map<K, V>, key: K) {
    const v = m.get(key)
    if (v === undefined && !m.has(key)) return
    m.delete(key)
    m.set(key, v as V)
}

function lruTrim<K, V>(m: Map<K, V>, maxSize: number) {
    if (maxSize <= 0) return
    while (m.size > maxSize) {
        const k = m.keys().next().value as K | undefined
        if (k === undefined) return
        m.delete(k)
    }
}

export function noop(): void {}

export function identity<T>(x: T): T {
    return x
}

export function once<T extends AnyFn>(fn: T): T {
    let called = false
    let value: any
    return function (this: AnyThis, ...args: any[]) {
        if (!called) {
            called = true
            value = fn.apply(this, args)
        }
        return value
    } as T
}

export function onceAsync<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    let p: Promise<any> | null = null
    return (function (this: AnyThis, ...args: any[]) {
        if (!p) p = fn.apply(this, args)
        return p
    } as unknown) as T
}

export function delay(ms: number): Promise<void> {
    const t = toIntNonNeg(ms)
    return new Promise(resolve => setTimeout(resolve, t))
}

export function defer(fn: AnyFn): void {
    setTimeout(fn, 0)
}

export function tryCatch<T extends AnyFn>(
    fn: T,
    onError?: (err: unknown) => void
): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>) => {
        try {
            return fn(...args)
        } catch (err) {
            onError?.(err)
            return undefined
        }
    }
}

export type Debounced<T extends AnyFn> = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
    cancel: () => void
    flush: () => ReturnType<T> | undefined
    pending: () => boolean
}

export function debounce<T extends AnyFn>(
    fn: T,
    wait: number = 0,
    options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
): Debounced<T> {
    const leading = !!options?.leading
    const trailing = options?.trailing !== false
    const w = toIntNonNeg(wait)
    const maxWait =
        options?.maxWait === undefined ? undefined : toIntNonNeg(options.maxWait)

    let timer: Timer | null = null
    let lastArgs: any[] | null = null
    let lastThis: AnyThis = null
    let lastCallTime = 0
    let lastInvokeTime = 0
    let lastResult: any = undefined

    const clearState = () => {
        lastArgs = null
        lastThis = null
    }

    const invoke = () => {
        if (!lastArgs) return lastResult
        const args = lastArgs
        const ctx = lastThis
        clearState()
        lastInvokeTime = now()
        lastResult = fn.apply(ctx, args)
        return lastResult
    }

    const stopTimer = () => {
        if (timer) clearTimeout(timer)
        timer = null
    }

    const startTimer = (ms: number) => {
        stopTimer()
        timer = setTimeout(onTimer, ms)
    }

    const remainingWait = (t: number) => {
        const sinceCall = t - lastCallTime
        const sinceInvoke = t - lastInvokeTime
        const timeWaiting = w - sinceCall
        return maxWait === undefined ? timeWaiting : Math.min(timeWaiting, maxWait - sinceInvoke)
    }

    const shouldInvoke = (t: number) => {
        const sinceCall = t - lastCallTime
        const sinceInvoke = t - lastInvokeTime
        return (
            lastCallTime === 0 ||
            sinceCall >= w ||
            sinceCall < 0 ||
            (maxWait !== undefined && sinceInvoke >= maxWait)
        )
    }

    const onTimer = () => {
        timer = null
        const t = now()
        if (shouldInvoke(t)) {
            if (trailing) invoke()
            return
        }
        startTimer(remainingWait(t))
    }

    const debounced = function (this: AnyThis, ...args: any[]) {
        const t = now()
        const isInvoking = shouldInvoke(t)

        lastArgs = args
        lastThis = this
        lastCallTime = t

        if (!timer) {
            if (leading && isInvoking) {
                const r = invoke()
                if (trailing) startTimer(w)
                else clearState()
                return r
            }

            if (trailing) {
                startTimer(w)
            } else {
                clearState()
            }
            return lastResult
        }

        if (maxWait !== undefined && isInvoking) {
            if (trailing) startTimer(w)
            return invoke()
        }

        return lastResult
    } as Debounced<T>

    debounced.cancel = () => {
        stopTimer()
        clearState()
        lastCallTime = 0
        lastInvokeTime = 0
        lastResult = undefined
    }

    debounced.flush = () => {
        if (!timer) return lastResult
        stopTimer()
        return trailing ? invoke() : lastResult
    }

    debounced.pending = () => !!timer

    return debounced
}

export type Throttled<T extends AnyFn> = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
    cancel: () => void
    flush: () => ReturnType<T> | undefined
    pending: () => boolean
}

export function throttle<T extends AnyFn>(
    fn: T,
    wait: number = 0,
    options?: { leading?: boolean; trailing?: boolean }
): Throttled<T> {
    const leading = options?.leading !== false
    const trailing = options?.trailing !== false
    return debounce(fn, wait, { leading, trailing, maxWait: toIntNonNeg(wait) }) as Throttled<T>
}

type MemoOpts = { maxSize?: number }

export function memoize<T extends AnyFn>(
    fn: T,
    keyResolver?: (...args: Parameters<T>) => string | number,
    options?: MemoOpts
): T & { cache: Map<string | number, ReturnType<T>>; clear: () => void; delete: (key: string | number) => boolean } {
    const cache = new Map<string | number, ReturnType<T>>()
    const maxSize = options?.maxSize === undefined ? 0 : toIntNonNeg(options.maxSize)

    const memoized = function (this: AnyThis, ...args: any[]) {
        const key = keyResolver ? keyResolver(...(args as any)) : (args[0] as any)
        if (cache.has(key)) {
            if (maxSize > 0) lruTouch(cache, key)
            return cache.get(key) as ReturnType<T>
        }
        const result = fn.apply(this, args)
        cache.set(key, result)
        if (maxSize > 0) lruTrim(cache, maxSize)
        return result
    } as any

    memoized.cache = cache
    memoized.clear = () => cache.clear()
    memoized.delete = (key: string | number) => cache.delete(key)

    return memoized
}

export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyResolver?: (...args: Parameters<T>) => string | number,
    options?: MemoOpts
): T & { cache: Map<string | number, ReturnType<T>>; clear: () => void; delete: (key: string | number) => boolean } {
    const cache = new Map<string | number, ReturnType<T>>()
    const maxSize = options?.maxSize === undefined ? 0 : toIntNonNeg(options.maxSize)

    const memoized = function (this: AnyThis, ...args: any[]) {
        const key = keyResolver ? keyResolver(...(args as any)) : (args[0] as any)
        const cached = cache.get(key)
        if (cached) {
            if (maxSize > 0) lruTouch(cache, key)
            return cached
        }

        const p = fn.apply(this, args) as ReturnType<T>
        cache.set(key, p)
        if (maxSize > 0) lruTrim(cache, maxSize)

        p.catch(() => {
            if (cache.get(key) === p) cache.delete(key)
        })

        return p
    } as any

    memoized.cache = cache
    memoized.clear = () => cache.clear()
    memoized.delete = (key: string | number) => cache.delete(key)

    return memoized
}

export function pipe(): (x: any) => any
export function pipe<T1, T2>(a: (x: T1) => T2): (x: T1) => T2
export function pipe<T1, T2, T3>(a: (x: T1) => T2, b: (x: T2) => T3): (x: T1) => T3
export function pipe<T1, T2, T3, T4>(
    a: (x: T1) => T2,
    b: (x: T2) => T3,
    c: (x: T3) => T4
): (x: T1) => T4
export function pipe(...fns: AnyFn[]) {
    if (fns.length === 0) return (x: any) => x
    return (x: any) => fns.reduce((v, fn) => fn(v), x)
}

export function compose(): (x: any) => any
export function compose<T1, T2>(a: (x: T1) => T2): (x: T1) => T2
export function compose<T1, T2, T3>(a: (x: T2) => T3, b: (x: T1) => T2): (x: T1) => T3
export function compose<T1, T2, T3, T4>(
    a: (x: T3) => T4,
    b: (x: T2) => T3,
    c: (x: T1) => T2
): (x: T1) => T4
export function compose(...fns: AnyFn[]) {
    if (fns.length === 0) return (x: any) => x
    return (x: any) => fns.reduceRight((v, fn) => fn(v), x)
}
