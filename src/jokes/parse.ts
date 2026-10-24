// Parsers for the two human-editable joke files. No DOM imports.
//
// jokes.txt     `[category|subtag needs=expr,expr]   template text`
// wordbank.txt  `[category]` header, then one entry per line. Entries may list
//               inflected forms separated by `|` (base|3s|past|ing for verbs,
//               singular|plural for nouns).
// Lines starting with `#` are comments in both files.

export interface Need { key: string; op: '>' | '<' | '>=' | '<=' | '='; value: number }

export interface Template {
  category: string;
  subtag: string | null;
  needs: Need[];
  text: string;
  line: number;
  /** key used for no-repeat memory and selection, e.g. "headline|bear" */
  key: string;
}

export interface WordEntry { base: string; forms: string[] }

export interface ParsedJokes { templates: Template[]; errors: string[] }
export interface ParsedWords { categories: Record<string, WordEntry[]>; errors: string[] }

const HEADER_RE = /^\[([a-z0-9_]+)(?:\|([a-z0-9_]+))?((?:\s+[a-z]+=[^\]]+)*)\]\s*(.*)$/;
const NEED_RE = /^([a-zA-Z_]+)\s*(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/;

export function parseNeeds(raw: string): Need[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = NEED_RE.exec(s);
    if (!m) throw new Error(`bad needs expression "${s}"`);
    return { key: m[1], op: m[2] as Need['op'], value: Number(m[3]) };
  });
}

export function parseJokes(text: string): ParsedJokes {
  const templates: Template[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const m = HEADER_RE.exec(line);
    if (!m) { errors.push(`jokes.txt:${i + 1}: expected "[category|subtag] template", got "${line.slice(0, 60)}"`); return; }
    const [, category, subtag, attrs, body] = m;
    let needs: Need[] = [];
    for (const attr of attrs.trim().split(/\s+/).filter(Boolean)) {
      const [k, v] = attr.split('=');
      if (k !== 'needs') { errors.push(`jokes.txt:${i + 1}: unknown attribute "${k}"`); continue; }
      try { needs = parseNeeds(v); } catch (e) { errors.push(`jokes.txt:${i + 1}: ${(e as Error).message}`); }
    }
    if (!body.trim()) { errors.push(`jokes.txt:${i + 1}: empty template`); return; }
    templates.push({ category, subtag: subtag ?? null, needs, text: body.trim(), line: i + 1, key: subtag ? `${category}|${subtag}` : category });
  });
  return { templates, errors };
}

export function parseWordbank(text: string): ParsedWords {
  const categories: Record<string, WordEntry[]> = {};
  const errors: string[] = [];
  let current: string | null = null;
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const h = /^\[([a-z_]+)\]$/.exec(line);
    if (h) {
      current = h[1];
      if (categories[current]) errors.push(`wordbank.txt:${i + 1}: duplicate category [${current}]`);
      categories[current] = categories[current] ?? [];
      return;
    }
    if (!current) { errors.push(`wordbank.txt:${i + 1}: word "${line}" appears before any [category]`); return; }
    if (/[{}]/.test(line)) { errors.push(`wordbank.txt:${i + 1}: words cannot contain braces`); return; }
    const forms = line.split('|').map((s) => s.trim());
    categories[current].push({ base: forms[0], forms });
  });
  return { categories, errors };
}
