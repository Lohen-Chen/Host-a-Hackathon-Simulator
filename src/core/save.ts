// Save/load. The state is plain JSON; transient fx are dropped.
import type { GameState } from './types';

export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, fx: [] });
}

export function deserialize(json: string): GameState | null {
  try {
    const s = JSON.parse(json) as GameState;
    if (!s || s.version !== 4 || !Array.isArray(s.regions)) return null;
    s.fx = [];
    // Saves from before Tree had Organization and Talent.
    s.treeOrg ??= 50;
    s.treeTalent ??= 55;
    return s;
  } catch {
    return null;
  }
}
