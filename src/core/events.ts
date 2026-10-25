// The real-time event layer (Section 6.5): scheduling, bubbles, ticker, alerts.
import { ALERTS, ALERT_BY_ID } from '../content/alerts';
import { ROLE_INFO } from '../content/members';
import { NEWS, NEWS_BY_ID } from '../content/news';
import { SPONSOR_BY_ID } from '../content/sponsors';
import { MODES, T } from './config';
import type { AlertDef, Effects, Outcome } from './effects';
import { addRep, addTicker, fx, log, postsPerDay, memberById, pickInviteSponsor, rngPickRegion, taskSkillSum } from './helpers';
import { fill, joke, regionName, type SlotOverrides } from './jokes';
import { bearImpulse, treeImpulse } from './map';
import { showPopup } from './popups';
import { firePost, pickCard } from './posts';
import { chance, clamp, pick, rand, randInt, randRange, weighted } from './rng';
import { startRumor } from './tech';
import { scheduleTreeMoves, startTreeMove } from './tree';
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
  // The once-per-run Blue Screen goes next so a short Judge-mode day can't crowd it out.
  let bsodPlaced = false;
  if (s.day === Number(s.flags.bsodDay)) {
    const t = placeTimes(s, taken, 1, 3, D - 6)[0] ?? randRange(s, 3, D - 6);
    s.schedule.push({ at: t, kind: 'bubble', data: 'bsod' }); taken.push(t); bsodPlaced = true;
  }
  // Each day from Day 2 gets exactly one "special": a world-news headline or a rumor (tech mutation),
  // drawn from what's left. Decisions fill the rest of the day's pause budget, so the world stops
  // about twice a day.
  let specials = 0;
  if (s.day >= 2) {
    const pool: string[] = NEWS.filter((n) => !s.firedAlerts.includes(`news:${n.id}`)).map((n) => n.id);
    const rumorsLeft = T.maxRumors - Number(s.flags.rumors ?? 0) - Number(s.flags.rumorsPlanned ?? 0);
    for (let i = 0; i < rumorsLeft; i++) pool.push('rumor');
    if (pool.length) {
      const id = pick(s, pool);
      if (id === 'rumor') s.flags.rumorsPlanned = Number(s.flags.rumorsPlanned ?? 0) + 1;
      else s.firedAlerts.push(`news:${id}`);
      const [t] = placeTimes(s, taken, 1, D * 0.2, D * 0.8);
      s.schedule.push({ at: t ?? randRange(s, D * 0.2, D * 0.8), kind: 'news', data: id });
      if (t !== undefined) taken.push(t);
      specials = 1;
    }
  }
  const treeMoves = s.schedule.filter((e) => e.kind === 'treeMove').length;
  // Alerts: decisions that pause the world (with optional foreshadowing 5–8 s earlier).
  const alertIds: string[] = [];
  if (s.day >= 2 && s.treeSignups - s.signups > T.rubberBand) alertIds.push('tree_stumble');
  if (s.day >= 3 && !s.firedAlerts.includes('ysee_afterparty') && s.sponsors.some((x) => x.id === 'ysee')) alertIds.push('ysee_afterparty');
  if (s.day === T.balantirDay && !s.firedAlerts.includes('balantir_call')) alertIds.push('balantir_call');
  const forced = alertIds.length;
  // Random decisions only every other day, and never on a day that already has a scripted one.
  const decisionDay = s.day % 2 === 0 && forced === 0;
  const room = decisionDay ? Math.min(cfg.alerts, Math.max(0, cfg.popupsPerDay - treeMoves - specials)) : 0;
  while (alertIds.length < room + forced) {
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
  // 📱 post bubbles: the social team's posts for the day, spread across it.
  for (const t of placeTimes(s, taken, postsPerDay(s), 2, D - 3)) { s.schedule.push({ at: t, kind: 'bubble', data: 'post' }); taken.push(t); }
  // Bubbles.
  let bubbles = cfg.bubbles;
  if (bsodPlaced) bubbles--;
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
      case 'news': fireNews(s, ev.data!); break;
    }
  }
  // Bubbles expire.
  for (const b of [...s.bubbles]) {
    if (s.t - b.spawnedAt >= b.ttl) expireBubble(s, b.id);
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

// ─────────────────────────────── world news ───────────────────────────────

export function fireNews(s: GameState, id: string) {
  if (id === 'rumor') {
    s.flags.rumorsPlanned = Math.max(0, Number(s.flags.rumorsPlanned ?? 0) - 1);
    if (Number(s.flags.rumors ?? 0) < T.maxRumors) startRumor(s);
    return;
  }
  const n = NEWS_BY_ID[id];
  if (!n) return;
  applyEffects(s, n.fx, { filled: {} });
  showPopup(s, { kind: 'news', icon: n.icon, title: n.title, body: n.body, effect: n.effect, regionId: 'b1g' }, false);
  log(s, 'news', id);
}

// ─────────────────────────────── bubbles ───────────────────────────────

// Bubbles are Plague Inc DNA: they only ever give tech points.
export const BUBBLE_ICON: Record<BubbleType, string> = { idea: '💡', eureka: '🧬', bsod: '🟦', post: '📱' };

export function spawnBubble(s: GameState, type?: BubbleType, regionId?: RegionId) {
  if (type !== 'post' && s.bubbles.filter((b) => b.type !== 'post').length >= T.maxBubbles) {
    // The once-per-run Blue Screen must not be lost to a crowded map: it bumps the oldest bubble.
    if (type !== 'bsod') return;
    s.bubbles.shift();
  }
  const t: BubbleType = type ?? (rand(s) < 0.15 ? 'eureka' : 'idea');
  // TP bubbles pop up where Bear Hacks is known, like DNA bubbles over infected countries.
  // 📱 post bubbles pop up on the frontier: regions next to the hype that aren't won yet.
  const rid = regionId ?? (t === 'post' ? weighted(s, s.regions, (r) => postWeight(s, r)).id : weighted(s, s.regions, (r) => 0.15 + r.bear).id);
  s.bubbles.push({ id: ++s.uid, type: t, regionId: rid, spawnedAt: s.t, ttl: t === 'post' ? T.postBubbleTtl : T.bubbleTtl });
  s.lastInteractiveAt = s.t;
}

function postWeight(s: GameState, r: GameState['regions'][number]): number {
  const near = Math.max(r.bear, ...r.neighbors.map((n) => s.regions.find((x) => x.id === n)!.bear));
  return 0.15 + near * (1.1 - r.bear) * (1 + r.tree);
}

export function tapBubble(s: GameState, id: number): boolean {
  const b = s.bubbles.find((x) => x.id === id);
  if (!b) return false;
  s.bubbles = s.bubbles.filter((x) => x.id !== id);
  if (b.type === 'post') {
    firePost(s, pickCard(s, b.regionId).id, b.regionId);
    log(s, 'bubble:post', 'tap');
    if (s.tutorialStep === 1) s.tutorialStep = 2;
    return true;
  }
  const o: SlotOverrides = { region: regionName(s, b.regionId) };
  const tp = b.type === 'eureka' ? 3 : b.type === 'bsod' ? 2 : randInt(s, 1, 2);
  s.techPoints += tp;
  if (b.type === 'bsod') { s.flags.bsod = 'rebooted'; log(s, 'bsod', 'rebooted'); }
  fx(s, { kind: 'pop', regionId: b.regionId, text: `+${tp} TP`, tone: 'good' });
  fx(s, { kind: 'toast', text: joke(s, `bubble|${b.type === 'bsod' ? 'bsod' : 'idea'}`, o), tone: 'neutral' });
  fx(s, { kind: 'sfx', sfx: 'pop' });
  log(s, `bubble:${b.type}`, 'tap');
  if (s.tutorialStep === 0) s.tutorialStep = 1;
  return true;
}

function expireBubble(s: GameState, id: number) {
  const b = s.bubbles.find((x) => x.id === id);
  if (!b) return;
  s.bubbles = s.bubbles.filter((x) => x.id !== id);
  if (b.type === 'bsod') { s.flags.bsod = 'haunted'; log(s, 'bsod', 'haunted'); fx(s, { kind: 'toast', text: 'The Blue Screen faded away… for now. 👻', tone: 'bad' }); }
  if (b.type === 'post') addTicker(s, 'POSTS', `📱 A post in ${regionName(s, b.regionId)} sat in drafts and expired. The intern is "circling back."`);
  log(s, `bubble:${b.type}`, 'miss');
}

// ─────────────────────────────── sponsor invites ───────────────────────────────

export function inviteChance(s: GameState): number {
  const coord = taskSkillSum(s, 'sponsors', 'coordinator');
  return clamp(T.inviteBase + T.invitePerCoord * coord + s.inviteBonus, 0, T.inviteCap);
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
  const alert: ActiveAlert = {
    uid: ++s.uid,
    templateId: id,
    title: fill(s, title, ctx.filled),
    body: fill(s, body, ctx.filled),
    choices: def.choices.map((c) => ({ label: c.label, cost: c.cost, hint: c.hint })),
    defaultChoice: def.defaultChoice,
    ctx,
    regionId: ctx.regionId,
  };
  refreshChoices(s, alert);
  s.alertQueue.push(alert);
  s.firedAlerts.push(id);
  // Decisions count toward the day's pause budget (sponsor invites are opportunities, not events).
  if (id !== 'sponsor_invite') s.popupsToday++;
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
  if (e.signups) s.bonusSignups += e.signups * T.signupScale;
  if (e.mood) s.moodBank += e.mood;
  if (e.tp) s.techPoints = Math.max(0, s.techPoints + e.tp);
  if (e.treeHype) s.treeHype = clamp(s.treeHype + e.treeHype, 0, 100);
  if (e.website) s.websiteScore = clamp(s.websiteScore + e.website, 0, 100);
  if (e.quality) s.qualityBonus += e.quality;
  if (e.sponsorMood) { s.sponsorMoodDelta += e.sponsorMood; for (const sp of s.sponsors) sp.mood += e.sponsorMood; }
  if (e.inviteBonus) s.inviteBonus += e.inviteBonus;
  if (e.outputMult) s.outputMult *= e.outputMult;
  if (e.siteDown) s.siteDownSteps += e.siteDown;
  if (e.impulse) {
    for (const id of targets(s, e.impulse.target, ctx)) {
      if (e.impulse.party && id === 'frat') bearImpulse(s, id, e.impulse.amount * 2, 1);
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

