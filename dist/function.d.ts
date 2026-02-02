export type AnyFn = (...args: any[]) => any;
export declare function noop(): void;
export declare function identity<T>(x: T): T;
export declare function once<T extends AnyFn>(fn: T): T;
export declare function onceAsync<T extends (...args: any[]) => Promise<any>>(fn: T): T;
export declare function delay(ms: number): Promise<void>;
export declare function defer(fn: AnyFn): void;
export declare function tryCatch<T extends AnyFn>(fn: T, onError?: (err: unknown) => void): (...args: Parameters<T>) => ReturnType<T> | undefined;
export type Debounced<T extends AnyFn> = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
    pending: () => boolean;
};
export declare function debounce<T extends AnyFn>(fn: T, wait?: number, options?: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
}): Debounced<T>;
export type Throttled<T extends AnyFn> = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
    pending: () => boolean;
};
export declare function throttle<T extends AnyFn>(fn: T, wait?: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): Throttled<T>;
type MemoOpts = {
    maxSize?: number;
};
export declare function memoize<T extends AnyFn>(fn: T, keyResolver?: (...args: Parameters<T>) => string | number, options?: MemoOpts): T & {
    cache: Map<string | number, ReturnType<T>>;
    clear: () => void;
    delete: (key: string | number) => boolean;
};
export declare function memoizeAsync<T extends (...args: any[]) => Promise<any>>(fn: T, keyResolver?: (...args: Parameters<T>) => string | number, options?: MemoOpts): T & {
    cache: Map<string | number, ReturnType<T>>;
    clear: () => void;
    delete: (key: string | number) => boolean;
};
export declare function pipe(): (x: any) => any;
export declare function pipe<T1, T2>(a: (x: T1) => T2): (x: T1) => T2;
export declare function pipe<T1, T2, T3>(a: (x: T1) => T2, b: (x: T2) => T3): (x: T1) => T3;
export declare function pipe<T1, T2, T3, T4>(a: (x: T1) => T2, b: (x: T2) => T3, c: (x: T3) => T4): (x: T1) => T4;
export declare function compose(): (x: any) => any;
export declare function compose<T1, T2>(a: (x: T1) => T2): (x: T1) => T2;
export declare function compose<T1, T2, T3>(a: (x: T2) => T3, b: (x: T1) => T2): (x: T1) => T3;
export declare function compose<T1, T2, T3, T4>(a: (x: T3) => T4, b: (x: T2) => T3, c: (x: T1) => T2): (x: T1) => T4;
export {};
