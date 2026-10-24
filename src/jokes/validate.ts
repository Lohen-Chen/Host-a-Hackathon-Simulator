// Output validators for rendered jokes (Section 8.4). No DOM.
import { article } from './inflect';

export const MAX_LEN = 100;

/** Small PG-13 guard for the wordbank and rendered text. Matches whole words only. */
const BLOCKLIST = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'porn', 'nazi', 'rape', 'retard', 'whore', 'slut', 'raccoon'];
const BLOCK_RE = new RegExp(`\\b(${BLOCKLIST.join('|')})\\w*\\b`, 'i');

export function blocked(text: string): string | null {
  const m = BLOCK_RE.exec(text);
  return m ? m[0] : null;
}

/** Returns a list of problems with one rendered line. Empty list = clean. */
export function problems(out: string | null): string[] {
  if (out === null) return ['render failed'];
  const p: string[] = [];
  if (out.trim() === '') p.push('empty render');
  if (/ {2}/.test(out)) p.push('double space');
  if (/\b(a|an) (a|an)\b/.test(out)) p.push('"a a" / "an a"');
  if (/[{}]/.test(out)) p.push('unresolved braces');
  if (out.length > MAX_LEN) p.push(`too long (${out.length} > ${MAX_LEN})`);
  if (/ [,.!?;:]/.test(out)) p.push('space before punctuation (empty slot?)');
  if (/\bthe the\b/i.test(out)) p.push('"the the"');
  // Lowercase only: a capital "A" is too often a letter ("Plan A is", "Series A round").
  for (const m of out.matchAll(/(?:^|[\s"“(])(a|an) ([“"'(]?[A-Za-z0-9][\w-]*)/g)) {
    const expect = article(m[2]);
    if (m[1].toLowerCase() !== expect) p.push(`wrong article: "${m[0]}" (expected "${expect}")`);
  }
  const bad = blocked(out);
  if (bad) p.push(`blocklisted word "${bad}"`);
  return p;
}
