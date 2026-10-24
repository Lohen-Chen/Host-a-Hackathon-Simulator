// Bridge between GameState and the mad-lib engine. The engine is loaded once
// (UI: Vite ?raw imports; Node: fs) and kept outside the serializable state.
import { JokeEngine, type RenderContext } from '../jokes/engine';
import { ROLE_INFO } from '../content/members';
import { SPONSORS, SPONSOR_BY_ID } from '../content/sponsors';
import { VENUE_BY_ID, VENUES } from '../content/venues';
import { rngFn } from './rng';
import type { GameState, RegionId } from './types';

let engine: JokeEngine | null = null;
let loadErrors: string[] = [];

export function initJokes(jokesTxt: string, wordbankTxt: string): string[] {
  const r = JokeEngine.load(jokesTxt, wordbankTxt);
  engine = r.engine;
  loadErrors = r.errors;
  return r.errors;
}
export const jokeEngine = () => engine;
export const jokeErrors = () => loadErrors;

export const RIVAL = 'Tree University';
export const RIVAL_CEO = 'Leland Sr.';

/** Hand-written safe lines used whenever a render fails (Section 8.3). */
const FALLBACK: Record<string, string> = {
  headline: 'Hackathon season continues; everyone is tired and thrilled',
  comment: '"ok this is actually funny"',
  outcome: 'It happened. We are choosing not to talk about it.',
  bubble: 'Nice catch!',
  taunt: '"Is that your final bid? Adorable."',
  award: 'Most Likely to Do It Again Next Year',
  bio: 'Has opinions about tabs vs. spaces.',
  project: 'An AI wrapper (with feelings)',
  toast: 'The group chat is screaming.',
  roast: 'It was a hackathon. It happened.',
  praise: 'Genuinely impressive. Suspiciously so.',
  techjoke: 'Coming soon. Like every founder\'s product.',
  courting: "So, tell me about your hackathon.",
  loading: 'Loading… (the venue WiFi would still be "connecting")',
  linkedin: "I'm pleased to announce our hackathon. Humbled. Grateful. Agree? 👇",
  name: 'Gavin from Finance',
  tease: 'Tree University is planning something. It involves synergy.',
  recap: 'Another day survived.',
};

export interface SlotOverrides { member?: string; region?: string; sponsor?: string; role?: string; [k: string]: string | number | undefined }

export function slotsFor(s: GameState, o: SlotOverrides = {}): RenderContext['slots'] {
  const signed = s.sponsors.map((x) => SPONSOR_BY_ID[x.id]?.name).filter(Boolean) as string[];
  const treeRegions = treeRegionCount(s);
  const base: RenderContext['slots'] = {
    sponsor: signed.length ? signed : SPONSORS.map((x) => x.name),
    member: s.members.length ? s.members.map((m) => m.name) : ['the club president'],
    role: s.members.length ? s.members.map((m) => ROLE_INFO[m.role].name) : ['Organizer'],
    venue: s.venue ? VENUE_BY_ID[s.venue].name : VENUES.map((v) => v.name),
    region: s.regions.map((r) => r.name),
    rival: RIVAL,
    rivalceo: RIVAL_CEO,
    signups: Math.round(s.signups),
    treesignups: Math.round(s.treeSignups),
    day: s.day,
    treeRegions,
    score: s.results ? Math.round(s.results.bear.total) : 0,
    equitySold: Number(s.flags.equitySold ?? 0),
    budget: `$${Math.round(s.budget).toLocaleString('en-US')}`,
    lead: Math.abs(Math.round(s.signups - s.treeSignups)),
  };
  for (const [k, v] of Object.entries(o)) if (v !== undefined) base![k] = v;
  return base;
}

export function needsFor(s: GameState): RenderContext['needs'] {
  return {
    signups: s.signups, day: s.day, treeRegions: treeRegionCount(s), rep: s.reputation, budget: s.budget,
    sponsors: s.sponsors.length, website: s.websiteScore, treesignups: s.treeSignups, lead: s.signups - s.treeSignups,
    equitySold: Number(s.flags.equitySold ?? 0), wifiPain: Number(s.flags.wifiPain ?? 0),
  };
}

function ctxFor(s: GameState, o?: SlotOverrides): RenderContext {
  return { rng: rngFn(s), slots: slotsFor(s, o), needs: needsFor(s), history: s.jokeHistory };
}

/** Render a random template for `key`, with a safe hand-written fallback. */
export function joke(s: GameState, key: string, o?: SlotOverrides): string {
  const out = engine?.pick(key, ctxFor(s, o)) ?? null;
  return out ?? FALLBACK[key.split('|')[0]] ?? FALLBACK.outcome;
}

/** Same as joke() but returns null if the key has no templates (so callers can chain). */
export function tryJoke(s: GameState, key: string, o?: SlotOverrides): string | null {
  return engine?.pick(key, ctxFor(s, o)) ?? null;
}

/** Fill slots in a hand-written line (alert text, outcomes). Falls back to the raw text minus braces. */
export function fill(s: GameState, text: string, o?: SlotOverrides): string {
  if (!text.includes('{')) return text;
  const out = engine?.render(text, ctxFor(s, o)) ?? null;
  return out ?? text.replace(/\{[^}]*\}/g, 'something');
}

export function treeRegionCount(s: GameState): number {
  return s.regions.filter((r) => isTreeControlled(r)).length;
}

export function isTreeControlled(r: { bear: number; tree: number }): boolean {
  return r.tree > 0.2 && r.tree > r.bear;
}

export function regionName(s: GameState, id: RegionId): string {
  return s.regions.find((r) => r.id === id)?.name ?? id;
}
