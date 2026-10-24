// npm run sim [-- --runs 2000 --mode standard]
// Plays headless games with several bots and prints score distributions (Section 13).
import { POST_BY_ID } from '../src/content/posts';
import { treeRegionCount, type Mode } from '../src/core';
import { playGame, type BotCfg } from './bots';
import { loadJokesFromDisk } from './node-content';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const RUNS = Number(arg('runs', '2000'));
const MODE = arg('mode', 'standard') as Mode;
const ONLY = arg('bot', '');

const errors = loadJokesFromDisk();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const BOTS: [string, BotCfg][] = [
  ['Random', { style: 'random', bubbleRate: 0.4, alertRate: 0.6 }],
  ['Greedy-Money', { style: 'money', bubbleRate: 0.7, alertRate: 0.9 }],
  ['Greedy-Hype', { style: 'hype', bubbleRate: 0.7, alertRate: 0.9 }],
  ['Balanced@40', { style: 'balanced', bubbleRate: 0.4, alertRate: 0.9 }],
  ['Balanced@70', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 }],
  ['Balanced@95', { style: 'balanced', bubbleRate: 0.95, alertRate: 0.95 }],
  ['Balanced@0', { style: 'balanced', bubbleRate: 0, alertRate: 0.9 }],
  ['Perfect', { style: 'perfect', bubbleRate: 1, alertRate: 1 }],
];

const q = (xs: number[], p: number) => { const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const fmt = (xs: number[]) => `p10 ${q(xs, 0.1).toFixed(0).padStart(4)}  med ${q(xs, 0.5).toFixed(0).padStart(4)}  p90 ${q(xs, 0.9).toFixed(0).padStart(4)}`;

console.log(`Host a Hackathon Simulator — balance sim · ${RUNS} runs/bot · mode=${MODE}\n`);
for (const [name, cfg] of BOTS) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) continue;
  const scores: number[] = [];
  const signups: number[] = [];
  const treeSign: number[] = [];
  const treeRegions: number[] = [];
  const confirmed: number[] = [];
  const endBudget: number[] = [];
  const attendees: number[] = [];
  const treeAtt: number[] = [];
  const pausesPerDay: number[] = [];
  const rumors: number[] = [];
  const venues: Record<string, number> = {};
  const cats: Record<string, number[]> = {};
  const usage: Record<string, number> = {};
  const overall: Record<string, number> = {};
  let wins = 0;
  let stuck = 0;
  const top: { score: number; keys: string[] }[] = [];
  for (let i = 0; i < RUNS; i++) {
    const r = playGame(1000 + i, MODE, cfg);
    if (r.stuck) { stuck++; continue; }
    const s = r.state;
    const res = s.results!;
    scores.push(res.bear.total);
    signups.push(s.signups);
    treeSign.push(s.treeSignups);
    treeRegions.push(treeRegionCount(s));
    confirmed.push(s.confirmed);
    endBudget.push(s.budget);
    attendees.push(res.attendees);
    treeAtt.push(res.treeAttendees);
    pausesPerDay.push(s.log.filter((l) => l.kind === 'popup' || (l.kind.startsWith('alert:') && l.kind !== 'alert:sponsor_invite')).length / 7);
    rumors.push(s.log.filter((l) => l.kind === 'rumor').length);
    venues[s.venue ?? 'lawn'] = (venues[s.venue ?? 'lawn'] ?? 0) + 1;
    if (res.win) wins++;
    for (const c of res.bear.categories) (cats[c.name] = cats[c.name] ?? []).push(c.value);
    const keys = [
      ...s.sponsors.map((x) => `sponsor:${x.id}`),
      ...s.unlockedTech.map((t) => `tech:${t}`),
      ...[...new Set(s.log.filter((l) => l.kind.startsWith('post:')).map((l) => `post:${l.text}`))],
      `venue:${s.venue}`,
    ];
    for (const k of keys) overall[k] = (overall[k] ?? 0) + 1;
    top.push({ score: res.bear.total, keys });
  }
  top.sort((a, b) => b.score - a.score);
  const decile = top.slice(0, Math.max(1, Math.floor(top.length / 10)));
  for (const t of decile) for (const k of t.keys) usage[k] = (usage[k] ?? 0) + 1;
  // Dominant = in >80% of top-decile runs AND noticeably more common there than overall (lift > 1.15).
  // Guaranteed content (e.g. the scripted YSee invite every run) is ubiquitous, not dominant.
  const label = (k: string) => k.replace(/^post:(.*)$/, (_, n) => `post:${Object.values(POST_BY_ID).find((p) => p.name === n)?.id ?? n}`);
  const frequent = Object.entries(usage).filter(([k, v]) => v / decile.length > 0.8 && !k.startsWith('tech:') && !k.startsWith('post:'))
    .map(([k, v]) => ({ k, top: v / decile.length, lift: (v / decile.length) / ((overall[k] ?? 1) / scores.length) }));
  const dominant = frequent.filter((f) => f.lift > 1.15).map((f) => `${label(f.k)} ${(100 * f.top).toFixed(0)}% (×${f.lift.toFixed(2)})`);
  const common = frequent.filter((f) => f.lift <= 1.15).map((f) => `${label(f.k)} ${(100 * f.top).toFixed(0)}%`);
  console.log(`■ ${name.padEnd(13)} score ${fmt(scores)} · beats Tree ${(100 * wins / Math.max(1, scores.length)).toFixed(0)}% · stuck ${stuck}`);
  console.log(`  signups ${fmt(signups)} · Tree signups med ${q(treeSign, 0.5).toFixed(0)} · Tree regions med ${q(treeRegions, 0.5)} (p10 ${q(treeRegions, 0.1)}, p90 ${q(treeRegions, 0.9)})`);
  console.log(`  confirmed ${fmt(confirmed)} · attendees med ${q(attendees, 0.5).toFixed(0)} vs Tree ${q(treeAtt, 0.5).toFixed(0)} · end budget ${fmt(endBudget)} · pauses/day ${q(pausesPerDay, 0.5).toFixed(1)} · rumors ${q(rumors, 0.5)}`);
  console.log(`  venues ${Object.entries(venues).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((100 * v) / scores.length)}%`).join(' · ')}`);
  console.log(`  ${Object.entries(cats).map(([k, v]) => `${k.split(' ')[0]} ${q(v, 0.5)}`).join(' · ')}`);
  if (dominant.length) console.log(`  DOMINANT (top-decile >80%, lift >1.15): ${dominant.join(', ')}`);
  if (common.length) console.log(`  common everywhere (not dominant): ${common.join(', ')}`);
  console.log('');
}
