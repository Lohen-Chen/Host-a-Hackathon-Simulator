// Sponsor courting minigame (Section 6.8). Pauses the clock while s.courting is set.
import { EXTRA_PROMISES, PROMISES } from '../content/promises';
import { REPLIES, SPONSOR_BY_ID, VIBE_SCORES } from '../content/sponsors';
import { addRep, addTicker, equityCut, fx, log, taskSkillSum } from './helpers';
import { fill, joke } from './jokes';
import { chance, pick, randInt, shuffle } from './rng';
import type { Courting, GameState, PromiseKind, ReplyType } from './types';

const SIGN_LINES = [
  '{sponsor} signs with Bear U hackathon; {rival} "not worried" (worried)',
  '{sponsor} sponsors Bear U; logo already 40% of the banner',
  'Bear U lands {sponsor}; club treasurer seen weeping into a spreadsheet',
  '{sponsor} joins Bear U hackathon; promises {food} and "synergy"',
];
const BASE_TYPES: ReplyType[] = ['buzzword', 'humble', 'hype', 'honest'];
export const BRIBE_COST = 500;

function dealReplies(s: GameState): Courting['replies'] {
  const types = [...BASE_TYPES];
  if (chance(s, 0.45)) types[randInt(s, 0, 3)] = chance(s, 0.5) ? 'bribe' : 'overpromise';
  return shuffle(s, types).map((type) => ({ type, text: fill(s, pick(s, REPLIES[type])) }));
}

export function startCourting(s: GameState, sponsorId: string, bonus: number) {
  const d = SPONSOR_BY_ID[sponsorId];
  if (!d) return;
  const coord = taskSkillSum(s, 'sponsors', 'coordinator');
  s.courting = {
    sponsorId,
    vibe: d.vibe,
    round: 0,
    interest: 18 + Math.min(14, coord * 1.2) + bonus + s.reputation * 0.06,
    line: d.pitch,
    replies: dealReplies(s),
    reaction: '',
    overpromised: false,
    bribed: false,
    result: null,
  };
  fx(s, { kind: 'sfx', sfx: 'alert' });
}

const REACTIONS: [number, string][] = [
  [22, '😍 "Now THAT is what I like to hear."'],
  [12, '🙂 "Go on…"'],
  [4, '😐 "Mm. Okay."'],
  [-100, '😬 "…I\'m going to pretend you didn\'t say that."'],
];

export function courtingReply(s: GameState, idx: number) {
  const c = s.courting;
  if (!c || c.result || !c.replies[idx]) return;
  const r = c.replies[idx];
  if (r.type === 'bribe') {
    if (s.budget < BRIBE_COST) return;
    s.budget -= BRIBE_COST;
    c.bribed = true;
  }
  if (r.type === 'overpromise') c.overpromised = true;
  const score = VIBE_SCORES[c.vibe][r.type] + randInt(s, -4, 4);
  c.interest = Math.max(0, Math.min(100, c.interest + score));
  c.reaction = REACTIONS.find(([min]) => score >= min)![1];
  c.round++;
  fx(s, { kind: 'sfx', sfx: score >= 12 ? 'cash' : score >= 4 ? 'tap' : 'error' });
  if (c.round >= 3) {
    c.result = settle(s, c);
  } else {
    c.line = joke(s, `courting|${c.vibe}`, { sponsor: SPONSOR_BY_ID[c.sponsorId].name });
    c.replies = dealReplies(s);
  }
}

function settle(s: GameState, c: Courting): NonNullable<Courting['result']> {
  const d = SPONSOR_BY_ID[c.sponsorId];
  if (c.interest < 35) return { outcome: 'walk', money: 0, promises: [], text: `${d.name} walked away. They said "let's circle back." They will not circle back.` };
  const premium = c.interest >= 70;
  let money = d.money * (premium ? 1 : 0.6) * (c.overpromised ? 1.25 : 1);
  money = Math.round((money * (1 - equityCut(s) / 100)) / 100) * 100;
  const kinds: PromiseKind[] = [d.promise];
  if (premium && chance(s, 0.4)) kinds.push(pick(s, EXTRA_PROMISES.filter((k) => k !== 'logo_moon')));
  if (c.overpromised) kinds.push(pick(s, ['attendees500', 'logo_moon', 'site80'] as PromiseKind[]));
  const uniq = [...new Set(kinds)];
  const cut = equityCut(s) > 0 ? ` (minus ${equityCut(s)}% for the cap table)` : '';
  const text = premium
    ? `Premium deal! ${d.name}: ${money ? '$' + money.toLocaleString('en-US') : 'in-kind'}${cut} + perk "${d.perk}".`
    : `Basic deal. ${d.name}: ${money ? '$' + money.toLocaleString('en-US') : 'in-kind'}${cut}. No perk. Some dignity.`;
  return { outcome: premium ? 'premium' : 'basic', money, promises: uniq.map((k) => PROMISES[k].text), text };
}

/** Close the minigame and apply the deal. */
export function finishCourting(s: GameState) {
  const c = s.courting;
  if (!c) return;
  if (!c.result) {
    // Abandoned mid-way: treat as a walk-away.
    c.result = { outcome: 'walk', money: 0, promises: [], text: '' };
  }
  const d = SPONSOR_BY_ID[c.sponsorId];
  if (c.result.outcome !== 'walk') {
    s.budget += c.result.money;
    s.sponsors.push({ id: d.id, money: c.result.money, premium: c.result.outcome === 'premium', mood: c.result.outcome === 'premium' ? 60 : 50, day: s.day });
    const kinds = Object.entries(PROMISES).filter(([, p]) => c.result!.promises.includes(p.text)).map(([k]) => k as PromiseKind);
    for (const k of kinds) s.promises.push({ uid: ++s.uid, sponsorId: d.id, kind: k, text: PROMISES[k].text });
    if (c.result.outcome === 'premium' && d.perkFx.rep) addRep(s, d.perkFx.rep);
    addTicker(s, 'SPONSOR WIRE', fill(s, pick(s, SIGN_LINES), { sponsor: d.name }));
    log(s, 'sponsor', d.name, c.result.money);
    fx(s, { kind: 'banner', text: `${d.name} signed!`, tone: 'good' });
    fx(s, { kind: 'sfx', sfx: 'levelup' });
  } else {
    log(s, 'sponsorWalk', d.name);
    fx(s, { kind: 'sfx', sfx: 'trombone' });
  }
  s.courting = null;
}
