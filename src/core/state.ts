// New game, member generation and morning setup.
import { INITIAL_AWARENESS, REGIONS, symmetricNeighbors } from '../content/regions';
import { ROLE_INFO, TRAITS } from '../content/members';
import { POSTS } from '../content/posts';
import { emptyHistory } from '../jokes/engine';
import { MODES, STEPS_PER_DAY, T } from './config';
import { hasTech, taskSkillSum } from './helpers';
import { joke } from './jokes';
import { clamp, normal, pick, rand, randInt, seedState, shuffle } from './rng';
import type { GameState, Member, Mode, PostId, Role, Task, TraitId } from './types';

const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
const ALL_TASKS: Task[] = ['research', 'social', 'website', 'venue', 'sponsors', 'recruit'];

export function newGame(seed: number, mode: Mode = 'standard', relaxed = false): GameState {
  const cfg = MODES[mode];
  const nb = symmetricNeighbors();
  const s: GameState = {
    version: 2,
    mode,
    seed,
    rngState: seedState(seed),
    day: 1,
    phase: 'intro',
    t: 0,
    step: 0,
    stepSec: cfg.daySec / STEPS_PER_DAY,
    daySec: cfg.daySec,
    budget: T.startBudget,
    techPoints: 0,
    tpAcc: 0,
    reputation: T.startRep,
    repCap: 100,
    regions: REGIONS.map((r) => ({ ...r, neighbors: nb[r.id], bear: INITIAL_AWARENESS[r.id].bear, tree: INITIAL_AWARENESS[r.id].tree, signups: 0, treeSignups: 0 })),
    treeHype: T.treeHypeStart,
    signups: 0,
    confirmed: 0,
    treeSignups: 0,
    bonusSignups: 0,
    websiteScore: 0,
    siteDownSteps: 0,
    venueScore: 0,
    ambienceBonus: 0,
    operations: 0,
    scoutPoints: 0,
    venue: null,
    treeVenue: null,
    members: [],
    candidates: [],
    rosterCap: T.rosterCap,
    nextId: 1,
    unlockedRoles: ['organizer', 'social'],
    unlockedPosts: POSTS.filter((p) => !p.unlock).map((p) => p.id),
    unlockedTech: [],
    trainingMult: 1,
    prestigeLevel: 1,
    hand: [],
    rerollsLeft: 1,
    chargesUsed: 0,
    armedPost: null,
    postsFired: 0,
    bubbles: [],
    alertQueue: [],
    schedule: [],
    popups: [],
    popupsToday: 0,
    treeNextRevealed: false,
    moodBank: 0,
    qualityBonus: 0,
    sponsorMoodDelta: 0,
    inviteBonus: 0,
    outputMult: 1,
    ignoredInvites: 0,
    sponsors: [],
    promises: [],
    courting: null,
    auction: null,
    hackday: null,
    results: null,
    ticker: [],
    tickerT: 0,
    lastInteractiveAt: -99,
    firedAlerts: [],
    flags: { equitySold: 0, founderRound: 0, wifiPain: 0, bsodDay: 0 },
    log: [],
    jokeHistory: emptyHistory(),
    milestones: [],
    dayStart: { signups: 0, confirmed: 0, budget: T.startBudget, rep: T.startRep, treeRegions: 1, treeSignups: 0, tp: 0 },
    recap: [],
    tutorialStep: 0,
    settings: { relaxed },
    fx: [],
    uid: 0,
  };
  // Day 1: three free members, guaranteed ≥1 Organizer and ≥1 Social.
  const roles: Role[] = shuffle(s, ['organizer', 'social', pick(s, ['organizer', 'social'] as Role[])]);
  for (const r of roles) {
    const m = genMember(s, [r], 0);
    m.task = defaultTask(s, m.role);
    s.members.push(m);
  }
  // Blue Screen bubble appears once per run on a random day (≤1 per run).
  s.flags.bsodDay = randInt(s, 3, 5);
  return s;
}

export function genMember(s: GameState, roles: Role[], quality: number): Member {
  const trait = pick(s, TRAIT_IDS);
  let baseSkill = clamp(Math.round(normal(s, 4 + s.reputation * 0.01 + quality, 1.8)), 1, 8);
  if (trait === 'nepo') baseSkill = randInt(s, 1, 8);
  const m: Member = {
    id: s.nextId++,
    name: joke(s, 'name'),
    bio: joke(s, 'bio'),
    role: pick(s, roles),
    baseSkill,
    trait,
    avatarSeed: Math.floor(rand(s) * 1e9),
    task: null,
    idleSteps: 0,
    dailyMod: 0,
    trenchTask: null,
    acc: 0,
    benchedDays: 0,
  };
  if (s.members.some((x) => x.name === m.name)) m.name += ' Jr.';
  return m;
}

export function candidateCount(s: GameState): number {
  const base = s.prestigeLevel === 3 ? 12 : s.prestigeLevel === 2 ? 7 : 3;
  const recruit = Number(s.flags.recruitPts ?? 0);
  return base + Math.min(5, Math.floor(recruit / 3));
}

export function dealHand(s: GameState) {
  const pool: PostId[] = shuffle(s, [...s.unlockedPosts]);
  s.hand = pool.slice(0, 3);
  s.armedPost = null;
}

/** Morning setup: candidates, hand, daily trait rolls (Section 4). */
export function prepareMorning(s: GameState) {
  s.phase = 'morning';
  const recruitQuality = Math.min(1.5, Number(s.flags.recruitPts ?? 0) * 0.05);
  const n = candidateCount(s);
  s.candidates = [];
  for (let i = 0; i < n; i++) s.candidates.push(genMember(s, s.unlockedRoles, recruitQuality));
  s.flags.recruitPts = 0;
  dealHand(s);
  s.rerollsLeft = 1;
  s.chargesUsed = 0;
  s.outputMult = 1;
  s.inviteBonus = 0;
  for (const m of s.members) {
    m.dailyMod = m.trait === 'rust10' ? randInt(s, -3, 3) : 0;
    m.trenchTask = m.trait === 'trenchcoat' ? pick(s, ALL_TASKS) : null;
    if (m.benchedDays > 0 && s.day > 1) m.benchedDays--;
    m.idleSteps = 0;
  }
  s.recap = [];
}

export function hire(s: GameState, idx: number): boolean {
  const c = s.candidates[idx];
  if (!c || s.budget < T.hireCost || s.members.length >= s.rosterCap) return false;
  s.budget -= T.hireCost;
  if (c.trait === 'nepo') s.reputation = Math.min(s.repCap, s.reputation + 3);
  s.candidates.splice(idx, 1);
  if (c.trait === 'rust10') c.dailyMod = randInt(s, -3, 3);
  if (c.trait === 'trenchcoat') c.trenchTask = pick(s, ALL_TASKS);
  c.task = defaultTask(s, c.role);
  s.members.push(c);
  return true;
}

/** New crew start on their specialty (Designers scout the venue until the Website node exists). */
export function defaultTask(s: GameState, role: Role): Task {
  const t = ROLE_INFO[role].task;
  return canAssign(s, t) ? t : 'venue';
}

export function canAssign(s: GameState, task: Task | null): boolean {
  return task !== 'website' || hasTech(s, 'website');
}

export function assign(s: GameState, memberId: number, task: Task | null): boolean {
  const m = s.members.find((x) => x.id === memberId);
  if (!m || !canAssign(s, task)) return false;
  if (m.task === task) return true;
  // Reassignment ramp: one step of no output, unless they've pivoted four times already.
  if (m.task !== null && m.trait !== 'pivoted' && s.phase === 'live') m.idleSteps = Math.max(m.idleSteps, 1);
  m.task = task;
  return true;
}

export function coordinatorSkill(s: GameState): number {
  return taskSkillSum(s, 'sponsors', 'coordinator');
}
