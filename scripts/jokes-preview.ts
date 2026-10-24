// npm run jokes:preview [-- --n 50 --key headline]
// Prints random renders for human eyeballing (Section 8.4).
import { newGame } from '../src/core';
import { jokeEngine } from '../src/core/jokes';
import { needsFor, slotsFor } from '../src/core/jokes';
import { problems } from '../src/jokes/validate';
import { loadJokesFromDisk } from './node-content';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const N = Number(arg('n', '50'));
const KEY = arg('key', '');

const errors = loadJokesFromDisk();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const e = jokeEngine()!;
const s = newGame(Number(arg('seed', String(Date.now() % 100000))), 'standard');
s.signups = 420; s.treeSignups = 380; s.day = 4; s.sponsors = [{ id: 'ysee', money: 15000, premium: true, mood: 60, day: 2 }];
const pool = KEY ? e.templatesFor(KEY) : e.templates;
for (let i = 0; i < N; i++) {
  const t = pool[Math.floor(Math.random() * pool.length)];
  const out = e.render(t.text, { rng: Math.random, slots: slotsFor(s), needs: needsFor(s), history: s.jokeHistory });
  const p = problems(out);
  console.log(`${t.key.padEnd(18)} ${out}${p.length ? `   ⚠ ${p.join(', ')}` : ''}`);
}
