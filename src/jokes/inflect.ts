// Tiny regular-rule inflector with an override table. Bank entries can also
// spell out their own forms (`pivot|pivots|pivoted|pivoting`), which win.

const IRREGULAR_PAST: Record<string, string> = {
  be: 'was', begin: 'began', break: 'broke', bring: 'brought', build: 'built', buy: 'bought',
  catch: 'caught', choose: 'chose', come: 'came', do: 'did', draw: 'drew', drink: 'drank',
  drive: 'drove', eat: 'ate', fall: 'fell', feel: 'felt', fight: 'fought', find: 'found',
  fly: 'flew', forget: 'forgot', get: 'got', give: 'gave', go: 'went', have: 'had', hear: 'heard',
  hide: 'hid', hold: 'held', keep: 'kept', know: 'knew', leave: 'left', lose: 'lost', make: 'made',
  meet: 'met', pay: 'paid', put: 'put', read: 'read', ride: 'rode', ring: 'rang', rise: 'rose',
  run: 'ran', say: 'said', see: 'saw', sell: 'sold', send: 'sent', set: 'set', shake: 'shook',
  shut: 'shut', sing: 'sang', sit: 'sat', sleep: 'slept', speak: 'spoke', spend: 'spent',
  stand: 'stood', steal: 'stole', stick: 'stuck', sweep: 'swept', swim: 'swam', take: 'took',
  teach: 'taught', tear: 'tore', tell: 'told', think: 'thought', throw: 'threw', wake: 'woke',
  wear: 'wore', win: 'won', write: 'wrote', ship: 'shipped', rebase: 'rebased', yeet: 'yeeted',
  overthink: 'overthought', undersell: 'undersold', mislead: 'misled', rewrite: 'rewrote',
  refactor: 'refactored', deploy: 'deployed', forbid: 'forbade', upsell: 'upsold',
};

const IRREGULAR_PLURAL: Record<string, string> = {
  person: 'people', child: 'children', mouse: 'mice', goose: 'geese', man: 'men', woman: 'women',
  foot: 'feet', tooth: 'teeth', cactus: 'cacti', octopus: 'octopuses', sheep: 'sheep', fish: 'fish',
  series: 'series', species: 'species', moose: 'moose', data: 'data', alumnus: 'alumni',
  index: 'indexes', mongoose: 'mongooses',
};

const VOWELS = 'aeiou';

/** Inflect the head word of a (possibly multi-word) phrase; verbs inflect the FIRST word. */
function mapFirstWord(phrase: string, fn: (w: string) => string): string {
  const i = phrase.indexOf(' ');
  return i < 0 ? fn(phrase) : fn(phrase.slice(0, i)) + phrase.slice(i);
}
function mapLastWord(phrase: string, fn: (w: string) => string): string {
  const i = phrase.lastIndexOf(' ');
  return i < 0 ? fn(phrase) : phrase.slice(0, i + 1) + fn(phrase.slice(i + 1));
}

function isCvc(w: string): boolean {
  if (w.length < 3 || w.length > 4) return false;
  const [a, b, c] = w.slice(-3);
  return !VOWELS.includes(a) && VOWELS.includes(b) && !VOWELS.includes(c) && !'wxy'.includes(c);
}

export function past(verb: string): string {
  return mapFirstWord(verb, (w) => {
    const lw = w.toLowerCase();
    if (IRREGULAR_PAST[lw]) return IRREGULAR_PAST[lw];
    if (lw.endsWith('e')) return w + 'd';
    if (/[^aeiou]y$/.test(lw)) return w.slice(0, -1) + 'ied';
    if (isCvc(lw)) return w + w.slice(-1) + 'ed';
    return w + 'ed';
  });
}

export function ing(verb: string): string {
  return mapFirstWord(verb, (w) => {
    const lw = w.toLowerCase();
    if (lw === 'be' || lw === 'see' || lw === 'flee') return w + 'ing';
    if (lw.endsWith('ie')) return w.slice(0, -2) + 'ying';
    if (lw.endsWith('e') && !lw.endsWith('ee')) return w.slice(0, -1) + 'ing';
    if (isCvc(lw)) return w + w.slice(-1) + 'ing';
    return w + 'ing';
  });
}

export function thirdPerson(verb: string): string {
  return mapFirstWord(verb, (w) => {
    const lw = w.toLowerCase();
    if (lw === 'be') return 'is';
    if (lw === 'have') return 'has';
    if (lw === 'do') return 'does';
    if (lw === 'go') return 'goes';
    if (/(s|x|z|ch|sh)$/.test(lw)) return w + 'es';
    if (/[^aeiou]y$/.test(lw)) return w.slice(0, -1) + 'ies';
    return w + 's';
  });
}

export function plural(noun: string): string {
  return mapLastWord(noun, (w) => {
    const lw = w.toLowerCase();
    if (IRREGULAR_PLURAL[lw]) return IRREGULAR_PLURAL[lw];
    if (/(s|x|z|ch|sh)$/.test(lw)) return w + 'es';
    if (/[^aeiou]y$/.test(lw)) return w.slice(0, -1) + 'ies';
    return w + 's';
  });
}

// Words whose spelling lies about their first sound.
const AN_EXCEPTIONS = /^([fhlmnrsx]\d|hour|honest|honou?r|heir|herb\b|mvp|mri|faq|llm|sql|html|http|ssd|nft|rsvp|seo|xml|f\b|h\b|l\b|m\b|n\b|r\b|s\b|x\b)/i;
const A_EXCEPTIONS = /^(uni[^n]|unicorn|universit|use|user|usu|uti|euro|eu|one\b|once|ubi|uk\b|url|ufo|u\b|ux\b|uber)/i;

export function article(word: string): 'a' | 'an' {
  const w = word.replace(/^["'“(]+/, '');
  if (/^\d/.test(w)) return /^(8|11|18|80|800)(\D|$)/.test(w) ? 'an' : 'a';
  if (AN_EXCEPTIONS.test(w)) return 'an';
  if (A_EXCEPTIONS.test(w)) return 'a';
  return VOWELS.includes(w[0]?.toLowerCase() ?? '') ? 'an' : 'a';
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export type Modifier = 'past' | 'ing' | '3s' | 'pl';

/** forms: as spelled in the bank. Verbs: base|3s|past|ing. Nouns: singular|plural. */
export function inflect(forms: string[], mod: Modifier | null): string {
  const base = forms[0];
  switch (mod) {
    case null: return base;
    case '3s': return forms.length >= 4 ? forms[1] : thirdPerson(base);
    case 'past': return forms.length >= 4 ? forms[2] : past(base);
    case 'ing': return forms.length >= 4 ? forms[3] : ing(base);
    case 'pl': return forms.length === 2 ? forms[1] : plural(base);
  }
}
