// The clock and the daily state machine (Section 4). advance() is the only
// thing that moves time; it never touches the DOM, so it runs headless in Node.
import { DAYS, STEPS_PER_DAY, T } from './config';
import { startAuction } from './auction';
import { resolveAlert, scheduleDay, tickEvents } from './events';
import { addTicker, effectiveSkill, fx, hasTech } from './helpers';
import { joke, treeRegionCount } from './jokes';
import { stepMap } from './map';
import { crewNight } from './crew';
import { startHackday } from './hackday';
import { prepareMorning } from './state';
import type { GameState } from './types';

/** The world pauses for courting, decision alerts and news popups (Plague Inc style). */
export function isClockRunning(s: GameState): boolean {
  return s.phase === 'live' && !s.courting && !s.alertQueue.length && !s.popups.length;
}

/** Leave the intro and enter Day 1's morning. */
export function beginGame(s: GameState) {
  if (s.phase !== 'intro') return;
  prepareMorning(s);
  addTicker(s, 'TREE TIMES', joke(s, 'tease'));
}

export function startLiveDay(s: GameState) {
  if (s.phase !== 'morning') return;
  s.phase = 'live';
  s.t = 0;
  s.step = 0;
  s.tickerT = 0;
  s.popupsToday = 0;
  s.treeHype = Math.min(100, s.treeHype + T.treeHypeDaily);
  s.treeOrg = Math.min(100, s.treeOrg + T.treeOrgDaily);
  s.treeTalent = Math.min(100, s.treeTalent + T.treeTalentDaily);
  s.flags.treeHypeStart = s.treeHype;
  s.flags.treeOrgStart = s.treeOrg;
  s.flags.treeTalentStart = s.treeTalent;
  s.dayStart = { signups: s.signups, confirmed: s.confirmed, budget: s.budget, rep: s.reputation, treeRegions: treeRegionCount(s), treeSignups: s.treeSignups, tp: s.techPoints };
  scheduleDay(s);
  addTicker(s, 'BEAR BEAT', joke(s, 'headline|bear'));
}

/** Advance real time by dt seconds (sim time). Steps happen on 1/20-day boundaries. */
export function advance(s: GameState, dt: number) {
  if (!isClockRunning(s)) return;
  const end = Math.min(s.t + dt, s.daySec);
  // Process in small slices so bubble TTLs and alert timers stay accurate.
  while (s.t < end - 1e-9 && isClockRunning(s)) {
    const slice = Math.min(0.25, end - s.t);
    s.t += slice;
    tickEvents(s, slice);
    while (s.step < STEPS_PER_DAY && s.t >= (s.step + 1) * s.stepSec - 1e-9) {
      s.step++;
      doStep(s);
    }
  }
  if (s.t >= s.daySec - 1e-9 && isClockRunning(s)) endLiveDay(s, false);
}

/** One of the 20 steps of a day: continuous member output + map spread. */
export function doStep(s: GameState) {
  s.tpAcc += T.baseTpPerDay / STEPS_PER_DAY;
  for (const m of s.members) {
    if (!m.task) continue;
    if (m.burnout) m.burnoutWorked = true;
    const k = effectiveSkill(s, m);
    if (m.idleSteps > 0) { m.idleSteps--; continue; }
    if (k <= 0) continue;
    switch (m.task) {
      case 'research': {
        const tp = (m.role === 'organizer' ? k * T.researchRate : T.nonOrganizerResearch * Math.min(1, k)) / STEPS_PER_DAY;
        s.tpAcc += tp;
        break;
      }
      case 'website':
        if (hasTech(s, 'website') && s.siteDownSteps <= 0) s.websiteScore = Math.min(100, s.websiteScore + (k * 3) / STEPS_PER_DAY);
        break;
      case 'venue':
        if (!s.venue) s.scoutPoints += k / STEPS_PER_DAY;
        else {
          s.venueScore += k / STEPS_PER_DAY;
          if (m.role === 'designer') s.ambienceBonus += (k * 0.5) / STEPS_PER_DAY;
          else s.operations += k / STEPS_PER_DAY;
        }
        break;
      case 'recruit':
        s.flags.recruitPts = Number(s.flags.recruitPts ?? 0) + (m.role === 'recruiter' ? k : k * 0.5) / STEPS_PER_DAY;
        break;
      default: break; // social and sponsors are read live (post bubbles, virality, invite chance)
    }
  }
  if (s.tpAcc >= 1) {
    const whole = Math.floor(s.tpAcc);
    s.tpAcc -= whole;
    s.techPoints += whole;
    fx(s, { kind: 'pop', text: `+${whole} TP`, tone: 'good' });
  }
  if (s.siteDownSteps > 0) s.siteDownSteps--;
  stepMap(s);
}

/** End Day: early (button, +1 TP) or when the clock runs out. */
export function endLiveDay(s: GameState, early: boolean) {
  if (s.phase !== 'live') return;
  if (s.courting) return;
  if (early) {
    s.techPoints += T.endDayBonusTp;
    while (s.step < STEPS_PER_DAY) { s.step++; doStep(s); }
  }
  // Nothing is left hanging: open alerts take their default, unread news is dismissed.
  let guard = 0;
  while (s.alertQueue.length && guard++ < 20) resolveAlert(s, s.alertQueue[0].defaultChoice, true);
  s.popups = [];
  for (const b of s.bubbles) if (b.type === 'bsod') s.flags.bsod = 'haunted';
  s.bubbles = [];
  s.schedule = [];
  buildRecap(s);
  s.recap.splice(s.recap.length - (s.day < DAYS ? 2 : 1), 0, ...crewNight(s));
  // The venue auction is the night after Balantir's call.
  if (s.day === T.balantirDay && !s.venue) startAuction(s);
  else s.phase = 'night';
}

/** Called when the auction scene is finished. */
export function finishAuction(s: GameState) {
  if (s.phase !== 'auction' || s.auction?.phase !== 'done') return;
  s.phase = 'night';
  if (s.venue) s.recap.push(`Venue: ${s.venue === 'lawn' ? 'The Lawn (fallback). Sprinklers at 3 AM.' : 'secured!'}`);
}

function buildRecap(s: GameState) {
  const d = s.dayStart;
  const dSign = Math.round(s.signups - d.signups);
  const dBudget = Math.round(s.budget - d.budget);
  const tr = treeRegionCount(s);
  s.recap = [
    `Interested ${dSign >= 0 ? '+' : ''}${dSign.toLocaleString('en-US')} (now ${Math.round(s.signups).toLocaleString('en-US')} vs Tree ${Math.round(s.treeSignups).toLocaleString('en-US')})`,
    `Confirmed ${Math.round(s.confirmed).toLocaleString('en-US')}${s.confirmed > d.confirmed ? ` (+${Math.round(s.confirmed - d.confirmed).toLocaleString('en-US')} today)` : ''}`,
    `Budget ${dBudget >= 0 ? '+' : '−'}$${Math.abs(dBudget).toLocaleString('en-US')} · TP ${s.techPoints} · Rep ${Math.round(s.reputation)}`,
    `Tree controls ${tr}/8 regions${tr > d.treeRegions ? ' (up!)' : tr < d.treeRegions ? ' (down!)' : ''}`,
    joke(s, 'recap'),
  ];
  if (s.day < DAYS) s.recap.push(`Tomorrow: ${joke(s, 'tease')}`);
}

/** Night recap → next morning, or Hackathon Day after Day 7. */
export function nextDay(s: GameState) {
  if (s.phase !== 'night') return;
  if (s.day >= DAYS) {
    startHackday(s);
    return;
  }
  s.day++;
  prepareMorning(s);
}
