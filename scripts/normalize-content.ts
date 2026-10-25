// npm run content:check
// Adapter + report for the human-authored joke files (Section 8.1): parses both files,
// fails loudly on unknown slots/categories, and prints counts, thin categories, and
// templates whose worst-case render could exceed 100 characters.
import { JokeEngine, STATE_SLOTS, parseSlot } from '../src/jokes/engine';
import { readContent } from './node-content';

const { jokes, wordbank } = readContent();
const { engine, errors } = JokeEngine.load(jokes, wordbank);

// Longest plausible values for state slots.
const STATE_MAX: Record<string, number> = {
  sponsor: 21, sponsor2: 21, member: 27, role: 12, venue: 43, region: 18, rival: 15, rivalceo: 10, mogul: 14,
  signups: 4, day: 1, treeRegions: 1, score: 3, equitySold: 2, treesignups: 4, budget: 7, lead: 4,
};

function maxLen(text: string): number {
  let len = text.replace(/\{[^}]+\}/g, '').length;
  for (const m of text.matchAll(/\{([^}]+)\}/g)) {
    const spec = parseSlot(m[1]);
    if (!spec) continue;
    let w = (STATE_SLOTS as readonly string[]).includes(spec.name) ? STATE_MAX[spec.name] ?? 20 : Math.max(...(engine.words[spec.name] ?? []).map((e) => Math.max(...e.forms.map((f) => f.length)) + (spec.mod ? 3 : 0)));
    if (spec.article) w += 3;
    len += w;
  }
  return len;
}

const byKey = new Map<string, number>();
for (const t of engine.templates) byKey.set(t.key, (byKey.get(t.key) ?? 0) + 1);
console.log(`Templates: ${engine.templates.length}`);
for (const [k, n] of [...byKey.entries()].sort()) console.log(`  ${k.padEnd(22)} ${n}`);
console.log(`\nWordbank categories: ${Object.keys(engine.words).length}`);
for (const [k, v] of Object.entries(engine.words)) console.log(`  ${k.padEnd(16)} ${String(v.length).padStart(3)}${v.length < 25 ? '   ⚠ fewer than 25 entries' : ''}`);
const long = engine.templates.map((t) => ({ t, n: maxLen(t.text) })).filter((x) => x.n > 100);
if (long.length) {
  console.log(`\n${long.length} template(s) can exceed 100 chars in the worst case (the engine retries another template at runtime):`);
  for (const { t, n } of long) console.log(`  jokes.txt:${t.line} (${n}) ${t.text}`);
}
if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s):\n` + errors.join('\n'));
  process.exit(1);
}
console.log('\n✓ content OK');
