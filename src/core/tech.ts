// The Plague Inc-style evolution menu: three branches feeding three bars (Hype, Organization, Talent).
// Buying does not pause the clock. Rumors unlock a random node for free ("mutations").
import { TECH, TECH_BY_ID } from '../content/techTree';
import { T } from './config';
import { fx, log } from './helpers';
import { bearImpulse } from './map';
import { showPopup } from './popups';
import { pick } from './rng';
import type { GameState, TechBranch, TechId } from './types';

export type TechState = 'owned' | 'available' | 'locked' | 'poor';

/** Each bar starts low and fills as nodes are unlocked (0–100). */
const BAR_BASE = 10;

export function bar(s: GameState, b: TechBranch): number {
  let v = BAR_BASE;
  for (const id of s.unlockedTech) v += TECH_BY_ID[id]?.bars[b] ?? 0;
  return Math.min(100, v);
}

/** Plague Inc rule: every node you evolve makes the rest pricier, so you can't buy the whole tree and have to pick a direction.
 * Rumor unlocks are free and don't count. */
export function techMarkup(s: GameState): number {
  return Math.floor(Number(s.flags.evolved ?? 0) / T.techMarkupEvery);
}

export function techCost(s: GameState, id: TechId): number {
  return TECH_BY_ID[id].cost + techMarkup(s);
}

export function techState(s: GameState, id: TechId): TechState {
  const n = TECH_BY_ID[id];
  if (s.unlockedTech.includes(id)) return 'owned';
  if (n.prereq && !s.unlockedTech.includes(n.prereq)) return 'locked';
  return s.techPoints >= techCost(s, id) ? 'available' : 'poor';
}

export function buyTech(s: GameState, id: TechId): boolean {
  if (techState(s, id) !== 'available') return false;
  const n = TECH_BY_ID[id];
  const cost = techCost(s, id);
  s.techPoints -= cost;
  s.flags.evolved = Number(s.flags.evolved ?? 0) + 1;
  unlock(s, id);
  fx(s, { kind: 'toast', text: `Unlocked: ${n.name}. ${n.effect}`, tone: 'good' });
  log(s, 'tech', id, cost);
  return true;
}

function unlock(s: GameState, id: TechId) {
  s.unlockedTech.push(id);
  switch (id) {
    case 'clubfair': s.unlockedRoles.push('recruiter'); break;
    case 'design': s.unlockedRoles.push('designer'); break;
    case 'logistics': s.unlockedRoles.push('logistics'); break;
    case 'coordinator': s.unlockedRoles.push('coordinator'); break;
    case 'training2': s.trainingMult = Math.max(s.trainingMult, 1.5); break;
    case 'training3': s.trainingMult = 1.7; break;
    case 'prestige1': s.prestigeLevel = 1; break;
    case 'prestige2': s.prestigeLevel = 2; break;
    case 'prestige3': s.prestigeLevel = 3; break;
    case 'website': s.unlockedPosts.push('reel', 'countdown'); break;
    case 'promo': s.unlockedPosts.push('influencer'); break;
    case 'rep2': s.repCap = 150; break;
    case 'rep3': s.repCap = 200; break;
    case 'sfbus': s.reputation = Math.min(s.repCap, s.reputation + 8); bearImpulse(s, 'twitter', 0.12); break;
    case 'poker': bearImpulse(s, 'frat', 0.12); bearImpulse(s, 'twitter', 0.06); s.moodBank += 2; break;
    case 'hackad': s.bonusSignups += 150; break;
    case 'olympiad': s.qualityBonus += 4; bearImpulse(s, 'highschools', 0.12); break;
    case 'workshops': s.qualityBonus += 3; s.moodBank += 2.5; break;
    case 'highsignal': s.qualityBonus += 6; break;
    case 'leetcode': s.qualityBonus += 6; break;
    case 'resumebook': s.sponsorMoodDelta += 5; for (const sp of s.sponsors) sp.mood += 5; break;
    case 'swag': s.moodBank += 2.5; break;
    case 'aicredits': aiCreditsNews(s); break;
    default: break;
  }
  fx(s, { kind: 'sfx', sfx: 'levelup' });
}

/** "The addition of AI credits has increased the participation of business majors by 200%." */
export function aiCreditsNews(s: GameState) {
  if (s.flags.aiNews) return;
  s.flags.aiNews = 1;
  s.bonusSignups += 300;
  s.qualityBonus -= 3;
  showPopup(s, {
    kind: 'news', icon: '💼', title: 'Business majors discover hackathons',
    body: 'The addition of AI credits has increased the participation of business majors by 200%. Several have asked where the "networking track" is.',
    effect: '+300 interested hackers · project quality −3',
  }, false);
}

/** Nodes a rumor could unlock right now: not owned, prereq met. */
export function rumorCandidates(s: GameState): TechId[] {
  return TECH.filter((n) => !s.unlockedTech.includes(n.id) && (!n.prereq || s.unlockedTech.includes(n.prereq))).map((n) => n.id);
}

/** A rumor spreads and mutates the tech tree: one random node unlocks for free. */
export function startRumor(s: GameState): TechId | null {
  const pool = rumorCandidates(s);
  if (!pool.length) return null;
  const id = pick(s, pool);
  const n = TECH_BY_ID[id];
  showPopup(s, { kind: 'rumor', icon: '🗣️', title: 'A rumor is spreading…', body: n.rumor, effect: `${n.name} unlocked for free. ${n.effect}` }, false);
  unlock(s, id);
  s.flags.rumors = Number(s.flags.rumors ?? 0) + 1;
  log(s, 'rumor', id);
  return id;
}
