type UnknownString = string | null | undefined

type SegmentItem = { segment: string }
type SegmenterLike = { segment: (input: string) => Iterable<SegmentItem> }

const HAS_SEGMENTER =
    typeof Intl !== "undefined" && typeof (Intl as any).Segmenter === "function"

const HAS_COLLATOR =
    typeof Intl !== "undefined" && typeof Intl.Collator === "function"

const SEGMENTER_CACHE_MAX = 16
const segmenterCache = new Map<string, SegmenterLike>()

const COLLATOR_CACHE_MAX = 16
const collatorCache = new Map<string, Intl.Collator>()

function getSegmenter(locale: string): SegmenterLike | null {
    if (!HAS_SEGMENTER) return null

    const existing = segmenterCache.get(locale)
    if (existing) {
        segmenterCache.delete(locale)
        segmenterCache.set(locale, existing)
        return existing
    }

    const s = new (Intl as any).Segmenter(locale, { granularity: "grapheme" }) as SegmenterLike
    segmenterCache.set(locale, s)

    if (segmenterCache.size > SEGMENTER_CACHE_MAX) {
        const k = segmenterCache.keys().next().value as string | undefined
        if (k) segmenterCache.delete(k)
    }

    return s
}

function getCollator(
    locale: string,
    sensitivity: Intl.CollatorOptions["sensitivity"]
): Intl.Collator | null {
    if (!HAS_COLLATOR) return null

    const key = `${locale}|${sensitivity ?? "base"}`
    const existing = collatorCache.get(key)

    if (existing) {
        collatorCache.delete(key)
        collatorCache.set(key, existing)
        return existing
    }

    const c = new Intl.Collator(locale, {
        sensitivity: sensitivity ?? "base",
        usage: "sort"
    })

    collatorCache.set(key, c)

    if (collatorCache.size > COLLATOR_CACHE_MAX) {
        const k = collatorCache.keys().next().value as string | undefined
        if (k) collatorCache.delete(k)
    }

    return c
}

function toStringSafe(v: unknown): string {
    if (v === null || v === undefined) return ""
    return String(v)
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.length > 0
}

function splitGraphemes(input: string, locale: string): string[] {
    const seg = getSegmenter(locale)
    if (!seg) return Array.from(input)
    return Array.from(seg.segment(input), (x) => x.segment)
}

let HAS_UNICODE_PROPS = true
try {
    new RegExp("\\p{L}", "u")
} catch {
    HAS_UNICODE_PROPS = false
}

const reKeepLettersNumbers = HAS_UNICODE_PROPS
    ? /[^\p{L}\p{N}]/gu
    : /[^a-zA-Z0-9]/g

const reSlugStrip = HAS_UNICODE_PROPS
    ? /[^\p{L}\p{N}\s-]/gu
    : /[^a-z0-9\s-]/g

export const translitBase: Record<string, string> = {
    "ə": "e", "Ə": "e",
    "ı": "i", "İ": "i",
    "ş": "s", "Ş": "s",
    "ğ": "g", "Ğ": "g",
    "ç": "c", "Ç": "c",
    "ö": "o", "Ö": "o",
    "ü": "u", "Ü": "u",
    "ñ": "n", "Ñ": "n"
}

export function extendTransliteration(map: Record<string, string>): void {
    for (const k in map) translitBase[k] = map[k]
}

function transliterate(input: string): string {
    let out = ""
    for (const ch of input) out += translitBase[ch] ?? ch
    return out
}

function foldCase(input: string, locale: string): string {
    return input.toLocaleLowerCase(locale).normalize("NFKC")
}

export function capitalize(input: UnknownString, locale: string = "en-US"): string {
    if (!isNonEmptyString(input)) return ""
    const g = splitGraphemes(input, locale)
    if (g.length === 0) return ""
    return g[0].toLocaleUpperCase(locale) + g.slice(1).join("")
}

export function capitalizeWords(input: UnknownString, locale: string = "en-US"): string {
    if (!isNonEmptyString(input)) return ""
    return input.trim().split(/\s+/).map(w => capitalize(w, locale)).join(" ")
}

export function lower(input: UnknownString, locale: string = "en-US"): string {
    return toStringSafe(input).toLocaleLowerCase(locale)
}

export function upper(input: UnknownString, locale: string = "en-US"): string {
    return toStringSafe(input).toLocaleUpperCase(locale)
}

export function trim(input: UnknownString): string {
    return toStringSafe(input).trim()
}

export function normalizeSpaces(input: UnknownString): string {
    return toStringSafe(input).replace(/\s+/g, " ").trim()
}

export function truncate(
    input: UnknownString,
    length: number,
    suffix: string = "…",
    locale: string = "en-US"
): string {
    const str = toStringSafe(input)
    if (length <= 0) return ""
    const g = splitGraphemes(str, locale)
    if (g.length <= length) return str
    return g.slice(0, length).join("") + suffix
}

export function startsWithIgnoreCase(input: UnknownString, search: string, locale: string = "en-US"): boolean {
    if (!isNonEmptyString(search)) return false
    return foldCase(toStringSafe(input), locale).startsWith(foldCase(search, locale))
}

export function endsWithIgnoreCase(input: UnknownString, search: string, locale: string = "en-US"): boolean {
    if (!isNonEmptyString(search)) return false
    return foldCase(toStringSafe(input), locale).endsWith(foldCase(search, locale))
}

export function includesIgnoreCase(input: UnknownString, search: string, locale: string = "en-US"): boolean {
    if (!isNonEmptyString(search)) return false
    return foldCase(toStringSafe(input), locale).includes(foldCase(search, locale))
}

export function removeNonAlphaNumeric(input: UnknownString): string {
    return toStringSafe(input).replace(reKeepLettersNumbers, "")
}

export function slugify(input: UnknownString, locale: string = "en-US", maxLength: number = 0): string {
    let s = normalizeSpaces(input)
    if (!s) return ""
    s = transliterate(s)
        .toLocaleLowerCase(locale)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(reSlugStrip, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")

    if (maxLength > 0 && s.length > maxLength) {
        s = s.slice(0, maxLength).replace(/-+$/g, "")
    }

    return s
}

export function repeat(input: UnknownString, times: number): string {
    if (times <= 0) return ""
    return toStringSafe(input).repeat(times)
}

export function padLeft(input: UnknownString, length: number, pad: string = " "): string {
    const str = toStringSafe(input)
    if (str.length >= length) return str
    const p = pad.length ? pad : " "
    const need = length - str.length
    return p.repeat(Math.ceil(need / p.length)).slice(0, need) + str
}

export function padRight(input: UnknownString, length: number, pad: string = " "): string {
    const str = toStringSafe(input)
    if (str.length >= length) return str
    const p = pad.length ? pad : " "
    const need = length - str.length
    return str + p.repeat(Math.ceil(need / p.length)).slice(0, need)
}

export function reverse(input: UnknownString, locale: string = "en-US"): string {
    return splitGraphemes(toStringSafe(input), locale).reverse().join("")
}

export function isEmptyString(input: UnknownString): boolean {
    return toStringSafe(input).length === 0
}

export function equalsIgnoreCase(a: UnknownString, b: UnknownString, locale: string = "en-US"): boolean {
    return foldCase(toStringSafe(a), locale) === foldCase(toStringSafe(b), locale)
}

export function extractInitials(input: UnknownString, locale: string = "en-US"): string {
    if (!isNonEmptyString(input)) return ""
    return input.trim().split(/\s+/)
        .map(w => splitGraphemes(w, locale)[0] || "")
        .map(ch => (ch ? ch.toLocaleUpperCase(locale) : ""))
        .join("")
}

export function safeSubstring(input: UnknownString, start: number, end?: number, locale: string = "en-US"): string {
    const g = splitGraphemes(toStringSafe(input), locale)
    const s = Math.max(0, start)
    const e = end === undefined ? g.length : Math.max(s, end)
    return g.slice(s, e).join("")
}

export function removeDiacritics(input: UnknownString): string {
    return toStringSafe(input).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
}

export function ensurePrefix(input: UnknownString, prefix: string): string {
    const str = toStringSafe(input)
    return str.startsWith(prefix) ? str : prefix + str
}

export function ensureSuffix(input: UnknownString, suffix: string): string {
    const str = toStringSafe(input)
    return str.endsWith(suffix) ? str : str + suffix
}

export function compareLocale(
    a: UnknownString,
    b: UnknownString,
    locale: string = "en-US",
    sensitivity: Intl.CollatorOptions["sensitivity"] = "base"
): number {
    const c = getCollator(locale, sensitivity)
    if (c) return c.compare(toStringSafe(a), toStringSafe(b))
    return toStringSafe(a).localeCompare(toStringSafe(b), locale, { sensitivity })
}

export function count(input: UnknownString, needle: string, locale: string = "en-US"): number {
    if (!isNonEmptyString(needle)) return 0
    const hay = foldCase(toStringSafe(input), locale)
    const ndl = foldCase(needle, locale)
    let i = 0
    let c = 0
    while ((i = hay.indexOf(ndl, i)) !== -1) {
        c++
        i += ndl.length
    }
    return c
}
