import { describe, expect, it } from 'vitest';
import './setup';
import { ALERTS } from '../src/content/alerts';
import { TRAITS } from '../src/content/members';
import { POSTS } from '../src/content/posts';
import { SPONSORS } from '../src/content/sponsors';
import { TECH } from '../src/content/techTree';
import { BIDDERS, VENUES } from '../src/content/venues';
import { jokeEngine } from '../src/core';
import {
  advance, beginGame, buyTech, endLiveDay, newGame, serialize, startLiveDay, tickAuction, finishAuction, nextDay,
  resolveAlert, queueAlert, STEPS_PER_DAY, tapBubble,
} from '../src/core';
import { startAuction } from '../src/core/auction';
import { courtingReply, startCourting } from '../src/core/courting';
import { playGame } from '../scripts/bots';

describe('simulation core', () => {
  it('day 1 starts with 3 members incl. ≥1 Organizer and ≥1 Social, for any seed', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = newGame(seed);
      expect(s.members).toHaveLength(3);
      expect(s.members.some((m) => m.role === 'organizer')).toBe(true);
      expect(s.members.some((m) => m.role === 'social')).toBe(true);
    }
  });

  it('?seed reproduces identical runs (bubbles, alerts, jokes, results)', () => {
    for (const seed of [1, 1234, 98765]) {
      const a = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      const b = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      expect(serialize(a.state)).toEqual(serialize(b.state));
    }
    const c = playGame(1, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
    const d = playGame(2, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
    expect(serialize(c.state)).not.toEqual(serialize(d.state));
  });

  it('never soft-locks: 1,000 random-action bot runs all reach results', () => {
    let stuck = 0;
    const reasons: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const mode = (['judge', 'standard', 'full'] as const)[i % 3];
      const r = playGame(50000 + i, mode, { style: 'random', bubbleRate: Math.random(), alertRate: Math.random() });
      if (r.stuck) { stuck++; reasons.push(r.reason ?? ''); }
      else expect(r.state.results).not.toBeNull();
    }
    expect(reasons).toEqual([]);
    expect(stuck).toBe(0);
  }, 240000);

  it('advances 20 steps per day in every mode, and the clock pauses while courting', () => {
    for (const mode of ['judge', 'standard', 'full'] as const) {
      const s = newGame(7, mode);
      beginGame(s);
      startLiveDay(s);
      advance(s, s.daySec / 2);
      expect(s.step).toBe(10);
      startCourting(s, 'notioned', 0);
      const t = s.t;
      advance(s, 5);
      expect(s.t).toBe(t);
      s.courting = null;
      advance(s, s.daySec);
      expect(s.phase === 'night' || s.phase === 'auction').toBe(true);
      expect(s.step).toBe(STEPS_PER_DAY);
    }
  });

  it('alerts time out into their default outcome', () => {
    const s = newGame(11);
    beginGame(s);
    startLiveDay(s);
    s.schedule = [];
    queueAlert(s, 'typo_flyer');
    expect(s.alertQueue).toHaveLength(1);
    advance(s, 12);
    expect(s.alertQueue).toHaveLength(0);
    expect(s.log.some((l) => l.kind === 'alert:typo_flyer' && l.text.includes('timeout'))).toBe(true);
    expect(s.flags.yeer).toBe(true); // default = "Lean into it"
  });

  it('losing every venue bid falls back to The Lawn', () => {
    const s = newGame(5);
    beginGame(s);
    s.day = 3;
    startAuction(s);
    let guard = 0;
    while (s.auction!.phase !== 'done' && guard++ < 10000) tickAuction(s, 0.25, false);
    finishAuction(s);
    expect(s.venue).toBe('lawn');
    expect(s.phase).toBe('night');
  });

  it('the Blue Screen gag works end to end (bubble → flag → hackathon-day beat)', () => {
    for (const tap of [true, false]) {
      const s = newGame(21, 'judge');
      beginGame(s);
      let seen = false;
      let guard = 0;
      while (s.phase !== 'results' && guard++ < 20000) {
        if (s.phase === 'morning') startLiveDay(s);
        else if (s.phase === 'live') {
          const b = s.bubbles.find((x) => x.type === 'bsod');
          if (b) { seen = true; if (tap) tapBubble(s, b.id); }
          if (s.alertQueue[0]) resolveAlert(s, s.alertQueue[0].defaultChoice);
          if (s.courting) s.courting = null;
          advance(s, 0.5);
        } else if (s.phase === 'auction') { if (s.auction!.phase === 'done') finishAuction(s); else tickAuction(s, 0.5, false); }
        else if (s.phase === 'night') nextDay(s);
        else if (s.phase === 'hackday') break;
      }
      expect(seen).toBe(true);
      expect(s.flags.bsod).toBe(tap ? 'rebooted' : 'haunted');
      const beat = s.hackday!.beats.find((b) => b.id === 'bsod');
      expect(beat?.text).toMatch(tap ? /turning it off and on again/ : /sad face/);
    }
  });

  it('equity sold reduces later sponsor payments, capped at 28%', () => {
    const s = newGame(3);
    s.flags.equitySold = 35;
    startCourting(s, 'rigidfinds', 0);
    s.courting!.interest = 95;
    s.courting!.round = 2;
    const idx = s.courting!.replies.findIndex((r) => r.type !== 'bribe' && r.type !== 'overpromise');
    courtingReply(s, idx);
    expect(s.courting!.result!.outcome).toBe('premium');
    expect(s.courting!.result!.money).toBe(Math.round((10000 * 0.72) / 100) * 100);
  });

  it('ending a day early gives +1 TP and still runs all 20 steps', () => {
    const s = newGame(9);
    beginGame(s);
    startLiveDay(s);
    const tp = s.techPoints;
    endLiveDay(s, true);
    expect(s.step).toBe(STEPS_PER_DAY);
    expect(s.techPoints).toBeGreaterThanOrEqual(tp + 1);
  });

  it('the 10 MVP tech nodes are all buyable and do something', () => {
    const s = newGame(4);
    s.techPoints = 999;
    const mvp = TECH.filter((t) => t.mvp);
    expect(mvp).toHaveLength(10);
    for (const t of mvp) expect(buyTech(s, t.id), t.id).toBe(true);
    expect(s.unlockedRoles).toEqual(expect.arrayContaining(['recruiter', 'designer', 'logistics', 'coordinator']));
    expect(s.trainingMult).toBe(1.5);
    expect(s.prestigeLevel).toBe(2);
    expect(s.repCap).toBe(150);
    expect(s.unlockedPosts).toEqual(expect.arrayContaining(['reel', 'countdown', 'influencer']));
  });

  it('something interactive appears about every 6 s or faster in Standard mode', () => {
    let total = 0;
    let days = 0;
    for (let seed = 0; seed < 30; seed++) {
      const s = newGame(seed, 'standard');
      beginGame(s);
      startLiveDay(s);
      total += s.schedule.filter((e) => e.kind === 'bubble' || e.kind === 'alert' || e.kind === 'treeMove').length;
      days++;
    }
    expect(60 / (total / days)).toBeLessThanOrEqual(6);
  });
});

describe('content acceptance counts (Section 12)', () => {
  it('meets the minimums', () => {
    expect(ALERTS.length).toBeGreaterThanOrEqual(30);
    expect(ALERTS.filter((a) => a.tech).length).toBeGreaterThanOrEqual(15);
    expect(ALERTS.filter((a) => a.satire).length).toBeGreaterThanOrEqual(6);
    for (const id of ['rust_rewrite', 'leftpad', 'its_dns', 'bsod', 'wifi_unbearable', 'linkedin_larp', 'pre_everything', 'equity_offer', 'ysee_afterparty']) {
      expect(ALERTS.some((a) => a.id === id), id).toBe(true);
    }
    expect(ALERTS.find((a) => a.id === 'rust_rewrite')!.title).toContain('refactored the website codebase in Rust');
    expect(ALERTS.filter((a) => a.id !== 'rust_rewrite' && a.choices.some((c) => c.label === 'Rewrite it in Rust')).length).toBeGreaterThanOrEqual(2);
    expect(SPONSORS.length).toBeGreaterThanOrEqual(12);
    expect(POSTS.length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(TRAITS).length).toBeGreaterThanOrEqual(12);
    expect(VENUES).toHaveLength(5);
    for (const b of BIDDERS) expect(jokeEngine()!.templatesFor(`taunt|${b.id}`).length, b.id).toBeGreaterThanOrEqual(4);
    expect(jokeEngine()!.templates.length).toBeGreaterThanOrEqual(80);
  });
});
