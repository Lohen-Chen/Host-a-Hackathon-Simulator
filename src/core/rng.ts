// Seeded RNG (mulberry32). The state lives in GameState.rngState so a saved game
// and a `?seed=` run replay identically. No Math.random in /core.

export interface RngHolder { rngState: number }

export function seedState(seed: number): number {
  // Scramble the seed so 1, 2, 3 don't produce correlated first draws.
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}

export function rand(s: RngHolder): number {
  let t = (s.rngState = (s.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const rngFn = (s: RngHolder) => () => rand(s);

export function randInt(s: RngHolder, lo: number, hi: number): number {
  return lo + Math.floor(rand(s) * (hi - lo + 1));
}

export function randRange(s: RngHolder, lo: number, hi: number): number {
  return lo + rand(s) * (hi - lo);
}

export function chance(s: RngHolder, p: number): boolean {
  return rand(s) < p;
}

export function pick<T>(s: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(rand(s) * arr.length)];
}

export function weighted<T>(s: RngHolder, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + Math.max(0, weight(t)), 0);
  let r = rand(s) * total;
  for (const t of items) {
    r -= Math.max(0, weight(t));
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

export function normal(s: RngHolder, mu: number, sd: number): number {
  const u = Math.max(1e-9, rand(s));
  const v = rand(s);
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function shuffle<T>(s: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
