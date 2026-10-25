// Small shared helpers. No DOM.
import { TASK_ROLES } from '../content/members';
import { SPONSORS, SPONSOR_BY_ID, TIER_INFO, type SponsorDef } from '../content/sponsors';
import { T } from './config';
import { clamp, rand, weighted } from './rng';
import type { Fx, GameState, Member, RegionId, Role, Task, TechId, TickerCat } from './types';

export { startCourting } from './courting';

export const hasTech = (s: GameState, id: TechId) => s.unlockedTech.includes(id);
export const hasRole = (s: GameState, r: Role | string) => s.members.some((m) => m.role === r);
export const memberById = (s: GameState, id: number | undefined) => s.members.find((m) => m.id === id);
export const region = (s: GameState, id: RegionId) => s.regions.find((r) => r.id === id)!;

export function fx(s: GameState, e: Fx) {
  s.fx.push(e);
  if (s.fx.length > 200) s.fx.splice(0, s.fx.length - 200);
}

export function log(s: GameState, kind: string, text: string, value?: number) {
  s.log.push({ day: s.day, kind, text, value });
}

export function addTicker(s: GameState, cat: TickerCat, text: string) {
  s.ticker.push({ id: ++s.uid, cat, text });
  if (s.ticker.length > 30) s.ticker.splice(0, s.ticker.length - 30);
}

export function addRep(s: GameState, d: number) {
  s.reputation = clamp(s.reputation + d, 0, s.repCap);
}

/** Effective skill of a member on a task (Section 6.1). Returns 0 when idle. */
export function effectiveSkill(s: GameState, m: Member, task: Task | null = m.task): number {
  if (!task || m.idleSteps > 0 || m.benchedDays > 0) return 0;
  let base = m.baseSkill + m.dailyMod;
  if (m.trait === 'caffeinated') base += s.step < 10 ? 2 : -1;
  if (m.trait === 'survivor' && task === 'venue') base += 2;
  if (m.trait === 'arts' && (task === 'website' || task === 'venue')) base += 2;
  let skill = Math.min(15, Math.max(0.5, base) * s.trainingMult);
  const match = TASK_ROLES[task].includes(m.role) || m.trenchTask === task;
  if (!match) skill *= 0.3;
  if (m.trait === 'sleeper' && s.step < 6) skill *= 0.8;
  if (m.trait === 'arts' && task === 'research') skill *= 0.5;
  return skill * s.outputMult;
}

export function isMatch(m: Member, task: Task): boolean {
  return TASK_ROLES[task].includes(m.role) || m.trenchTask === task;
}

export function taskSkillSum(s: GameState, task: Task, role?: Role): number {
  return s.members.filter((m) => m.task === task && (!role || m.role === role)).reduce((a, m) => a + effectiveSkill(s, m), 0);
}

export function roleSkillSum(s: GameState, role: Role): number {
  return s.members.filter((m) => m.role === role).reduce((a, m) => a + Math.min(15, m.baseSkill * s.trainingMult), 0);
}

export function socialSkillSum(s: GameState): number {
  return taskSkillSum(s, 'social');
}

/** 📱 post bubbles per day: one, plus one per Social Media member on Social (Content Calendar raises the cap). */
export function postsPerDay(s: GameState): number {
  const socials = s.members.filter((m) => m.task === 'social' && m.role === 'social' && m.benchedDays === 0).length;
  const cap = 3 + (hasTech(s, 'reelposts') ? 1 : 0) + (hasTech(s, 'influencers') ? 1 : 0) + (hasTech(s, 'ugc') ? 1 : 0);
  return Math.min(cap, 1 + socials);
}


export function equityCut(s: GameState): number {
  return Math.min(T.equityCap, Number(s.flags.equitySold ?? 0));
}

export function removeMember(s: GameState, id: number) {
  s.members = s.members.filter((m) => m.id !== id);
}

export function removeSponsor(s: GameState, id: string) {
  s.sponsors = s.sponsors.filter((x) => x.id !== id);
  s.promises = s.promises.filter((p) => p.sponsorId !== id);
  log(s, 'sponsorLost', SPONSOR_BY_ID[id]?.name ?? id);
}

/** Sponsor tier gating by reputation (Section 6.8). */
export function sponsorAvailable(s: GameState, d: SponsorDef): boolean {
  if (s.sponsors.some((x) => x.id === d.id)) return false;
  if (s.courting?.sponsorId === d.id) return false;
  if (d.id === 'balantir') return false; // scripted Day 4 call, never a random invite
  switch (d.tier) {
    case 'partner': case 'bronze': return true;
    case 'silver': return s.reputation >= 20;
    case 'golden': return hasTech(s, 'rep2') ? s.reputation >= 35 : s.reputation >= 70;
  }
}

export function pickInviteSponsor(s: GameState): string | null {
  const avail = SPONSORS.filter((d) => sponsorAvailable(s, d));
  if (!avail.length) return null;
  const quality = taskSkillSum(s, 'sponsors', 'coordinator');
  return weighted(s, avail, (d) => {
    const rank = TIER_INFO[d.tier].rank;
    return 1 + rank * quality * 0.05 + (d.id === 'ysee' && s.day >= 3 ? 0.6 : 0);
  }).id;
}

export function rngPickRegion(s: GameState, weights?: Partial<Record<RegionId, number>>): RegionId {
  return weighted(s, s.regions, (r) => weights?.[r.id] ?? 1).id;
}

export function uniform(s: GameState) { return rand(s); }
