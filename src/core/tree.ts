// Tree University, the live rival (Section 6.10). Tree moves are Plague Inc-style news:
// they pause the world with a popup and land immediately. There is no quick-time response;
// the counterplay is out-hyping them (and the Clapback post where Tree leads).
import { TREE_CATCHUP, TREE_MOVES, type TreeMoveDef } from '../content/treeMoves';
import { T } from './config';
import { addTicker, fx, log } from './helpers';
import { fill, regionName } from './jokes';
import { treeImpulse } from './map';
import { showPopup } from './popups';
import { chance, randRange } from './rng';
import type { GameState, RegionId, ScheduledEvent } from './types';
import { queueAlert } from './events';

export function treeMoveDef(id: string): TreeMoveDef {
  return id === 'catchup' ? TREE_CATCHUP : TREE_MOVES.find((m) => m.id === id)!;
}

export function scheduleTreeMoves(s: GameState): ScheduledEvent[] {
  const out: ScheduledEvent[] = [];
  const D = s.daySec;
  const move = TREE_MOVES.find((m) => m.day === s.day);
  if (move) out.push({ at: D * randRange(s, 0.35, 0.6), kind: 'treeMove', data: move.id });
  // Rubber-banding: a big Bear lead buys Tree a catch-up move.
  else if (s.day >= 2 && s.signups - s.treeSignups > T.rubberBand) out.push({ at: D * randRange(s, 0.5, 0.8), kind: 'treeMove', data: 'catchup' });
  if (s.treeNextRevealed || s.members.some((m) => m.trait === 'mole')) {
    if (move) addTicker(s, 'TREE TIMES', `INTEL: Tree plans "${move.name}" today.`);
    s.treeNextRevealed = false;
  }
  // Ex-Tree Mole: 10% a day to leak your plans back.
  if (s.members.some((m) => m.trait === 'mole') && chance(s, 0.1)) {
    s.treeHype += 3;
    addTicker(s, 'TREE TIMES', 'LEAK: Tree University obtained the Bear U group chat. It is mostly pizza polls.');
  }
  return out;
}

export function startTreeMove(s: GameState, id: string) {
  const def = treeMoveDef(id);
  let targets: RegionId[] = def.targets;
  if (id === 'catchup') targets = [...s.regions].sort((a, b) => b.bear - a.bear).slice(0, 2).map((r) => r.id);
  // D2: poaching becomes an alert if you have (or are courting) a sponsor.
  if (id === 'poach' && (s.sponsors.length || s.courting)) queueAlert(s, 'rival_poach');
  // D7: stumble or surge.
  if (id === 'surge' && chance(s, 0.5)) {
    s.treeHype = Math.max(0, s.treeHype - 10);
    addTicker(s, 'TREE TIMES', 'Tree University stumbles on the final day: livestream audio was just "synergy" on loop');
    queueAlert(s, 'tree_stumble');
    log(s, 'treeStumble', 'Tree stumbled');
    return;
  }
  for (const r of targets) {
    treeImpulse(s, r, def.impulse, def.global ? 0.2 : T.spillFactor);
    fx(s, { kind: 'pulse', regionId: r, tone: 'bad' });
  }
  s.treeHype = Math.min(100, s.treeHype + def.treeHype);
  const where = def.global ? 'everywhere' : targets.map((r) => regionName(s, r)).join(' and ');
  showPopup(s, {
    kind: 'tree', icon: '🌲', title: `Tree University: ${def.name}`, body: fill(s, def.text),
    effect: `Tree hype grows in ${where}`, regionId: targets[0],
  }, false, 'TREE TIMES');
  log(s, 'treeMove', def.name);
}
