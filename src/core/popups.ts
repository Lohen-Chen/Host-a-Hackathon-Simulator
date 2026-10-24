// Plague Inc-style news popups. Any queued popup pauses the clock until the player taps OK.
// Popups have a daily budget so the world isn't stopping every few seconds: optional news
// beyond it is demoted to the ticker (its gameplay effect still applies).
import { MODES } from './config';
import { addTicker, fx, log } from './helpers';
import type { GameState, Popup, TickerCat } from './types';

export function popupBudget(s: GameState): number {
  return MODES[s.mode].popupsPerDay;
}

/** Scheduled pauses still to come today (Tree moves, decisions, world news, rumors). */
function pendingToday(s: GameState): number {
  return s.schedule.filter((e) => !e.done && (e.kind === 'treeMove' || e.kind === 'alert' || e.kind === 'news')).length;
}

/** Queue a popup. Returns false if it was demoted to the ticker. */
export function showPopup(s: GameState, p: Omit<Popup, 'uid'>, optional: boolean, cat: TickerCat = 'BREAKING'): boolean {
  // Optional news only pauses the world if it leaves room for today's scheduled events.
  if (optional && s.popupsToday + pendingToday(s) >= popupBudget(s)) {
    addTicker(s, cat, p.title + (p.effect ? ` (${p.effect})` : ''));
    log(s, 'popupDemoted', p.title);
    return false;
  }
  s.popups.push({ ...p, uid: ++s.uid });
  s.popupsToday++;
  log(s, 'popup', p.kind);
  if (s.popups.length === 1) fx(s, { kind: 'sfx', sfx: p.kind === 'tree' ? 'siren' : 'alert' });
  return true;
}

export function dismissPopup(s: GameState) {
  s.popups.shift();
  fx(s, { kind: 'sfx', sfx: 'tap' });
}
