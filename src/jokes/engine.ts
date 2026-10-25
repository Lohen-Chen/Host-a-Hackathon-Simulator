// Mad-lib renderer. Pure: no DOM, no Math.random (all randomness comes from the caller's RNG).
import { article, capitalize, inflect, type Modifier } from './inflect';
import { parseJokes, parseWordbank, type Need, type Template, type WordEntry } from './parse';

/** Slots filled from GameState, never from the wordbank (Section 8.3). */
export const STATE_SLOTS = [
  'sponsor', 'sponsor2', 'member', 'role', 'venue', 'region', 'rival', 'rivalceo', 'mogul',
  'signups', 'day', 'treeRegions', 'score', 'equitySold', 'treesignups', 'budget', 'lead',
] as const;
export type StateSlot = (typeof STATE_SLOTS)[number];

export const NEED_KEYS = ['signups', 'day', 'treeRegions', 'rep', 'budget', 'sponsors', 'website', 'treesignups', 'lead', 'equitySold', 'wifiPain'] as const;

export interface JokeHistory { t: Record<string, number[]>; w: Record<string, string[]> }
export const emptyHistory = (): JokeHistory => ({ t: {}, w: {} });

export interface RenderContext {
  rng: () => number;
  /** Values for state slots. An array means "pick one" (sponsor2 avoids repeating sponsor). */
  slots?: Partial<Record<string, string | number | string[]>>;
  needs?: Partial<Record<string, number>>;
  history?: JokeHistory;
}

const TEMPLATE_MEMORY = 8;
const WORD_MEMORY = 20;
const SLOT_RE = /\{([^{}]+)\}/g;
const SLOT_INNER_RE = /^(?:([aA]):)?([A-Za-z_]+?)(\d?)(?::(past|ing|3s|pl))?(?:#(\d+))?$/;

interface SlotSpec { article: 'a' | 'A' | null; name: string; cap: boolean; mod: Modifier | null; ref: number | null; raw: string }

export function parseSlot(inner: string): SlotSpec | null {
  const m = SLOT_INNER_RE.exec(inner);
  if (!m) return null;
  const [, art, nameRaw, digit, mod, ref] = m;
  const name = nameRaw[0].toLowerCase() + nameRaw.slice(1) + (digit ?? '');
  return { article: (art as 'a' | 'A') ?? null, name, cap: nameRaw[0] !== nameRaw[0].toLowerCase(), mod: (mod as Modifier) ?? null, ref: ref ? Number(ref) : null, raw: inner };
}

function needOk(n: Need, ctx: Partial<Record<string, number>>): boolean {
  const v = ctx[n.key];
  if (v === undefined) return false;
  switch (n.op) {
    case '>': return v > n.value;
    case '<': return v < n.value;
    case '>=': return v >= n.value;
    case '<=': return v <= n.value;
    case '=': return v === n.value;
  }
}

export class JokeEngine {
  readonly byKey = new Map<string, Template[]>();
  readonly byCategory = new Map<string, Template[]>();

  constructor(readonly templates: Template[], readonly words: Record<string, WordEntry[]>) {
    for (const t of templates) {
      if (!this.byKey.has(t.key)) this.byKey.set(t.key, []);
      this.byKey.get(t.key)!.push(t);
      if (!this.byCategory.has(t.category)) this.byCategory.set(t.category, []);
      this.byCategory.get(t.category)!.push(t);
    }
  }

  /** Parse both files and check every slot. Unknown slots or empty categories are load-time errors. */
  static load(jokesTxt: string, wordbankTxt: string): { engine: JokeEngine; errors: string[] } {
    const j = parseJokes(jokesTxt);
    const w = parseWordbank(wordbankTxt);
    const engine = new JokeEngine(j.templates, w.categories);
    return { engine, errors: [...j.errors, ...w.errors, ...engine.checkSlots()] };
  }

  checkSlots(): string[] {
    const errors: string[] = [];
    for (const [cat, list] of Object.entries(this.words)) if (list.length === 0) errors.push(`wordbank: category [${cat}] is empty`);
    for (const t of this.templates) {
      for (const n of t.needs) if (!(NEED_KEYS as readonly string[]).includes(n.key)) errors.push(`jokes.txt:${t.line}: unknown needs key "${n.key}"`);
      errors.push(...this.checkText(t.text).map((e) => `jokes.txt:${t.line}: ${e}`));
    }
    return errors;
  }

  /** Validate slots in any template string (used for alert text authored in .ts content too). */
  checkText(text: string): string[] {
    const errors: string[] = [];
    if (/[{}]/.test(text.replace(SLOT_RE, ''))) errors.push(`unbalanced braces in "${text}"`);
    for (const m of text.matchAll(SLOT_RE)) {
      const spec = parseSlot(m[1]);
      if (!spec) { errors.push(`unparseable slot {${m[1]}}`); continue; }
      const isState = (STATE_SLOTS as readonly string[]).includes(spec.name);
      if (!isState && !this.words[spec.name]) errors.push(`unknown slot {${m[1]}} (no wordbank category [${spec.name}])`);
    }
    return errors;
  }

  templatesFor(key: string): Template[] {
    return key.includes('|') ? this.byKey.get(key) ?? [] : this.byCategory.get(key) ?? [];
  }

  has(key: string): boolean { return this.templatesFor(key).length > 0; }

  /** Pick a template for `key` (`category` or `category|subtag`) and render it. Null if nothing fits. */
  pick(key: string, ctx: RenderContext): string | null {
    const all = this.templatesFor(key);
    const eligible = all.filter((t) => t.needs.every((n) => needOk(n, ctx.needs ?? {})));
    if (eligible.length === 0) return null;
    const hist = ctx.history;
    const recent = hist?.t[key] ?? [];
    const memory = Math.min(TEMPLATE_MEMORY, eligible.length - 1);
    const fresh = eligible.filter((t) => !recent.slice(-memory).includes(t.line));
    const pool = fresh.length ? fresh : eligible;
    // Two tries: a render can fail (e.g. too long with today's state), then we try another template.
    for (let attempt = 0; attempt < 4; attempt++) {
      const t = pool[Math.floor(ctx.rng() * pool.length)];
      const out = this.render(t.text, ctx);
      if (out !== null && out.length <= 100) {
        if (hist) {
          const arr = (hist.t[key] = hist.t[key] ?? []);
          arr.push(t.line);
          if (arr.length > TEMPLATE_MEMORY) arr.splice(0, arr.length - TEMPLATE_MEMORY);
        }
        return out;
      }
    }
    return null;
  }

  private word(cat: string, ctx: RenderContext, avoid: Set<string>): WordEntry | null {
    const list = this.words[cat];
    if (!list || list.length === 0) return null;
    const hist = ctx.history;
    const recent = hist?.w[cat] ?? [];
    const memory = Math.min(WORD_MEMORY, list.length - 1 - avoid.size);
    const recentSet = new Set(memory > 0 ? recent.slice(-memory) : []);
    let pool = list.filter((e) => !avoid.has(e.base) && !recentSet.has(e.base));
    if (pool.length === 0) pool = list.filter((e) => !avoid.has(e.base));
    if (pool.length === 0) pool = list;
    const e = pool[Math.floor(ctx.rng() * pool.length)];
    if (hist) {
      const arr = (hist.w[cat] = hist.w[cat] ?? []);
      arr.push(e.base);
      if (arr.length > WORD_MEMORY) arr.splice(0, arr.length - WORD_MEMORY);
    }
    return e;
  }

  /** Render any template text. Returns null on failure (unknown slot, missing state value). */
  render(text: string, ctx: RenderContext): string | null {
    const fills = new Map<string, WordEntry[]>();
    const used = new Map<string, Set<string>>();
    let failed = false;
    const out = text.replace(SLOT_RE, (_all, inner: string) => {
      const spec = parseSlot(inner);
      if (!spec) { failed = true; return ''; }
      let entry: WordEntry | null = null;
      const list = fills.get(spec.name) ?? [];
      if (spec.ref !== null) {
        entry = list[spec.ref - 1] ?? null;
      } else {
        const avoid = used.get(spec.name) ?? new Set<string>();
        if ((STATE_SLOTS as readonly string[]).includes(spec.name)) entry = this.stateSlot(spec.name, ctx, used);
        else entry = this.word(spec.name, ctx, avoid);
        if (entry) {
          list.push(entry);
          fills.set(spec.name, list);
          avoid.add(entry.base);
          used.set(spec.name, avoid);
        }
      }
      if (!entry) { failed = true; return ''; }
      let s = inflect(entry.forms, spec.mod);
      if (spec.cap) s = capitalize(s);
      if (spec.article) s = `${spec.article === 'A' ? capitalize(article(s)) : article(s)} ${s}`;
      return s;
    });
    if (failed) return null;
    return capitalizeFirst(out);
  }

  private stateSlot(name: string, ctx: RenderContext, used: Map<string, Set<string>>): WordEntry | null {
    const slots = ctx.slots ?? {};
    let v = slots[name];
    // sponsor2 draws from the sponsor list but avoids the first pick.
    if (v === undefined && /\d$/.test(name)) v = slots[name.replace(/\d$/, '')];
    if (v === undefined || v === '') return null;
    if (Array.isArray(v)) {
      if (v.length === 0) return null;
      const base = name.replace(/\d$/, '');
      const avoid = used.get(base) ?? new Set<string>();
      const pool = v.filter((x) => !avoid.has(x));
      const pick = (pool.length ? pool : v)[Math.floor(ctx.rng() * (pool.length ? pool : v).length)];
      avoid.add(pick);
      used.set(base, avoid);
      return { base: pick, forms: [pick] };
    }
    const s = typeof v === 'number' ? String(Math.round(v)) : v;
    return { base: s, forms: [s] };
  }
}

function capitalizeFirst(s: string): string {
  const i = s.search(/[A-Za-z]/);
  if (i < 0) return s;
  return s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1);
}
