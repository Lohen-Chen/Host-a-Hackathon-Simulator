// Headless bots that play full games on the pure core (Section 13).
import { ALERT_BY_ID } from '../src/content/alerts';
import type { Effects, Outcome } from '../src/core/effects';
import { ROLE_INFO } from '../src/content/members';
import { POST_BY_ID } from '../src/content/posts';
import { VIBE_SCORES } from '../src/content/sponsors';
import { TECH } from '../src/content/techTree';
import { VENUE_BY_ID } from '../src/content/venues';
import {
  advance, affinity, assign, beginGame, buyTech, canFire, canRespond, chargesLeft, courtingReply, endLiveDay, finishAuction,
  finishCourting, firePost, hackdaySkip, hire, newGame, nextDay, partyMult, resolveAlert, respondTreeMove, startLiveDay,
  tapBubble, techState, tickAuction, type GameState, type Mode, type RegionId, type Task, type TechId,
} from '../src/core';
import { rand } from '../src/core/rng';

export type Style = 'random' | 'money' | 'hype' | 'balanced' | 'perfect';
export interface BotCfg { style: Style; bubbleRate: number; alertRate: number }
export interface RunResult { state: GameState; stuck: boolean; ticks: number; reason?: string }

const TECH_ORDER: Record<Exclude<Style, 'random'>, TechId[]> = {
  balanced: ['website', 'coordinator', 'design', 'snack', 'training2', 'logistics', 'promo', 'rep2', 'clubfair', 'prestige2'],
  perfect: ['website', 'coordinator', 'training2', 'design', 'snack', 'promo', 'logistics', 'rep2', 'clubfair', 'prestige2'],
  hype: ['website', 'promo', 'training2', 'design', 'clubfair', 'prestige2', 'snack', 'coordinator', 'logistics', 'rep2'],
  money: ['coordinator', 'rep2', 'snack', 'logistics', 'website', 'design', 'training2', 'promo', 'clubfair', 'prestige2'],
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

function bestTarget(s: GameState, handIdx: number): { region: RegionId; v: number } {
  const card = POST_BY_ID[s.hand[handIdx]];
  let best: RegionId = 'sproul';
  let bv = -1;
  for (const r of s.regions) {
    const room = Math.max(0.05, 1 - r.bear) * (1 + r.tree);
    const v = r.pop * r.conv * room * affinity(card, r.id) * partyMult(card, r.id);
    if (v > bv) { bv = v; best = r.id; }
  }
  return { region: best, v: bv * card.power };
}

function postStep(s: GameState, style: Style, rng: BotRng) {
  if (chargesLeft(s) <= 0 || !s.hand.length) return;
  // Spread posts across the day.
  const frac = s.t / s.daySec;
  if (style !== 'random' && frac < 0.15 * (3 - chargesLeft(s))) return;
  if (style === 'random') {
    if (rng.next() > 0.03) return;
    const i = Math.floor(rng.next() * s.hand.length);
    if (canFire(s, i)) firePost(s, i, rng.pick(s.regions).id);
    return;
  }
  let bi = -1;
  let best = { region: 'sproul' as RegionId, v: -1 };
  s.hand.forEach((_, i) => {
    if (!canFire(s, i)) return;
    if (style === 'money' && POST_BY_ID[s.hand[i]].cost > 0) return;
    const t = bestTarget(s, i);
    if (t.v > best.v) { best = t; bi = i; }
  });
  if (bi >= 0) firePost(s, bi, best.region);
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
  const v = VENUE_BY_ID[vid];
  if (s.venue) return false;
  const projected = s.signups * 2.1 * 0.7;
  const isLast = a.lot === a.lots.length - 1;
  if (style !== 'random' && v.cap < projected * 0.55 && !isLast) return false;
  if (style !== 'random' && v.cap > projected * 2.6 && vid !== 'palace' && !isLast) return false;
  return a.price <= Math.min(s.budget - (style === 'money' ? 4000 : 2500), v.price * willing[vid]);
}

export function playGame(seed: number, mode: Mode, cfg: BotCfg, maxTicks = 40000): RunResult {
  const s = newGame(seed, mode);
  const rng = new BotRng({ rngState: (seed * 2654435761) | 0 });
  const decided = new Set<number>();
  const decidedAlerts = new Set<number>();
  const willing: Record<string, number> = {};
  for (const id of ['soda', 'parking', 'stadium', 'palace']) {
    willing[id] = cfg.style === 'random' ? 0.5 + rng.next() * 1.3 : cfg.style === 'money' ? 0.95 : cfg.style === 'hype' ? 1.6 : 1.35;
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
          if (rng.next() < cfg.bubbleRate) tapBubble(s, b.id);
        }
        const a = s.alertQueue[0];
        if (a && !decidedAlerts.has(a.uid)) {
          decidedAlerts.add(a.uid);
          if (rng.next() < cfg.alertRate) resolveAlert(s, pickAlertChoice(s, cfg.style, rng));
        }
        if (s.treeMove && s.treeMove.responded === 'none') {
          if (cfg.style === 'random') { if (rng.next() < 0.3) respondTreeMove(s, rng.pick(['counter', 'clapback', 'ignore'] as const)); }
          else if (cfg.style !== 'money' && canRespond(s, 'counter') && s.budget > 6000) respondTreeMove(s, 'counter');
          else if (canRespond(s, 'clapback') && cfg.style === 'hype') respondTreeMove(s, 'clapback');
          else if (cfg.style === 'money' && canRespond(s, 'clapback')) respondTreeMove(s, 'clapback');
        }
        buyStep(s, cfg.style, rng);
        if (ticks % 10 === 0) manageCrew(s, cfg.style, rng);
        postStep(s, cfg.style, rng);
        if (cfg.style === 'random' && rng.next() < 0.002) endLiveDay(s, true);
        else advance(s, dt);
        break;
      }
      case 'auction':
        if (s.auction!.phase === 'done') finishAuction(s);
        else tickAuction(s, 0.25, auctionHold(s, cfg.style, willing));
        break;
      case 'night': nextDay(s); break;
      case 'hackday': hackdaySkip(s); break;
    }
  }
  return { state: s, stuck: false, ticks };
}
