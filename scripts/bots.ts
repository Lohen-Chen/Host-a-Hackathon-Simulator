// Headless bots that play full games on the pure core (Section 13).
import { ALERT_BY_ID } from '../src/content/alerts';
import type { Effects, Outcome } from '../src/core/effects';
import { ROLE_INFO } from '../src/content/members';
import { VIBE_SCORES } from '../src/content/sponsors';
import { TECH } from '../src/content/techTree';
import { VENUE_BY_ID } from '../src/content/venues';
import {
  advance, assign, beginGame, buyTech, canConfirm, confirmBatch, confirmCost, confirmHackers, courtingReply,
  dismissPopup, endLiveDay, finishAuction, finishCourting, hackdaySkip, hire, newGame, nextDay, resolveAlert,
  startLiveDay, tapBubble, techState, tickAuction, type GameState, type Mode, type Task, type TechId,
} from '../src/core';
import { rand } from '../src/core/rng';
import { T } from '../src/core/config';

export type Style = 'random' | 'money' | 'hype' | 'balanced' | 'perfect';
export interface BotCfg { style: Style; bubbleRate: number; alertRate: number }
export interface RunResult { state: GameState; stuck: boolean; ticks: number; reason?: string }

const TECH_ORDER: Record<Exclude<Style, 'random'>, TechId[]> = {
  balanced: ['website', 'applications', 'clubfair', 'coordinator', 'design', 'reelposts', 'discord', 'travel', 'training2', 'logistics', 'snack', 'ugc', 'swag', 'highsignal', 'promo', 'rep2', 'hackad', 'mentors', 'reminders', 'aicredits', 'prestige1', 'influencers', 'runofshow', 'resumebook', 'ericou', 'sfbus', 'olympiad', 'workshops', 'poker', 'training3', 'prestige2', 'ricklee', 'leetcode', 'prestige3', 'nepolist', 'rep3', 'mixer', 'hwlab', 'waitlist'],
  perfect: ['applications', 'website', 'clubfair', 'coordinator', 'discord', 'travel', 'reelposts', 'training2', 'logistics', 'snack', 'design', 'highsignal', 'ugc', 'swag', 'reminders', 'hackad', 'mentors', 'aicredits', 'promo', 'influencers', 'runofshow', 'resumebook', 'ericou', 'rep2', 'olympiad', 'workshops', 'sfbus', 'prestige1', 'ricklee', 'training3', 'poker', 'prestige2', 'leetcode', 'prestige3', 'nepolist', 'rep3', 'mixer', 'hwlab', 'waitlist'],
  hype: ['website', 'reelposts', 'ugc', 'promo', 'influencers', 'ericou', 'sfbus', 'ricklee', 'discord', 'hackad', 'poker', 'applications', 'clubfair', 'training2', 'design', 'logistics', 'snack', 'coordinator', 'travel', 'swag', 'aicredits', 'reminders', 'rep2', 'mentors', 'highsignal', 'prestige1', 'prestige2', 'runofshow', 'olympiad', 'workshops', 'resumebook', 'prestige3', 'nepolist', 'training3', 'leetcode', 'rep3', 'waitlist', 'mixer', 'hwlab'],
  money: ['clubfair', 'coordinator', 'applications', 'rep2', 'resumebook', 'logistics', 'snack', 'website', 'discord', 'poker', 'reminders', 'design', 'training2', 'prestige1', 'prestige2', 'highsignal', 'promo', 'reelposts', 'travel', 'swag', 'hackad', 'ugc', 'aicredits', 'mentors', 'influencers', 'runofshow', 'olympiad', 'workshops', 'sfbus', 'ericou', 'prestige3', 'nepolist', 'training3', 'ricklee', 'leetcode', 'rep3', 'mixer', 'hwlab', 'waitlist'],
};

/** Bot-local RNG so bot decisions never consume the game's seeded stream. */
class BotRng {
  constructor(private st: { rngState: number }) {}
  next() { return rand(this.st); }
  pick<T>(a: T[]): T { return a[Math.floor(this.next() * a.length)]; }
}

function evalEffects(e: Effects | undefined, style: Style): number {
  if (!e) return 0;
  const money = style === 'money' ? 3 : 1;
  const hype = style === 'hype' ? 2 : 1;
  return (e.budget ?? 0) / 1000 * money + (e.rep ?? 0) * 0.4 + (e.signups ?? 0) * 0.06 * hype + (e.mood ?? 0) * 1.2
    + (e.tp ?? 0) * 1.5 - (e.treeHype ?? 0) * 0.3 + (e.website ?? 0) * 0.15 + (e.quality ?? 0) * 0.6 + (e.sponsorMood ?? 0) * 0.15
    + (e.inviteBonus ?? 0) * 10 + ((e.outputMult ?? 1) - 1) * 10 + (e.impulse ? e.impulse.amount * 25 * hype * (e.impulse.target === 'all' ? 3 : 1) : 0)
    - (e.treeImpulse ? e.treeImpulse.amount * 20 : 0) - (e.siteDown ?? 0) * 0.8 - (e.allIdleSteps ?? 0) * 0.5 - (e.memberBenchDays ?? 0) * 2
    - (e.flagAdd?.wifiPain ?? 0) * 1.5 - (e.flagAdd?.equitySold ?? 0) * 0.3;
}

function pickAlertChoice(s: GameState, style: Style, rng: BotRng): number {
  const a = s.alertQueue[0];
  const def = ALERT_BY_ID[a.templateId];
  const enabled = a.choices.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0);
  if (style === 'random') return rng.pick(enabled);
  if (a.templateId === 'sponsor_invite') return 0;
  let best = enabled[0];
  let bestV = -Infinity;
  for (const i of enabled) {
    const c = def.choices[i];
    let v = -(c.cost ?? 0) / 1000 * (style === 'money' ? 3 : 1);
    if (c.out) v += evalEffects(c.out, style);
    if (c.odds) v += c.odds.p * evalEffects(c.odds.win as Outcome, style) + (1 - c.odds.p) * evalEffects(c.odds.lose as Outcome, style);
    if (c.label.includes('Rust')) v -= 1;
    if (v > bestV) { bestV = v; best = i; }
  }
  return best;
}

const ROLE_TASK = (s: GameState, role: keyof typeof ROLE_INFO): Task => {
  if (role === 'designer') return s.unlockedTech.includes('website') && s.websiteScore < 85 ? 'website' : 'venue';
  return ROLE_INFO[role].task;
};

function manageCrew(s: GameState, style: Style, rng: BotRng) {
  const tasks: Task[] = ['research', 'social', 'website', 'venue', 'sponsors', 'recruit'];
  for (const m of s.members) {
    if (style === 'random') {
      if (!m.task || rng.next() < 0.1) assign(s, m.id, rng.pick(tasks.filter((t) => t !== 'website' || s.unlockedTech.includes('website'))));
      continue;
    }
    // Burned out: give them the rest day so they don't quit.
    if (m.burnout) { if (m.task) assign(s, m.id, null); continue; }
    let t = ROLE_TASK(s, m.role);
    // Two-plus organizers: once the tree is mostly bought, put extras on social.
    if (m.role === 'organizer' && s.unlockedTech.length >= 7 && s.members.filter((x) => x.role === 'organizer').indexOf(m) > 0) t = 'venue';
    if (m.task !== t) assign(s, m.id, t);
  }
}

function hireStep(s: GameState, style: Style, rng: BotRng) {
  if (style === 'random') {
    for (let i = s.candidates.length - 1; i >= 0; i--) if (rng.next() < 0.3) hire(s, i);
    return;
  }
  const want = style === 'money' ? 5 : style === 'hype' ? 7 : 7;
  const reserve = style === 'money' ? 12000 : 6000;
  const counts = (r: string) => s.members.filter((m) => m.role === r).length;
  const desire = (r: string) => {
    const c = counts(r);
    switch (r) {
      case 'organizer': return c < 1 ? 3 : c < 2 ? 1.2 : 0;
      case 'social': return c < 2 ? 2.5 : 0.2;
      case 'coordinator': return c < 1 ? 3 : c < 2 ? 1 : 0;
      case 'designer': return c < 1 ? 2 : c < 2 ? 0.8 : 0;
      case 'logistics': return c < 1 ? 1.5 : 0.3;
      case 'recruiter': return c < 1 ? 0.6 : 0;
      default: return 0;
    }
  };
  let guard = 0;
  while (s.members.length < want && s.budget > reserve && guard++ < 6) {
    let bi = -1;
    let bv = 0.9;
    s.candidates.forEach((c, i) => { const v = desire(c.role) * (c.baseSkill / 4); if (v > bv) { bv = v; bi = i; } });
    if (bi < 0) break;
    hire(s, bi);
  }
}

function buyStep(s: GameState, style: Style, rng: BotRng) {
  if (style === 'random') {
    const avail = TECH.filter((t) => techState(s, t.id) === 'available');
    if (avail.length && rng.next() < 0.5) buyTech(s, rng.pick(avail).id);
    return;
  }
  for (const id of TECH_ORDER[style]) {
    const st = techState(s, id);
    if (st === 'available') { buyTech(s, id); return; }
    if (st === 'poor') return; // save up for the next one in order
  }
}

function courtStep(s: GameState, style: Style, rng: BotRng) {
  const c = s.courting!;
  if (c.result) { finishCourting(s); return; }
  let idx = 0;
  const optimal = style === 'perfect' ? 1 : style === 'random' ? 0 : 0.7;
  if (rng.next() < optimal) {
    let bv = -Infinity;
    c.replies.forEach((r, i) => { const v = VIBE_SCORES[c.vibe][r.type] - (r.type === 'bribe' && s.budget < 3000 ? 99 : 0); if (v > bv) { bv = v; idx = i; } });
  } else idx = Math.floor(rng.next() * c.replies.length);
  courtingReply(s, idx);
}

function auctionHold(s: GameState, style: Style, willing: Record<string, number>): boolean {
  const a = s.auction!;
  const vid = a.lots[a.lot];
  if (s.venue) return false;
  const limit = (id: string) => Math.min(s.budget - (style === 'money' ? 4000 : 1500), VENUE_BY_ID[id as keyof typeof VENUE_BY_ID].price * willing[id]);
  if (style !== 'random') {
    // Aim for the biggest remaining lot we expect to afford (Tree folds by ~1.85× price); fall back to later lots.
    const rest = a.lots.slice(a.lot);
    const affordable = rest.filter((id) => VENUE_BY_ID[id].price * 1.9 <= limit(id));
    const target = affordable.sort((x, y) => VENUE_BY_ID[y].cap - VENUE_BY_ID[x].cap)[0];
    if (target && target !== vid) return false;
  }
  return a.price <= limit(vid);
}

/** Spend money to confirm interested hackers, keeping a reserve for the venue auction and hires. */
function confirmStep(s: GameState, style: Style, rng: BotRng) {
  if (!canConfirm(s)) return;
  if (style === 'random') { if (rng.next() < 0.02) confirmHackers(s); return; }
  const auctionReserve = !s.venue && s.day <= T.balantirDay ? (style === 'money' ? 10000 : 18000) : 0;
  const reserve = auctionReserve + 800;
  // Money bot waits for the last two days; everyone else confirms as interest grows.
  if (style === 'money' && s.day < 6) return;
  // Once the venue is known, don't pay for hackers who won't fit.
  const cap = s.venue ? VENUE_BY_ID[s.venue].cap / 0.85 : Infinity;
  let guard = 0;
  while (canConfirm(s) && s.confirmed < cap && s.budget - confirmBatch(s) * confirmCost(s) >= reserve && confirmBatch(s) >= Math.min(100, s.signups - s.confirmed) && guard++ < 40) confirmHackers(s);
}

export function playGame(seed: number, mode: Mode, cfg: BotCfg, maxTicks = 40000): RunResult {
  const s = newGame(seed, mode);
  const rng = new BotRng({ rngState: (seed * 2654435761) | 0 });
  const decided = new Set<number>();
  const decidedAlerts = new Set<number>();
  const willing: Record<string, number> = {};
  for (const id of ['soda', 'parking', 'stadium', 'palace']) {
    willing[id] = cfg.style === 'random' ? 0.5 + rng.next() * 1.3 : cfg.style === 'money' ? 1.2 : cfg.style === 'hype' ? 1.8 : cfg.style === 'perfect' ? 2 : 1.8;
  }
  let ticks = 0;
  const dt = 0.5;
  while (s.phase !== 'results') {
    if (++ticks > maxTicks) return { state: s, stuck: true, ticks, reason: `phase=${s.phase} day=${s.day}` };
    switch (s.phase) {
      case 'intro': beginGame(s); break;
      case 'morning':
        hireStep(s, cfg.style, rng);
        manageCrew(s, cfg.style, rng);
        startLiveDay(s);
        break;
      case 'live': {
        if (s.courting) { courtStep(s, cfg.style, rng); break; }
        for (const b of s.bubbles) {
          if (decided.has(b.id)) continue;
          decided.add(b.id);
          // 📱 posts: engaged bots tap every one; the random bot taps half. TP bubbles follow bubbleRate.
          const rate = b.type === 'post' ? (cfg.style === 'random' ? 0.5 : 1) : cfg.bubbleRate;
          if (rng.next() < rate) tapBubble(s, b.id);
        }
        // Popups pause the world; the bot reads them instantly.
        while (s.popups.length) dismissPopup(s);
        // Alerts pause too. A bot that "doesn't engage" takes the default choice.
        const a = s.alertQueue[0];
        if (a && !decidedAlerts.has(a.uid)) {
          decidedAlerts.add(a.uid);
          resolveAlert(s, rng.next() < cfg.alertRate ? pickAlertChoice(s, cfg.style, rng) : a.defaultChoice);
        }
        if (s.alertQueue.length) break;
        buyStep(s, cfg.style, rng);
        confirmStep(s, cfg.style, rng);
        if (ticks % 10 === 0) manageCrew(s, cfg.style, rng);
        if (cfg.style === 'random' && rng.next() < 0.002) endLiveDay(s, true);
        else advance(s, dt);
        break;
      }
      case 'auction':
        if (s.auction!.phase === 'done') finishAuction(s);
        else tickAuction(s, 0.25, auctionHold(s, cfg.style, willing));
        break;
      case 'night': confirmStep(s, cfg.style, rng); nextDay(s); break;
      case 'hackday': hackdaySkip(s); break;
    }
  }
  return { state: s, stuck: false, ticks };
}
