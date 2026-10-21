export const clamp = (x, low = 0, high = 1) => Math.max(low, Math.min(high, x))
export function seedNumber(value) { let h = 2166136261; for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
export function randomFactory(seed) { let s = seed || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
