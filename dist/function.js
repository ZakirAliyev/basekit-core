function now() {
    const p = globalThis.performance;
    if (p && typeof p.now === "function")
        return p.now();
    return Date.now();
}
function toIntNonNeg(n) {
    const x = n | 0;
    return x < 0 ? 0 : x;
}
function lruTouch(m, key) {
    const v = m.get(key);
    if (v === undefined && !m.has(key))
        return;
    m.delete(key);
    m.set(key, v);
}
function lruTrim(m, maxSize) {
    if (maxSize <= 0)
        return;
    while (m.size > maxSize) {
        const k = m.keys().next().value;
        if (k === undefined)
            return;
        m.delete(k);
    }
}
export function noop() { }
export function identity(x) {
    return x;
}
export function once(fn) {
    let called = false;
    let value;
    return function (...args) {
        if (!called) {
            called = true;
            value = fn.apply(this, args);
        }
        return value;
    };
}
export function onceAsync(fn) {
    let p = null;
    return function (...args) {
        if (!p)
            p = fn.apply(this, args);
        return p;
    };
}
export function delay(ms) {
    const t = toIntNonNeg(ms);
    return new Promise(resolve => setTimeout(resolve, t));
}
export function defer(fn) {
    setTimeout(fn, 0);
}
export function tryCatch(fn, onError) {
    return (...args) => {
        try {
            return fn(...args);
        }
        catch (err) {
            onError?.(err);
            return undefined;
        }
    };
}
export function debounce(fn, wait = 0, options) {
    const leading = !!options?.leading;
    const trailing = options?.trailing !== false;
    const w = toIntNonNeg(wait);
    const maxWait = options?.maxWait === undefined ? undefined : toIntNonNeg(options.maxWait);
    let timer = null;
    let lastArgs = null;
    let lastThis = null;
    let lastCallTime = 0;
    let lastInvokeTime = 0;
    let lastResult = undefined;
    const clearState = () => {
        lastArgs = null;
        lastThis = null;
    };
    const invoke = () => {
        if (!lastArgs)
            return lastResult;
        const args = lastArgs;
        const ctx = lastThis;
        clearState();
        lastInvokeTime = now();
        lastResult = fn.apply(ctx, args);
        return lastResult;
    };
    const stopTimer = () => {
        if (timer)
            clearTimeout(timer);
        timer = null;
    };
    const startTimer = (ms) => {
        stopTimer();
        timer = setTimeout(onTimer, ms);
    };
    const remainingWait = (t) => {
        const sinceCall = t - lastCallTime;
        const sinceInvoke = t - lastInvokeTime;
        const timeWaiting = w - sinceCall;
        return maxWait === undefined ? timeWaiting : Math.min(timeWaiting, maxWait - sinceInvoke);
    };
    const shouldInvoke = (t) => {
        const sinceCall = t - lastCallTime;
        const sinceInvoke = t - lastInvokeTime;
        return (lastCallTime === 0 ||
            sinceCall >= w ||
            sinceCall < 0 ||
            (maxWait !== undefined && sinceInvoke >= maxWait));
    };
    const onTimer = () => {
        timer = null;
        const t = now();
        if (shouldInvoke(t)) {
            if (trailing)
                invoke();
            return;
        }
        startTimer(remainingWait(t));
    };
    const debounced = function (...args) {
        const t = now();
        const isInvoking = shouldInvoke(t);
        lastArgs = args;
        lastThis = this;
        lastCallTime = t;
        if (!timer) {
            if (leading && isInvoking) {
                const r = invoke();
                if (trailing)
                    startTimer(w);
                else
                    clearState();
                return r;
            }
            if (trailing) {
                startTimer(w);
            }
            else {
                clearState();
            }
            return lastResult;
        }
        if (maxWait !== undefined && isInvoking) {
            if (trailing)
                startTimer(w);
            return invoke();
        }
        return lastResult;
    };
    debounced.cancel = () => {
        stopTimer();
        clearState();
        lastCallTime = 0;
        lastInvokeTime = 0;
        lastResult = undefined;
    };
    debounced.flush = () => {
        if (!timer)
            return lastResult;
        stopTimer();
        return trailing ? invoke() : lastResult;
    };
    debounced.pending = () => !!timer;
    return debounced;
}
export function throttle(fn, wait = 0, options) {
    const leading = options?.leading !== false;
    const trailing = options?.trailing !== false;
    return debounce(fn, wait, { leading, trailing, maxWait: toIntNonNeg(wait) });
}
export function memoize(fn, keyResolver, options) {
    const cache = new Map();
    const maxSize = options?.maxSize === undefined ? 0 : toIntNonNeg(options.maxSize);
    const memoized = function (...args) {
        const key = keyResolver ? keyResolver(...args) : args[0];
        if (cache.has(key)) {
            if (maxSize > 0)
                lruTouch(cache, key);
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        if (maxSize > 0)
            lruTrim(cache, maxSize);
        return result;
    };
    memoized.cache = cache;
    memoized.clear = () => cache.clear();
    memoized.delete = (key) => cache.delete(key);
    return memoized;
}
export function memoizeAsync(fn, keyResolver, options) {
    const cache = new Map();
    const maxSize = options?.maxSize === undefined ? 0 : toIntNonNeg(options.maxSize);
    const memoized = function (...args) {
        const key = keyResolver ? keyResolver(...args) : args[0];
        const cached = cache.get(key);
        if (cached) {
            if (maxSize > 0)
                lruTouch(cache, key);
            return cached;
        }
        const p = fn.apply(this, args);
        cache.set(key, p);
        if (maxSize > 0)
            lruTrim(cache, maxSize);
        p.catch(() => {
            if (cache.get(key) === p)
                cache.delete(key);
        });
        return p;
    };
    memoized.cache = cache;
    memoized.clear = () => cache.clear();
    memoized.delete = (key) => cache.delete(key);
    return memoized;
}
export function pipe(...fns) {
    if (fns.length === 0)
        return (x) => x;
    return (x) => fns.reduce((v, fn) => fn(v), x);
}
export function compose(...fns) {
    if (fns.length === 0)
        return (x) => x;
    return (x) => fns.reduceRight((v, fn) => fn(v), x);
}
