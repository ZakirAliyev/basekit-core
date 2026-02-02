import { deepClone, isEmpty, merge } from "./index"

// deepClone
const original = { a: 1, b: { c: 2 } }
const cloned = deepClone(original)

cloned.b.c = 99

console.log(original.b.c) // 2
console.log(cloned.b.c)   // 99

// isEmpty
console.log(isEmpty([]))         // true
console.log(isEmpty({}))         // true
console.log(isEmpty(""))         // true
console.log(isEmpty(null))       // true
console.log(isEmpty({ a: 1 }))   // false

// merge
const merged = merge(
    { a: 1, b: { c: 2 } },
    { b: { d: 3 } }
)

console.log(merged)
