// The real-time event layer (Section 6.5): scheduling, bubbles, ticker, alerts.
import { ALERTS, ALERT_BY_ID } from '../content/alerts';
import { ROLE_INFO } from '../content/members';
import { SPONSOR_BY_ID } from '../content/sponsors';
import { MODES, T } from './config';
import type { AlertDef, Effects, Outcome } from './effects';
import { addRep, addTicker, chargesLeft, fx, log, memberById, pickInviteSponsor, rngPickRegion, taskSkillSum } from './helpers';
import { fill, joke, regionName, type SlotOverrides } from './jokes';
import { bearImpulse, treeImpulse } from './map';
import { chance, clamp, pick, rand, randInt, randRange, weighted } from './rng';
import { revealNextMove, scheduleTreeMoves, startTreeMove } from './tree';
import type { ActiveAlert, AlertCtx, BubbleType, GameState, RegionId, TickerCat } from './types';

// ─────────────────────────────── scheduling ───────────────────────────────

function placeTimes(s: GameState, taken: number[], count: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const t = randRange(s, lo, hi);
      if ([...taken, ...out].every((x) => Math.abs(x - t) >= T.minGap)) { out.push(t); break; }
    }
  }
  return out;
}

export function scheduleDay(s: GameState) {
  const cfg = MODES[s.mode];
  const D = s.daySec;
  s.schedule = [];
  const taken: number[] = [];
  // Tree moves first (fixed beats of the storyline).
  for (const ev of scheduleTreeMoves(s)) { s.schedule.push(ev); taken.push(ev.at); }
  // Alerts (with optional foreshadowing 5–8 s earlier).
  const alertIds: string[] = [];
  if (s.day >= 2 && s.treeSignups - s.signups > T.rubberBand) alertIds.push('tree_stumble');
  if (s.day >= 3 && !s.firedAlerts.includes('ysee_afterparty') && s.sponsors.some((x) => x.id === 'ysee')) alertIds.push('ysee_afterparty');
  const forced = alertIds.length;
  while (alertIds.length < cfg.alerts + forced) {
    const a = pickAlert(s, alertIds);
    if (!a) break;
    alertIds.push(a.id);
  }
  const alertTimes = placeTimes(s, taken, alertIds.length, Math.min(9, D * 0.25), D - 4);
  alertIds.slice(0, alertTimes.length).forEach((id, i) => {
    s.schedule.push({ at: alertTimes[i], kind: 'alert', data: id });
    taken.push(alertTimes[i]);
    const def = ALERT_BY_ID[id];
    if (def.foreshadow) s.schedule.push({ at: Math.max(0.5, alertTimes[i] - randRange(s, 5, 8)), kind: 'foreshadow', data: def.foreshadow });
  });
  // One sponsor-invite roll per day (more in longer modes), resolved at fire time.
  const invites = s.mode === 'full' ? 2 : 1;
  for (const t of placeTimes(s, taken, invites, 4, D - 4)) { s.schedule.push({ at: t, kind: 'invite' }); taken.push(t); }
  // YSee invite if they are not signed by Day 4 (keeps the after-party reachable).
  if (s.day === 4 && !s.sponsors.some((x) => x.id === 'ysee')) {
    for (const t of placeTimes(s, taken, 1, 3, D - 6)) { s.schedule.push({ at: t, kind: 'invite', data: 'ysee' }); taken.push(t); }
  }
  // Bubbles.
  let bubbles = cfg.bubbles;
  if (s.day === Number(s.flags.bsodDay)) {
    const [t] = placeTimes(s, taken, 1, 3, D - 6);
    if (t !== undefined) { s.schedule.push({ at: t, kind: 'bubble', data: 'bsod' }); taken.push(t); bubbles--; }
  }
  for (const t of placeTimes(s, taken, bubbles, 1, D - 1.5)) { s.schedule.push({ at: t, kind: 'bubble' }); taken.push(t); }
  s.schedule.sort((a, b) => a.at - b.at);
}

function alertWeight(s: GameState, a: AlertDef): number {
  const max = a.max ?? (a.once ? 1 : 2);
  if (s.firedAlerts.filter((x) => x === a.id).length >= max) return 0;
  if (a.when && !a.when(s)) return 0;
  if (a.needsMember && s.members.length === 0) return 0;
  return typeof a.weight === 'function' ? a.weight(s) : a.weight;
}

function pickAlert(s: GameState, exclude: string[]): AlertDef | null {
  const pool = ALERTS.filter((a) => !exclude.includes(a.id) && alertWeight(s, a) > 0);
  if (!pool.length) return null;
  // The Blue Screen alert stays out of the random pool once the flag is set.
  return weighted(s, pool, (a) => alertWeight(s, a) * (a.id === 'bsod' && s.flags.bsod ? 0 : 1));
}

// ─────────────────────────────── per-tick ───────────────────────────────

export function tickEvents(s: GameState, dt: number) {
  // Scheduled events.
  for (const ev of s.schedule) {
    if (ev.done || ev.at > s.t) continue;
    ev.done = true;
    switch (ev.kind) {
      case 'bubble': spawnBubble(s, ev.data as BubbleType | undefined); break;
      case 'alert': queueAlert(s, ev.data!); break;
      case 'foreshadow': addTicker(s, ev.data === 'headline|fs_tree' ? 'TREE TIMES' : 'BREAKING', joke(s, ev.data!)); break;
      case 'invite': rollInvite(s, ev.data); break;
      case 'treeMove': startTreeMove(s, ev.data!); break;
    }
  }
  // Bubbles expire.
  for (const b of [...s.bubbles]) {
    if (s.t - b.spawnedAt >= b.ttl) expireBubble(s, b.id);
  }
  // Active alert countdown.
  const a = s.alertQueue[0];
  if (a) {
    a.remaining -= dt;
    if (a.remaining <= 0) resolveAlert(s, a.defaultChoice, true);
  }
  // Ticker.
  s.tickerT += dt;
  if (s.tickerT >= MODES[s.mode].tickerSec) {
    s.tickerT = 0;
    tickerHeadline(s);
  }
}

const CAT_KEYS: [TickerCat, string, number][] = [
  ['BEAR BEAT', 'headline|bear', 3],
  ['TREE TIMES', 'headline|tree', 2.5],
  ['SPONSOR WIRE', 'headline|sponsor', 1.5],
  ['CAMPUS', 'headline|campus', 2.5],
  ['BREAKING', 'headline|breaking', 1.5],
];

export function tickerHeadline(s: GameState) {
  const [cat, key] = weighted(s, CAT_KEYS, (c) => c[2]);
  addTicker(s, cat, joke(s, key));
}

// ─────────────────────────────── bubbles ───────────────────────────────

const BUBBLE_WEIGHTS: [BubbleType, number][] = [
  ['donor', 18], ['idea', 14], ['buzz', 16], ['pizza', 11], ['lead', 8], ['fire', 11], ['spy', 8], ['party', 8],
];
export const BUBBLE_ICON: Record<BubbleType, string> = {
  donor: '💵', idea: '💡', buzz: '📈', pizza: '🍕', lead: '🎁', fire: '🔥', spy: '🕵️', party: '🎉', bsod: '🟦',
};

export function spawnBubble(s: GameState, type?: BubbleType, regionId?: RegionId) {
  if (s.bubbles.length >= T.maxBubbles) return;
  let rid = regionId ?? rngPickRegion(s, { frat: 1.6 });
  const t = type ?? weighted(s, BUBBLE_WEIGHTS, ([bt, w]) => (bt === 'party' && rid === 'frat' ? w * 3 : w))[0];
  if (t === 'party' && !regionId && rand(s) < 0.5) rid = 'frat';
  s.bubbles.push({ id: ++s.uid, type: t, regionId: rid, spawnedAt: s.t, ttl: T.bubbleTtl });
  s.lastInteractiveAt = s.t;
}

export function tapBubble(s: GameState, id: number): boolean {
  const b = s.bubbles.find((x) => x.id === id);
  if (!b) return false;
  s.bubbles = s.bubbles.filter((x) => x.id !== id);
  const o: SlotOverrides = { region: regionName(s, b.regionId) };
  let pop = '';
  switch (b.type) {
    case 'donor': { const v = Math.round((randInt(s, 200, 800) * (1 + s.reputation / 200)) / 10) * 10; s.budget += v; pop = `+$${v}`; break; }
    case 'idea': { const v = randInt(s, 1, 3); s.techPoints += v; pop = `+${v} TP`; break; }
    case 'buzz': bearImpulse(s, b.regionId, 0.07); pop = '+hype'; break;
    case 'pizza': s.moodBank += 1; pop = '+mood'; break;
    case 'lead': { const sp = pickInviteSponsor(s); if (sp) queueAlert(s, 'sponsor_invite', { sponsorId: sp }, 8); pop = 'Sponsor lead!'; break; }
    case 'fire': pop = 'Extinguished!'; break;
    case 'spy': s.treeHype = Math.max(0, s.treeHype - 3); revealNextMove(s); pop = 'Spy caught! −3 Tree hype'; break;
    case 'party': bearImpulse(s, 'frat', 0.07 * 2, 0.5, ['dorms', 'sproul']); s.moodBank += 1; pop = '🎉 party hype'; break;
    case 'bsod': s.flags.bsod = 'rebooted'; pop = 'Rebooted!'; log(s, 'bsod', 'rebooted'); break;
  }
  fx(s, { kind: 'pop', regionId: b.regionId, text: pop, tone: 'good' });
  fx(s, { kind: 'toast', text: joke(s, `bubble|${b.type === 'lead' ? 'lead' : b.type}`, o), tone: 'neutral' });
  fx(s, { kind: 'sfx', sfx: b.type === 'donor' ? 'cash' : b.type === 'fire' ? 'pop' : 'pop' });
  log(s, `bubble:${b.type}`, 'tap');
  if (s.tutorialStep === 0) s.tutorialStep = 1;
  return true;
}

function expireBubble(s: GameState, id: number) {
  const b = s.bubbles.find((x) => x.id === id);
  if (!b) return;
  s.bubbles = s.bubbles.filter((x) => x.id !== id);
  switch (b.type) {
    case 'fire': addRep(s, -5); s.moodBank -= 1; fx(s, { kind: 'pop', regionId: b.regionId, text: '🔥 −5 rep', tone: 'bad' }); fx(s, { kind: 'sfx', sfx: 'fire' }); addTicker(s, 'BREAKING', `BREAKING: Dumpster fire in ${regionName(s, b.regionId)} "mostly metaphorical," says Bear U`); break;
    case 'spy': s.treeHype += 2; fx(s, { kind: 'pop', regionId: b.regionId, text: 'Spy escaped. +2 Tree hype', tone: 'bad' }); break;
    case 'bsod': s.flags.bsod = 'haunted'; log(s, 'bsod', 'haunted'); fx(s, { kind: 'toast', text: 'The Blue Screen faded away… for now. 👻', tone: 'bad' }); break;
  }
  log(s, `bubble:${b.type}`, 'miss');
}

// ─────────────────────────────── sponsor invites ───────────────────────────────

export function inviteChance(s: GameState): number {
  const coord = taskSkillSum(s, 'sponsors', 'coordinator');
  const careerBonus = s.regions.find((r) => r.id === 'career')!.bear * 0.1;
  return clamp(T.inviteBase + T.invitePerCoord * coord + s.inviteBonus + careerBonus, 0, T.inviteCap);
}

function rollInvite(s: GameState, forced?: string) {
  if (forced) {
    if (!s.sponsors.some((x) => x.id === forced)) queueAlert(s, 'sponsor_invite', { sponsorId: forced }, 10);
    return;
  }
  if (!chance(s, inviteChance(s))) return;
  const sp = pickInviteSponsor(s);
  if (sp) queueAlert(s, 'sponsor_invite', { sponsorId: sp });
}

// ─────────────────────────────── alerts ───────────────────────────────

export function queueAlert(s: GameState, id: string, ctxIn: Partial<AlertCtx> = {}, interestBonus = 0) {
  const def = ALERT_BY_ID[id];
  if (!def) return;
  if (def.when && !def.when(s) && id !== 'sponsor_invite') return;
  if (id === 'sponsor_invite' && s.alertQueue.some((a) => a.templateId === 'sponsor_invite' && a.ctx.sponsorId === ctxIn.sponsorId)) return;
  const ctx: AlertCtx = { filled: {}, ...ctxIn };
  if (def.needsMember) {
    if (!s.members.length) return;
    const m = pick(s, s.members);
    ctx.memberId = m.id;
    ctx.filled.member = m.name;
    ctx.filled.role = ROLE_INFO[m.role].name;
  }
  if (def.region) ctx.regionId = def.region === 'random' ? rngPickRegion(s) : def.region;
  if (ctx.regionId) ctx.filled.region = regionName(s, ctx.regionId);
  if (id === 'rival_poach' || id === 'cobol_sponsor') {
    const sp = s.sponsors.length ? pick(s, s.sponsors).id : undefined;
    if (sp) ctx.sponsorId = sp;
  }
  if (ctx.sponsorId) ctx.filled.sponsor = SPONSOR_BY_ID[ctx.sponsorId].name;
  if (id === 'sponsor_invite' && interestBonus) ctx.filled.bonus = String(interestBonus);
  const title = typeof def.title === 'function' ? def.title(s) : def.title;
  const body = typeof def.body === 'function' ? def.body(s) : def.body;
  const seconds = (def.seconds ?? T.alertSeconds) * (s.settings.relaxed ? 2 : 1);
  const alert: ActiveAlert = {
    uid: ++s.uid,
    templateId: id,
    title: fill(s, title, ctx.filled),
    body: fill(s, body, ctx.filled),
    choices: def.choices.map((c) => ({ label: c.label, cost: c.cost, hint: c.hint })),
    remaining: seconds,
    seconds,
    defaultChoice: def.defaultChoice,
    ctx,
    regionId: ctx.regionId,
  };
  refreshChoices(s, alert);
  s.alertQueue.push(alert);
  s.firedAlerts.push(id);
  s.lastInteractiveAt = s.t;
  if (s.alertQueue.length === 1) fx(s, { kind: 'sfx', sfx: 'alert' });
}

export function refreshChoices(s: GameState, a: ActiveAlert) {
  const def = ALERT_BY_ID[a.templateId];
  a.choices.forEach((c, i) => {
    const d = def.choices[i];
    c.disabled = (d.cost ?? 0) > s.budget || (d.requires ? !d.requires(s) : false);
  });
  // The default must always be choosable (never soft-lock): fall back to the first enabled choice.
  if (a.choices[a.defaultChoice].disabled) {
    const i = a.choices.findIndex((c) => !c.disabled);
    a.defaultChoice = i >= 0 ? i : a.defaultChoice;
    if (i < 0) a.choices[a.defaultChoice].disabled = false;
  }
}

export function resolveAlert(s: GameState, choiceIdx: number, timedOut = false) {
  const a = s.alertQueue[0];
  if (!a) return;
  refreshChoices(s, a);
  const def = ALERT_BY_ID[a.templateId];
  let idx = choiceIdx;
  if (!a.choices[idx] || a.choices[idx].disabled) idx = a.defaultChoice;
  const c = def.choices[idx];
  s.alertQueue.shift();
  if (c.cost) s.budget -= c.cost;
  let out: Outcome | undefined = c.out;
  if (c.odds) {
    const win = rand(s) < c.odds.p;
    s.flags._lastOdds = win ? 'win' : 'lose';
    out = win ? c.odds.win : c.odds.lose;
  }
  if (out) applyEffects(s, out, a.ctx);
  const ran = c.run?.(s, { memberId: a.ctx.memberId, regionId: a.ctx.regionId, sponsorId: a.ctx.sponsorId });
  if (a.templateId === 'sponsor_invite' && idx === 0 && s.courting && a.ctx.filled.bonus) s.courting.interest += Number(a.ctx.filled.bonus);
  const text = typeof ran === 'string' ? ran : out?.text ?? '';
  const filled = fill(s, text, a.ctx.filled);
  if (filled && !(a.templateId === 'sponsor_invite' && idx === 0)) {
    fx(s, { kind: 'toast', text: (timedOut ? '⏰ Too slow! ' : '') + filled, tone: timedOut ? 'bad' : 'neutral' });
  }
  fx(s, { kind: 'sfx', sfx: timedOut ? 'error' : 'tap' });
  log(s, `alert:${a.templateId}`, `${c.label}${timedOut ? ' (timeout)' : ''}`, idx);
  if (s.tutorialStep === 3) s.tutorialStep = 4;
  // Refresh affordability of the next alert in the queue.
  if (s.alertQueue[0]) { refreshChoices(s, s.alertQueue[0]); fx(s, { kind: 'sfx', sfx: 'alert' }); }
}

export function applyEffects(s: GameState, e: Effects, ctx: AlertCtx) {
  if (e.budget) s.budget += e.budget;
  if (e.rep) addRep(s, e.rep);
  if (e.signups) s.bonusSignups += e.signups;
  if (e.mood) s.moodBank += e.mood;
  if (e.tp) s.techPoints = Math.max(0, s.techPoints + e.tp);
  if (e.treeHype) s.treeHype = clamp(s.treeHype + e.treeHype, 0, 100);
  if (e.website) s.websiteScore = clamp(s.websiteScore + e.website, 0, 100);
  if (e.quality) s.qualityBonus += e.quality;
  if (e.sponsorMood) { s.sponsorMoodDelta += e.sponsorMood; for (const sp of s.sponsors) sp.mood += e.sponsorMood; }
  if (e.inviteBonus) s.inviteBonus += e.inviteBonus;
  if (e.outputMult) s.outputMult *= e.outputMult;
  if (e.siteDown) s.siteDownSteps += e.siteDown;
  // charges: −1 spends a post charge
  if (e.charges) s.chargesUsed = Math.max(0, s.chargesUsed - e.charges);
  if (e.impulse) {
    for (const id of targets(s, e.impulse.target, ctx)) {
      if (e.impulse.party && id === 'frat') bearImpulse(s, id, e.impulse.amount * 2, 0.5, ['dorms', 'sproul']);
      else if (e.impulse.amount < 0) { const r = s.regions.find((x) => x.id === id)!; r.bear = clamp(r.bear + e.impulse.amount, 0, 1); }
      else bearImpulse(s, id, e.impulse.amount);
      fx(s, { kind: 'pulse', regionId: id, tone: e.impulse.amount >= 0 ? 'good' : 'bad' });
    }
  }
  if (e.treeImpulse) for (const id of targets(s, e.treeImpulse.target, ctx)) treeImpulse(s, id, e.treeImpulse.amount);
  if (e.flags) Object.assign(s.flags, e.flags);
  if (e.flagAdd) for (const [k, v] of Object.entries(e.flagAdd)) s.flags[k] = Number(s.flags[k] ?? 0) + v;
  const m = memberById(s, ctx.memberId);
  if (m) {
    if (e.memberIdleSteps) m.idleSteps += e.memberIdleSteps;
    if (e.memberBenchDays) m.benchedDays += e.memberBenchDays;
    if (e.memberSkill) m.baseSkill = clamp(m.baseSkill + e.memberSkill, 1, 10);
  }
  if (e.allIdleSteps) for (const x of s.members) if (x.task) x.idleSteps += e.allIdleSteps;
}

function targets(s: GameState, t: RegionId | 'ctx' | 'random' | 'all', ctx: AlertCtx): RegionId[] {
  if (t === 'all') return s.regions.map((r) => r.id);
  if (t === 'ctx') return ctx.regionId ? [ctx.regionId] : [rngPickRegion(s)];
  if (t === 'random') return [ctx.regionId ?? rngPickRegion(s)];
  return [t];
}

export { chargesLeft };
