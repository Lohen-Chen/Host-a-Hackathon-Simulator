// Confirming hackers: interest is free, attendance is not. Paying covers each hacker's
// food, swag and (with the node) travel. Tech raises the interested pool; money converts it.
import { T } from './config';
import { fx, hasTech, log } from './helpers';
import type { GameState } from './types';

export function confirmCost(s: GameState): number {
  return T.confirmCost + (hasTech(s, 'travel') ? 2 : 0) + (hasTech(s, 'swag') ? 2 : 0);
}

/** Interested hackers not yet confirmed. */
export function unconfirmed(s: GameState): number {
  return Math.max(0, Math.floor(s.signups - s.confirmed));
}

/** How many the next tap would confirm (a full batch, or whatever is left / affordable). */
export function confirmBatch(s: GameState): number {
  return Math.max(0, Math.min(T.confirmBatch, unconfirmed(s), Math.floor(s.budget / confirmCost(s))));
}

export function canConfirm(s: GameState): boolean {
  return (s.phase === 'live' || s.phase === 'morning' || s.phase === 'night') && confirmBatch(s) > 0;
}

export function confirmHackers(s: GameState): number {
  if (!canConfirm(s)) return 0;
  const n = confirmBatch(s);
  const cost = n * confirmCost(s);
  s.budget -= cost;
  s.confirmed += n;
  fx(s, { kind: 'pop', text: `+${n} confirmed`, tone: 'good' });
  fx(s, { kind: 'sfx', sfx: 'cash' });
  log(s, 'confirm', String(n), cost);
  if (s.tutorialStep === 2) s.tutorialStep = 3;
  return n;
}
