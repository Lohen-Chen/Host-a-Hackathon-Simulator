// Save/load. The state is plain JSON; transient fx are dropped.
import type { GameState } from './types';

export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, fx: [] });
}

export function deserialize(json: string): GameState | null {
  try {
    const s = JSON.parse(json) as GameState;
    if (!s || s.version !== 1 || !Array.isArray(s.regions)) return null;
    s.fx = [];
    return s;
  } catch {
    return null;
  }
}
