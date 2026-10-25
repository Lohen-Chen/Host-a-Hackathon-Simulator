// The hype map: per-step virus-style spread (Section 6.3). No DOM.
import { MODES, STEPS_PER_DAY, T } from './config';
import { addTicker, fx, hasTech, log } from './helpers';
import { isTreeControlled, joke } from './jokes';
import { showPopup } from './popups';
import { clamp, chance, rand, weighted } from './rng';
import { bar } from './tech';
import type { GameState, RegionId } from './types';

export function repFactor(rep: number) {
  return clamp(0.66 + 0.003 * rep, 0, 0.95);
}

/** Tree's off-map hackers (its own campus mailing lists), scaled by hype. */
export function treeBase(s: GameState) {
  return T.treeBase + s.treeHype * T.treeBasePerHype;
}

/** How much of an aware, controlled population becomes interested. Hype and a well-run club both help; every unlock helps a little. */
export function conversionMult(s: GameState) {
  const nodes = (hasTech(s, 'applications') ? 0.06 : 0) + (hasTech(s, 'travel') ? 0.08 : 0) - (hasTech(s, 'leetcode') ? 0.08 : 0);
  return 0.45 + 0.3 * (bar(s, 'hype') / 100) + 0.3 * (bar(s, 'org') / 100) + nodes + 0.015 * s.unlockedTech.length;
}

/** Hype bar → faster spread between neighbors. */
export function hypeMult(s: GameState) {
  return 1 + 0.8 * (bar(s, 'hype') / 100);
}

export function stepMap(s: GameState) {
  const rs = s.regions;
  const byId = new Map(rs.map((r) => [r.id, r]));
  const spreadK = T.spread * (1 + s.reputation / 100) * hypeMult(s);
  const treeK = T.treeSpread * (1 + s.treeHype / 100);
  const decay = T.decay * (1 - s.websiteScore / 200) * (s.siteDownSteps > 0 ? 2.5 : 1);
  const nextBear: number[] = [];
  const nextTree: number[] = [];
  for (const r of rs) {
    let inB = 0;
    let inT = 0;
    for (const nId of r.neighbors) {
      const n = byId.get(nId)!;
      inB += Math.max(0, n.bear - r.bear);
      inT += Math.max(0, n.tree - r.tree);
    }
    nextBear.push(clamp(r.bear + spreadK * inB - decay * r.bear, 0, 1));
    nextTree.push(clamp(r.tree + treeK * inT - T.treeDecay * r.tree, 0, 1));
  }
  const wasTree = rs.map((r) => isTreeControlled(r));
  rs.forEach((r, i) => { r.bear = nextBear[i]; r.tree = nextTree[i]; });

  // Tree's ambient posting.
  if (chance(s, (T.treePostsPerDay * MODES[s.mode].treePower) / STEPS_PER_DAY)) {
    const target = weighted(s, rs, (r) => 0.3 + r.tree + (r.bear > r.tree ? 0.4 : 0));
    treeImpulse(s, target.id, T.treePostPower * (s.treeHype / 50) * (0.6 + rand(s) * 0.8));
  }

  const rf = repFactor(s.reputation) * conversionMult(s);
  const treeRf = repFactor(s.treeHype * 0.7);
  let total = 0;
  let treeTotal = 0;
  rs.forEach((r, i) => {
    const control = clamp(r.bear - T.treeControlPenalty * r.tree, 0, 1);
    const target = r.pop * r.conv * control * rf;
    const before = r.signups;
    r.signups += T.signupLerp * (target - r.signups);
    const tControl = clamp(r.tree - T.treeControlPenalty * r.bear, 0, 1);
    const tTarget = r.pop * r.conv * tControl * treeRf;
    r.treeSignups += T.signupLerp * (tTarget - r.treeSignups);
    total += r.signups;
    treeTotal += r.treeSignups;
    const drop = before - r.signups;
    if (drop >= 40) fx(s, { kind: 'defect', regionId: r.id, value: -Math.round(drop), text: `−${Math.round(drop)} DEFECTED`, tone: 'bad' });
    const nowTree = isTreeControlled(r);
    if (nowTree !== wasTree[i]) regionFlipped(s, r.id, nowTree);
  });
  s.signups = Math.max(0, total + s.bonusSignups);
  s.treeSignups = treeTotal + treeBase(s);
  checkSignupMilestones(s);
  checkSpreadNews(s);
}

function regionFlipped(s: GameState, id: RegionId, toTree: boolean) {
  const r = s.regions.find((x) => x.id === id)!;
  if (toTree) {
    addTicker(s, 'TREE TIMES', `Tree University captures ${r.name}; ${joke(s, 'taunt|tree')}`.slice(0, 100));
    milestone(s, 'treeCaptures', `Tree captured ${r.name}!`, 'bad');
  } else {
    addTicker(s, 'BEAR BEAT', `Bear U takes ${r.name} from Tree University; ${r.name} "never liked synergy anyway"`.slice(0, 100));
    milestone(s, 'firstCapture', `You took ${r.name} from Tree!`, 'good');
  }
  log(s, toTree ? 'treeCapture' : 'bearCapture', r.name);
  fx(s, { kind: 'pulse', regionId: id, tone: toTree ? 'bad' : 'good' });
}

export function milestone(s: GameState, id: string, text: string, tone: 'good' | 'bad' = 'good', repeat = false) {
  if (!repeat && s.milestones.includes(id)) return;
  if (!s.milestones.includes(id)) s.milestones.push(id);
  fx(s, { kind: 'milestone', text, tone });
  fx(s, { kind: 'sfx', sfx: tone === 'good' ? 'levelup' : 'trombone' });
}

function checkSignupMilestones(s: GameState) {
  if (s.signups >= 1) milestone(s, 'first', 'First signup! (It was someone\'s mom.)');
  for (const n of [1000, 2500, 5000, 7500]) {
    if (s.signups >= n && !s.milestones.includes(`s${n}`)) {
      milestone(s, `s${n}`, `${n} signups! ${joke(s, 'toast')}`);
      addTicker(s, 'BEAR BEAT', joke(s, 'headline|bear'));
    }
  }
}

export function bearImpulse(s: GameState, id: RegionId, amount: number, spill = T.spillFactor, fullTo: RegionId[] = []) {
  const r = s.regions.find((x) => x.id === id)!;
  r.bear = clamp(r.bear + amount, 0, 1);
  for (const n of r.neighbors) {
    const nr = s.regions.find((x) => x.id === n)!;
    const k = fullTo.includes(n) ? 1 : spill;
    nr.bear = clamp(nr.bear + amount * k, 0, 1);
  }
}

export function treeImpulse(s: GameState, id: RegionId, amount: number, spill = T.spillFactor) {
  const r = s.regions.find((x) => x.id === id)!;
  r.tree = clamp(r.tree + amount, 0, 1);
  for (const n of r.neighbors) {
    const nr = s.regions.find((x) => x.id === n)!;
    nr.tree = clamp(nr.tree + amount * spill, 0, 1);
  }
}

/** Mundane Plague Inc-style spread news. Optional: over the daily popup budget they go to the ticker. */
function checkSpreadNews(s: GameState) {
  const once = (id: string, fn: () => void) => { if (!s.milestones.includes(id)) { s.milestones.push(id); fn(); } };
  const spreadTo = s.regions.filter((r) => r.id !== 'uc' && r.bear >= 0.15);
  if (spreadTo.length) {
    once('news:spread', () => showPopup(s, { kind: 'milestone', icon: '🐻', title: 'Bear Hacks begins to spread', body: `Word of Bear Hacks has left the UC system. Students in ${spreadTo[0].name} are asking what it is.`, regionId: spreadTo[0].id }, true, 'BEAR BEAT'));
  }
  if (s.signups >= 500) once('news:talk', () => showPopup(s, { kind: 'milestone', icon: '💬', title: 'People are beginning to talk about Bear Hacks', body: 'Group chats across the country now contain the phrase "wait, is Bear Hacks free?"' }, true, 'BEAR BEAT'));
  if (s.signups >= 3000) once('news:national', () => showPopup(s, { kind: 'milestone', icon: '📰', title: 'Bear Hacks goes national', body: 'A local news anchor called Bear Hacks "a hackathon." That is technically correct, the best kind of correct.' }, true, 'BEAR BEAT'));
  for (const r of s.regions) {
    if (r.id !== 'uc' && r.bear >= 0.5) once(`news:region:${r.id}`, () => showPopup(s, { kind: 'milestone', icon: '📍', title: `Bear Hacks is big in ${r.name}`, body: `Half of ${r.name} has heard of Bear Hacks. The other half is pretending not to have.`, regionId: r.id }, true, 'BEAR BEAT'));
  }
}
