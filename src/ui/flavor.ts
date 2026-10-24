// UI-only flavor text. Uses Math.random (never the game's seeded RNG), so
// re-renders can't change a seeded run. Results are memoized to avoid flicker.
import { jokeEngine, type GameState } from '../core';
import { needsFor, slotsFor } from '../core/jokes';

const cache = new Map<string, string>();

export function flavor(s: GameState, key: string, memo: string, fallback = ''): string {
  const k = `${s.seed}:${memo}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const out = jokeEngine()?.pick(key, { rng: Math.random, slots: slotsFor(s), needs: needsFor(s) }) ?? fallback;
  cache.set(k, out);
  return out;
}
