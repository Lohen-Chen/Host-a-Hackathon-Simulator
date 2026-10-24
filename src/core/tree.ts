// Tree University, the live rival (Section 6.10).
import { TREE_CATCHUP, TREE_MOVES, type TreeMoveDef } from '../content/treeMoves';
import { T } from './config';
import { addTicker, chargesLeft, fx, log } from './helpers';
import { fill, regionName } from './jokes';
import { treeImpulse } from './map';
import { chance, pick, randRange } from './rng';
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
  if (s.day >= 2 && s.signups - s.treeSignups > T.rubberBand) out.push({ at: D * randRange(s, 0.72, 0.85), kind: 'treeMove', data: 'catchup' });
  if (s.treeNextRevealed || s.members.some((m) => m.trait === 'mole')) {
    if (move) addTicker(s, 'TREE TIMES', `INTEL: Tree plans "${move.name}" today. Have a counter ready.`);
    s.treeNextRevealed = false;
  }
  // Ex-Tree Mole: 10% a day to leak your plans back.
  if (s.members.some((m) => m.trait === 'mole') && chance(s, 0.1)) {
    s.treeHype += 3;
    addTicker(s, 'TREE TIMES', 'LEAK: Tree University obtained the Bear U group chat. It is mostly pizza polls.');
  }
  return out;
}

export function revealNextMove(s: GameState) {
  const next = TREE_MOVES.find((m) => m.day === s.day + 1) ?? TREE_MOVES.find((m) => m.day === s.day);
  if (next) addTicker(s, 'TREE TIMES', `INTEL: spy says Tree's next move is "${next.name}."`);
  s.treeNextRevealed = true;
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
  const text = fill(s, def.text);
  s.treeMove = {
    uid: ++s.uid,
    moveId: id,
    name: def.name,
    text,
    regionId: targets[0],
    targets,
    impulse: def.impulse,
    global: !!def.global,
    treeHype: def.treeHype,
    remaining: T.treeWindow * (s.settings.relaxed ? 2 : 1),
    mult: 1,
    responded: 'none',
  };
  if (id === 'aggro') s.flags.treeAggro = 1;
  addTicker(s, 'TREE TIMES', `TREE MOVE: ${def.name} in ${regionName(s, targets[0])}`);
  fx(s, { kind: 'sfx', sfx: 'siren' });
  s.lastInteractiveAt = s.t;
}

export type TreeResponse = 'counter' | 'clapback' | 'ignore';

export function canRespond(s: GameState, r: TreeResponse): boolean {
  if (!s.treeMove || s.treeMove.responded !== 'none') return false;
  if (r === 'counter') return s.budget >= T.counterCost;
  if (r === 'clapback') return chargesLeft(s) > 0;
  return true;
}

export function respondTreeMove(s: GameState, r: TreeResponse) {
  const m = s.treeMove;
  if (!m || !canRespond(s, r)) return;
  m.responded = r;
  if (r === 'counter') {
    s.budget -= T.counterCost;
    m.mult = 0.5;
    fx(s, { kind: 'toast', text: pick(s, COUNTER_LINES), tone: 'good' });
    if (m.moveId === 'aggro') s.flags.treeAggro = 0.5;
  } else if (r === 'clapback') {
    s.chargesUsed++;
    const k = s.members.some((x) => x.trait === 'replyguy') ? 1.5 : 1;
    s.treeHype = Math.max(0, s.treeHype - 6 * k);
    m.mult = 0.75;
    fx(s, { kind: 'toast', text: pick(s, CLAPBACK_LINES), tone: 'good' });
  } else {
    fx(s, { kind: 'toast', text: 'Ignored. Bold. Tree is posting about how you "had no response."', tone: 'neutral' });
  }
  fx(s, { kind: 'sfx', sfx: 'tap' });
  landTreeMove(s);
}

export function tickTreeMove(s: GameState, dt: number) {
  const m = s.treeMove;
  if (!m) return;
  m.remaining -= dt;
  if (m.remaining <= 0) landTreeMove(s);
}

function landTreeMove(s: GameState) {
  const m = s.treeMove;
  if (!m) return;
  for (const id of m.targets) {
    treeImpulse(s, id, m.impulse * m.mult, m.global ? 0.2 : T.spillFactor);
    fx(s, { kind: 'pulse', regionId: id, tone: 'bad' });
  }
  s.treeHype = Math.min(100, s.treeHype + m.treeHype * m.mult);
  log(s, 'treeMove', `${m.name}:${m.responded}`, m.mult);
  s.treeMove = null;
}

const COUNTER_LINES = [
  'Counter-programming: you booked a bigger puppy. Impulse halved.',
  'You scheduled "Free Pizza Hour" at the same time. Tree is furious.',
  'Counter-programmed with a better meme. Tree\'s move landed at half strength.',
];
const CLAPBACK_LINES = [
  'Clapback posted: "ok but where\'s your WiFi password, Tree." Devastating.',
  'Clapback: "Synergy isn\'t a personality, Chad." 4,000 likes.',
  'Clapback landed. Tree University has turned off replies.',
];
