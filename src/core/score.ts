// Eight-category scoring for both hackathons (Section 6.12).
import { PROMISES, type PromiseCtx } from '../content/promises';
import { SPONSOR_BY_ID, TIER_INFO } from '../content/sponsors';
import { TREE_BACKUP, VENUE_BY_ID } from '../content/venues';
import { T } from './config';
import { hasRole, hasTech, roleSkillSum } from './helpers';
import { joke, tryJoke } from './jokes';
import { clamp, randRange } from './rng';
import { bar } from './tech';
import type { GameState, ScoreBreakdown } from './types';

export const CATEGORIES = [
  { id: 'attendance', name: 'Attendance', weight: 0.2 },
  { id: 'mood', name: 'Participant mood', weight: 0.15 },
  { id: 'sponsor', name: 'Sponsor quality', weight: 0.1 },
  { id: 'sponsormood', name: 'Sponsor mood', weight: 0.1 },
  { id: 'amenities', name: 'Amenities', weight: 0.1 },
  { id: 'promises', name: 'Promises kept', weight: 0.1 },
  { id: 'artistic', name: 'Artistic value', weight: 0.1 },
  { id: 'quality', name: 'Project quality', weight: 0.15 },
] as const;

export function grade(total: number): ScoreBreakdown['grade'] {
  return total >= 88 ? 'S' : total >= 76 ? 'A' : total >= 64 ? 'B' : total >= 52 ? 'C' : total >= 40 ? 'D' : 'F';
}

export interface EventFacts {
  expected: number;
  attendees: number;
  cap: number;
  overflow: number;
  dumpster: boolean;
  protest: boolean;
  kept: number;
  broken: number;
}

export function venueCap(s: GameState) {
  return VENUE_BY_ID[s.venue ?? 'lawn'].cap;
}

/** Share of confirmed hackers who actually show up. */
export function showRate(s: GameState) {
  return clamp(T.showRateBase + (hasTech(s, 'reminders') ? 0.05 : 0) + 0.0008 * s.reputation + s.moodBank * 0.003 + s.websiteScore / 2000, 0.6, 0.97);
}

/** Confirmed hackers × show rate, plus a trickle of unconfirmed walk-ins. */
export function expectedAttendees(s: GameState) {
  return s.confirmed * showRate(s) + Math.max(0, s.signups - s.confirmed) * T.walkInRate;
}

export function attendanceScore(attendees: number, expected: number, cap: number): number {
  const abs = 100 * Math.min(1, attendees / T.attendanceFull);
  const fill = expected / cap;
  const fit = fill < 0.45 ? 0.7 + 0.66 * fill : fill <= 1.05 ? 1 : Math.max(0.55, 1 - (fill - 1.05) * 0.9);
  return clamp(abs * fit, 0, 100);
}

export function promiseCtx(s: GameState, attendees: number): PromiseCtx {
  return { s, attendees, venueCap: venueCap(s), hasRole: (r) => hasRole(s, r) };
}

/** Marks every promise kept/broken and applies sponsor moods. */
export function checkPromises(s: GameState, attendees: number) {
  const ctx = promiseCtx(s, attendees);
  for (const p of s.promises) {
    p.kept = PROMISES[p.kind].check(ctx);
    const sp = s.sponsors.find((x) => x.id === p.sponsorId);
    if (sp) sp.mood += p.kept ? 12 : -22;
  }
}

function line(s: GameState, cat: string, good: boolean): string {
  return tryJoke(s, `${good ? 'praise' : 'roast'}|${cat}`) ?? joke(s, good ? 'praise' : 'roast');
}

export function scoreBear(s: GameState, f: EventFacts): ScoreBreakdown {
  const v = VENUE_BY_ID[s.venue ?? 'lawn'];
  const wifi = Number(s.flags.wifiPain ?? 0);
  const premium = s.sponsors.filter((x) => x.premium).map((x) => SPONSOR_BY_ID[x.id]);
  const allSp = s.sponsors.map((x) => SPONSOR_BY_ID[x.id]);
  const perkMood = premium.reduce((a, d) => a + (d.perkFx.mood ?? 0) - (d.perkFx.riot ?? 0), 0) + allSp.filter((d) => d.tier === 'partner').length * 2;
  const perkQuality = premium.reduce((a, d) => a + (d.perkFx.quality ?? 0), 0);
  const traitMood = s.members.filter((m) => m.trait === 'veteran' || m.trait === 'grass').length * 2;
  const bsod = s.flags.bsod === 'haunted' ? -6 : s.flags.bsod === 'rebooted' ? 2 : 0;
  const afterparty = s.flags.afterparty === 'official' ? 4 : 0;

  const attendance = attendanceScore(f.attendees, f.expected, f.cap);
  const mood = clamp(38 + s.moodBank * 1.6 + (hasTech(s, 'snack') ? 8 : 0) + perkMood + v.ambience * 1.5 + Math.min(10, s.operations * 1.2)
    + traitMood + bsod + afterparty - (f.protest ? 15 : 0) - wifi * 2.5 - f.broken * 4 - (f.overflow > 0 ? 10 : 0) - (f.dumpster ? 15 : 0), 0, 100);
  const sponsor = s.sponsors.length
    ? clamp(s.sponsors.reduce((a, x) => a + TIER_INFO[SPONSOR_BY_ID[x.id].tier].points * (x.premium ? 1 : 0.6), 0) * 0.7 + 8, 0, 100)
    : 8;
  const sponsormood = s.sponsors.length
    ? clamp(s.sponsors.reduce((a, x) => a + x.mood, 0) / s.sponsors.length - s.ignoredInvites * 3, 0, 100)
    : clamp(25 - s.ignoredInvites * 3, 0, 100);
  const amenities = clamp(20 + (hasTech(s, 'snack') ? 22 : 0) + Math.min(24, roleSkillSum(s, 'logistics') * 2.5) + Math.min(14, s.operations * 1.6)
    + (f.dumpster ? -22 : 8) + allSp.filter((d) => d.id === 'doordish' || d.id === 'bubbletrouble').length * 7 - wifi * 4, 0, 100);
  const promises = f.kept + f.broken ? (100 * f.kept) / (f.kept + f.broken) : 40;
  const artistic = clamp(10 + s.websiteScore * 0.6 + v.ambience * 5 + Math.min(16, s.ambienceBonus * 2.2) + (s.flags.dog === 'rented' ? 3 : 0), 0, 100);
  const avgSkill = s.members.length ? s.members.reduce((a, m) => a + m.baseSkill, 0) / s.members.length : 3;
  const quality = clamp(14 + perkQuality + s.qualityBonus + (hasTech(s, 'mentors') ? 8 : 0) + mood * 0.15 + avgSkill * 2.2 + (s.trainingMult - 1) * 14 + bar(s, 'talent') * 0.25, 0, 100);

  const values: Record<string, number> = { attendance, mood, sponsor, sponsormood, amenities, promises, artistic, quality };
  const categories = CATEGORIES.map((c) => ({ ...c, value: Math.round(values[c.id]), line: line(s, c.id, values[c.id] >= 60) }));
  const total = Math.round(categories.reduce((a, c) => a + c.value * c.weight, 0));
  return { categories, total, grade: grade(total) };
}

export function treeAttendees(s: GameState): { attendees: number; expected: number; cap: number } {
  const cap = s.treeVenue ? VENUE_BY_ID[s.treeVenue].cap : TREE_BACKUP.cap;
  // Tree is rich: it confirms everyone it can, so its show rate is its whole conversion.
  const expected = s.treeSignups * clamp(0.72 + s.treeHype * 0.0015, 0.5, 0.9);
  return { attendees: Math.min(expected, cap), expected, cap };
}

export function scoreTree(s: GameState): ScoreBreakdown {
  const t = treeAttendees(s);
  const amb = s.treeVenue ? VENUE_BY_ID[s.treeVenue].ambience : TREE_BACKUP.ambience;
  const stumble = s.log.some((l) => l.kind === 'treeStumble') ? -8 : 0;
  const values: Record<string, number> = {
    attendance: attendanceScore(t.attendees, t.expected, t.cap),
    mood: clamp(50 + s.treeHype * 0.12 + randRange(s, -8, 8) + stumble, 0, 100),
    sponsor: clamp(50 + s.treeHype * 0.25, 0, 100),
    sponsormood: clamp(52 + randRange(s, -10, 10), 0, 100),
    amenities: clamp(58 + randRange(s, -8, 8), 0, 100),
    promises: clamp(62 + randRange(s, -12, 12), 0, 100),
    artistic: clamp(36 + amb * 4 + randRange(s, -6, 6), 0, 100),
    quality: clamp(54 + randRange(s, -10, 10) + stumble, 0, 100),
  };
  const TREE_LINES: Record<string, string> = {
    attendance: 'Tree U filled the room. Mostly with Leland Sr.\'s phone chargers.',
    mood: 'Tree hackers rated the vibes "synergistic." Nobody knows what that means.',
    sponsor: 'Tree had sponsors. All of them were Leland Sr.\'s golf buddies.',
    sponsormood: 'Tree sponsors were "aligned." They seemed tired.',
    amenities: 'Tree had catering. On a boat. The boat left early.',
    promises: 'Tree promised synergy. Delivered a keynote about synergy.',
    artistic: 'Tree\'s website: a stock photo of a tree. Bold.',
    quality: 'Every Tree project was an AI wrapper with a waitlist.',
  };
  const categories = CATEGORIES.map((c) => ({ ...c, value: Math.round(values[c.id]), line: TREE_LINES[c.id] }));
  const total = Math.round(categories.reduce((a, c) => a + c.value * c.weight, 0));
  return { categories, total, grade: grade(total) };
}
