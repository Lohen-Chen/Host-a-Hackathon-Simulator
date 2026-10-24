// The hype map: per-step virus-style spread (Section 6.3). No DOM.
import { MODES, STEPS_PER_DAY, T } from './config';
import { addTicker, fx, hasTech, log } from './helpers';
import { isTreeControlled, joke } from './jokes';
import { clamp, chance, rand, weighted } from './rng';
import type { GameState, RegionId } from './types';

export function repFactor(rep: number) {
  return clamp(0.66 + 0.003 * rep, 0, 0.95);
}

/** Tree's off-map hackers (its own campus mailing lists), scaled by hype. */
export function treeBase(s: GameState) {
  return 30 + s.treeHype * 1.0;
}

export function stepMap(s: GameState) {
  const rs = s.regions;
  const byId = new Map(rs.map((r) => [r.id, r]));
  const spreadK = T.spread * (1 + s.reputation / 100);
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

  const rf = repFactor(s.reputation);
  const promo = hasTech(s, 'promo') ? 1 : 0;
  const appl = hasTech(s, 'applications') ? 0.85 : 1;
  const treeRf = repFactor(s.treeHype * 0.7);
  let total = 0;
  let treeTotal = 0;
  rs.forEach((r, i) => {
    const control = clamp(r.bear - T.treeControlPenalty * r.tree, 0, 1);
    const target = r.pop * r.conv * control * rf * (1 + T.promoBonus * promo) * appl;
    const before = r.signups;
    r.signups += T.signupLerp * (target - r.signups);
    const tControl = clamp(r.tree - T.treeControlPenalty * r.bear, 0, 1);
    const tTarget = r.pop * r.conv * tControl * treeRf;
    r.treeSignups += T.signupLerp * (tTarget - r.treeSignups);
    total += r.signups;
    treeTotal += r.treeSignups;
    const drop = before - r.signups;
    if (drop >= 6) fx(s, { kind: 'defect', regionId: r.id, value: -Math.round(drop), text: `−${Math.round(drop)} DEFECTED`, tone: 'bad' });
    const nowTree = isTreeControlled(r);
    if (nowTree !== wasTree[i]) regionFlipped(s, r.id, nowTree);
  });
  s.signups = Math.max(0, total + s.bonusSignups);
  s.treeSignups = treeTotal + treeBase(s);
  checkSignupMilestones(s);
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
  for (const n of [100, 250, 500, 750]) {
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
