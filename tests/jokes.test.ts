import { describe, expect, it } from 'vitest';
import { loadErrors } from './setup';
import { ALERTS } from '../src/content/alerts';
import { REPLIES } from '../src/content/sponsors';
import { jokeEngine, newGame } from '../src/core';
import { slotsFor, needsFor, RIVAL_CEO } from '../src/core/jokes';
import { emptyHistory } from '../src/jokes/engine';
import { article, past, ing, thirdPerson, plural } from '../src/jokes/inflect';
import { parseJokes, parseWordbank } from '../src/jokes/parse';
import { problems, blocked } from '../src/jokes/validate';
import { rngFn } from '../src/core/rng';
import { readContent } from '../scripts/node-content';

/** A worst-case state: long names in every state slot. */
function testState(seed: number) {
  const s = newGame(seed, 'standard');
  s.signups = 512; s.treeSignups = 430; s.day = 5;
  s.sponsors = [{ id: 'balantir', money: 1, premium: true, mood: 50, day: 1 }, { id: 'bubbletrouble', money: 0, premium: false, mood: 50, day: 1 }];
  s.venue = 'stadium';
  s.flags.equitySold = 14;
  return s;
}

describe('mad-lib engine', () => {
  it('loads both content files with no errors', () => {
    expect(loadErrors).toEqual([]);
  });

  it('renders every template 200× cleanly (no double spaces, a/an, braces, >100 chars, empty slots)', () => {
    const e = jokeEngine()!;
    const failures: string[] = [];
    for (const t of e.templates) {
      for (let i = 0; i < 200; i++) {
        const s = testState(i * 7919 + t.line);
        const out = e.render(t.text, { rng: rngFn(s), slots: slotsFor(s), needs: needsFor(s), history: s.jokeHistory });
        const p = problems(out);
        if (p.length) { failures.push(`jokes.txt:${t.line} "${out}" → ${p.join(', ')}`); break; }
      }
    }
    expect(failures).toEqual([]);
  });

  it('never repeats a template within its last 8 uses', () => {
    const e = jokeEngine()!;
    const s = testState(1);
    const hist = emptyHistory();
    const key = 'headline|bear';
    const lines: number[] = [];
    for (let i = 0; i < 60; i++) {
      e.pick(key, { rng: rngFn(s), slots: slotsFor(s), needs: needsFor(s), history: hist });
      lines.push(hist.t[key][hist.t[key].length - 1]);
    }
    for (let i = 8; i < lines.length; i++) expect(lines.slice(i - 8, i)).not.toContain(lines[i]);
  });

  it('meets the content quotas (Section 8.5)', () => {
    const e = jokeEngine()!;
    const count = (k: string) => e.templatesFor(k).length;
    expect(e.templates.length).toBeGreaterThanOrEqual(80);
    expect(count('headline')).toBeGreaterThanOrEqual(40);
    for (const sub of ['bear', 'tree', 'sponsor', 'campus', 'breaking']) expect(count(`headline|${sub}`)).toBeGreaterThanOrEqual(6);
    for (const sub of ['flop', 'meh', 'solid', 'viral', 'mega', 'ratio']) expect(count(`comment|${sub}`)).toBeGreaterThanOrEqual(8);
    expect(count('outcome')).toBeGreaterThanOrEqual(20);
    expect(count('outcome|tech')).toBeGreaterThanOrEqual(8);
    expect(count('taunt')).toBeGreaterThanOrEqual(15);
    expect(count('award')).toBeGreaterThanOrEqual(15);
    expect(count('bio')).toBeGreaterThanOrEqual(15);
    expect(count('project')).toBeGreaterThanOrEqual(20);
    expect(count('bubble')).toBeGreaterThanOrEqual(10);
    expect(count('roast') + count('praise')).toBeGreaterThanOrEqual(16);
    for (const cat of ['attendance', 'mood', 'sponsor', 'sponsormood', 'amenities', 'promises', 'artistic', 'quality']) expect(count(`roast|${cat}`) + count(`praise|${cat}`)).toBeGreaterThanOrEqual(2);
    const techish = e.templates.filter((t) => /\{(language|codebase|devtool|cloud_horror|tech_excuse|wifi_excuse)/.test(t.text) || t.subtag === 'tech').length;
    expect(techish).toBeGreaterThanOrEqual(20);
    for (const w of ['noun', 'verb', 'adj']) expect(e.words[w].length).toBeGreaterThanOrEqual(40);
    for (const [cat, list] of Object.entries(e.words)) expect(list.length, `[${cat}]`).toBeGreaterThanOrEqual(25);
  });

  it('every slot used in alert text and courting replies exists', () => {
    const e = jokeEngine()!;
    const errs: string[] = [];
    for (const a of ALERTS) {
      const texts = [typeof a.title === 'string' ? a.title : '', typeof a.body === 'string' ? a.body : '',
        ...a.choices.flatMap((c) => [c.out?.text ?? '', c.odds?.win.text ?? '', c.odds?.lose.text ?? ''])];
      for (const t of texts) errs.push(...e.checkText(t).map((x) => `${a.id}: ${x}`));
    }
    for (const list of Object.values(REPLIES)) for (const t of list) errs.push(...e.checkText(t));
    expect(errs).toEqual([]);
  });

  it('falls back safely on bad input instead of crashing', () => {
    const e = jokeEngine()!;
    const s = testState(3);
    expect(e.render('{nonexistent} thing', { rng: rngFn(s) })).toBeNull();
    expect(e.pick('no_such_category', { rng: rngFn(s) })).toBeNull();
    const parsed = parseJokes('[headline|bear] ok\nnot a template line');
    expect(parsed.errors.length).toBe(1);
    const words = parseWordbank('orphan\n[noun]\nthing');
    expect(words.errors.length).toBe(1);
  });

  it('inflects and picks articles correctly', () => {
    expect(past('pivot')).toBe('pivoted');
    expect(past('ship')).toBe('shipped');
    expect(past('deploy')).toBe('deployed');
    expect(past('overthink')).toBe('overthought');
    expect(ing('rebase')).toBe('rebasing');
    expect(ing('fork')).toBe('forking');
    expect(thirdPerson('monetize')).toBe('monetizes');
    expect(thirdPerson('crash')).toBe('crashes');
    expect(plural('capybara')).toBe('capybaras');
    expect(plural('emotional support goose')).toBe('emotional support geese');
    expect(article('hour')).toBe('an');
    expect(article('unicorn')).toBe('a');
    expect(article('LLM wrapper')).toBe('an');
    expect(article('AI-powered')).toBe('an');
    expect(article('user')).toBe('a');
  });

  it('keeps the content PG-13 and free of retired names', () => {
    const { jokes, wordbank } = readContent();
    for (const line of [...jokes.split('\n'), ...wordbank.split('\n')]) expect(blocked(line), line).toBeNull();
    const all = jokes + wordbank + JSON.stringify(ALERTS.map((a) => [a.title, a.body, a.choices.map((c) => [c.label, c.out?.text])]));
    expect(all).not.toMatch(/raccoon|Discord|Greek Row|Y Cinnamon/i);
    expect(RIVAL_CEO).toBe('Chad Leland III');
  });
});
