import { describe, expect, it } from 'vitest';
import './setup';
import { ALERTS } from '../src/content/alerts';
import { TASK_ROLES, TRAITS } from '../src/content/members';
import { POSTS } from '../src/content/posts';
import { SPONSORS } from '../src/content/sponsors';
import { BRANCHES, TECH } from '../src/content/techTree';
import { BIDDERS, VENUES } from '../src/content/venues';
import { jokeEngine } from '../src/core';
import {
  advance, bar, beginGame, crewGrowth, buyTech, techCost, candidateCount, confirmCost, confirmHackers, dismissPopup, endLiveDay, newGame, serialize, showPopup, spawnBubble,
  startLiveDay, startRumor, tickAuction, finishAuction, nextDay, hackdayNext, hackdaySkip, hackdayChoose, resolveAlert, queueAlert, STEPS_PER_DAY, T, tapBubble, hireCost,
} from '../src/core';
import { NEWS } from '../src/content/news';
import { conversionMult } from '../src/core/map';
import { startTreeMove } from '../src/core/tree';
import { startAuction } from '../src/core/auction';
import { courtingReply, startCourting } from '../src/core/courting';
import { playGame } from '../scripts/bots';

const beginAndStart = (seed: number) => { const s = newGame(seed); beginGame(s); startLiveDay(s); return s; };

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
      s.schedule = []; // no popups or alerts: this test is about the clock
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

  it('alerts and news popups pause the world until answered (Plague Inc style)', () => {
    const s = newGame(11);
    beginGame(s);
    startLiveDay(s);
    s.schedule = [];
    queueAlert(s, 'dave');
    expect(s.alertQueue).toHaveLength(1);
    const t = s.t;
    advance(s, 12);
    expect(s.t).toBe(t); // no countdown: the decision waits for the player
    resolveAlert(s, 1);
    showPopup(s, { kind: 'news', icon: '📰', title: 'Test', body: 'Test' }, false);
    advance(s, 5);
    expect(s.t).toBe(t);
    dismissPopup(s);
    advance(s, 5);
    expect(s.t).toBeGreaterThan(t);
  });

  it('Tree moves are news popups with no response that grow Tree', () => {
    const s = newGame(12);
    beginGame(s);
    startLiveDay(s);
    s.schedule = [];
    const before = s.regions.find((r) => r.id === 'twitter')!.tree;
    startTreeMove(s, 'keynote');
    expect(s.popups[0]?.kind).toBe('tree');
    expect(s.regions.find((r) => r.id === 'twitter')!.tree).toBeGreaterThan(before);
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

  it('every 2 evolved nodes make the rest cost +1 TP (rumors are free and do not count)', () => {
    const s = newGame(5);
    beginGame(s);
    s.techPoints = 100;
    expect(techCost(s, 'applications')).toBe(3);
    buyTech(s, 'website');
    expect(techCost(s, 'applications')).toBe(3);
    buyTech(s, 'clubfair');
    expect(techCost(s, 'applications')).toBe(4);
    const before = s.techPoints;
    buyTech(s, 'applications');
    expect(before - s.techPoints).toBe(4);
    startRumor(s);
    expect(Number(s.flags.evolved)).toBe(3);
  });

  it('Hackathon Day has three live decisions; skipping takes their defaults', () => {
    const r = playGame(3, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
    const beats = r.state.hackday!.beats.filter((b) => b.choices);
    expect(beats.map((b) => b.id)).toEqual(['d_wifi', 'd_demo', 'd_leland']);
    expect(beats.every((b) => b.picked !== undefined && b.outcome)).toBe(true);
    expect(r.state.results).not.toBeNull();
  });

  it('a live decision blocks Next until picked, then applies its effect', () => {
    const s = playGame(4, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 }).state;
    // Rewind to Hackathon Day with fresh beats.
    s.phase = 'night'; s.results = null; s.day = 7;
    for (const k of Object.keys(s.flags)) if (k.startsWith('hd_')) delete s.flags[k];
    nextDay(s);
    expect(s.phase).toBe('hackday');
    const h = s.hackday!;
    const di = h.beats.findIndex((b) => b.id === 'd_demo');
    h.index = di;
    hackdayNext(s);
    expect(h.index).toBe(di);
    hackdayChoose(s, 1); // the one that definitely works: quality +3
    expect(s.flags.hd_quality).toBe(3);
    hackdayNext(s);
    expect(h.index).toBe(di + 1);
    hackdaySkip(s);
    expect(s.phase).toBe('results');
    expect(h.beats.every((b) => !b.choices || b.picked !== undefined)).toBe(true);
  });

  it('the Blue Screen is gone: no alert, no bubble, no hackathon-day beat', () => {
    expect(ALERTS.some((a) => a.id === 'bsod')).toBe(false);
    for (let seed = 0; seed < 20; seed++) {
      const r = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      expect(r.state.log.some((l) => l.kind.includes('bsod'))).toBe(false);
      expect(r.state.hackday?.beats.some((b) => b.id === 'bsod') ?? false).toBe(false);
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
    expect(s.courting!.result!.money).toBe(Math.round((10000 * 0.85 * 0.72) / 100) * 100);
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

  it('every tech node is buyable, does something, and fills its bar', () => {
    const s = newGame(4);
    s.techPoints = 999;
    const before = { hype: bar(s, 'hype'), org: bar(s, 'org'), talent: bar(s, 'talent') };
    // Buy in an order that satisfies prerequisites (parents before children).
    const depth = (id?: string): number => (id ? 1 + depth(TECH.find((t) => t.id === id)?.prereq) : 0);
    const order = [...TECH].sort((a, b) => depth(a.prereq) - depth(b.prereq));
    for (const t of order) expect(buyTech(s, t.id), t.id).toBe(true);
    expect(s.unlockedRoles).toEqual(expect.arrayContaining(['recruiter', 'designer', 'logistics', 'coordinator']));
    expect(s.trainingMult).toBe(1.7);
    expect(s.prestigeLevel).toBe(3);
    expect(s.repCap).toBe(200);
    expect(s.unlockedPosts).toEqual(expect.arrayContaining(['reel', 'countdown', 'influencer']));
    for (const b of ['hype', 'org', 'talent'] as const) expect(bar(s, b)).toBeGreaterThan(before[b] + 30);
    expect(BRANCHES.map((b) => b.name)).toEqual(['Hype', 'Organization', 'Talent']);
  });

  it('a rumor unlocks a random tech node for free, with a popup', () => {
    const s = newGame(13);
    const tp = s.techPoints;
    const id = startRumor(s);
    expect(id).not.toBeNull();
    expect(s.unlockedTech).toContain(id);
    expect(s.techPoints).toBe(tp);
    expect(s.popups[0]?.kind).toBe('rumor');
  });

  it('confirming hackers costs money; tech raises the interested pool', () => {
    const s = newGame(14);
    s.signups = 1000;
    s.phase = 'live';
    const budget = s.budget;
    const n = confirmHackers(s);
    expect(n).toBe(T.confirmBatch);
    expect(s.confirmed).toBe(T.confirmBatch);
    expect(s.budget).toBe(budget - n * T.confirmCost);
    s.unlockedTech.push('travel', 'swag');
    expect(confirmCost(s)).toBe(T.confirmCost + 4);
    const a = newGame(15);
    const base = conversionMult(a);
    a.unlockedTech.push('applications');
    expect(conversionMult(a)).toBeGreaterThan(base);
  });

  it('money only comes from the starting budget and sponsors', () => {
    // Bubbles only give tech points.
    const s = newGame(16);
    beginGame(s);
    startLiveDay(s);
    for (const type of ['idea', 'eureka'] as const) {
      spawnBubble(s, type, 'uc');
      const b = s.bubbles[s.bubbles.length - 1];
      const budget = s.budget;
      const tp = s.techPoints;
      tapBubble(s, b.id);
      expect(s.budget).toBe(budget);
      expect(s.techPoints).toBeGreaterThan(tp);
    }
    // No alert pays out cash, except YSee's SAFE (YSee is a sponsor).
    const pays = (o?: { budget?: number }) => (o?.budget ?? 0) > 0;
    const cashAlerts = ALERTS.filter((a) => a.choices.some((c) => pays(c.out) || pays(c.odds?.win) || pays(c.odds?.lose))).map((a) => a.id);
    expect(cashAlerts).toEqual(['ysee_afterparty']);
    // Across full bot runs, every budget increase is a sponsor signing (or the YSee SAFE).
    for (let seed = 0; seed < 40; seed++) {
      const r = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      const sponsorMoney = r.state.log.filter((l) => l.kind === 'sponsor').reduce((a, l) => a + (l.value ?? 0), 0);
      const safe = r.state.flags.afterparty === 'ysee' ? 5000 : 0;
      const spent = r.state.log.filter((l) => l.kind === 'confirm').reduce((a, l) => a + (l.value ?? 0), 0);
      expect(r.state.budget + spent).toBeLessThanOrEqual(T.startBudget + sponsorMoney + safe);
    }
  });

  it('the world has the eight requested regions and 10,000 students', () => {
    const s = newGame(17);
    expect(s.regions.map((r) => r.name).sort()).toEqual(['ACC Schools', 'B1G Schools', 'Frat Row', 'International Students', 'Local High Schools', 'SEC Schools', 'Twitter/X', 'UC Schools']);
    expect(s.regions.reduce((a, r) => a + r.pop, 0)).toBe(10000);
  });

  it('the world pauses about twice a day at most (sponsor invites aside)', () => {
    let pauses = 0;
    const runs = 60;
    for (let seed = 0; seed < runs; seed++) {
      const r = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      pauses += r.state.log.filter((l) => l.kind === 'popup' || (l.kind.startsWith('alert:') && l.kind !== 'alert:sponsor_invite')).length;
    }
    expect(pauses / runs / 7).toBeLessThanOrEqual(2.5);
  });

  it('every requested world-news headline exists', () => {
    const titles = NEWS.map((n) => n.title);
    for (const t of ['Purdue football wins natty', 'Purdue obliterates IU in 80-2 game', 'IU falls to chaos', 'IU Kelley School named #1 in most annoying students']) expect(titles).toContain(t);
    const s = newGame(18);
    s.techPoints = 99;
    for (const id of ['applications', 'aicredits'] as const) buyTech(s, id);
    expect(s.popups.some((p) => p.body.includes('increased the participation of business majors by 200%'))).toBe(true);
  });

  it('the screenshared-password event is gone and random decisions only come every other day', () => {
    expect(ALERTS.some((a) => a.id === 'sticky_password')).toBe(false);
    for (let seed = 0; seed < 40; seed++) {
      const r = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      const scripted = ['sponsor_invite', 'tree_stumble', 'ysee_afterparty', 'balantir_call'];
      const random = r.state.log.filter((l) => l.kind.startsWith('alert:') && !scripted.includes(l.kind.slice(6)));
      expect(random.length, `seed ${seed}`).toBeLessThanOrEqual(4);
    }
  });

  it('Balantir is a scripted Day 4 call, never a random invite', () => {
    let calls = 0;
    for (let seed = 0; seed < 30; seed++) {
      const r = playGame(seed, 'standard', { style: 'balanced', bubbleRate: 0.7, alertRate: 0.9 });
      if (r.state.firedAlerts.includes('balantir_call')) calls++;
    }
    expect(calls).toBe(30);
  });

  it('Nepo List sits in Organization after the Club Prestige tiers', () => {
    const n = TECH.find((t) => t.id === 'nepolist')!;
    expect(n.branch).toBe('org');
    expect(n.desc).toContain('direct recruitment');
    const s = newGame(31);
    s.techPoints = 99;
    expect(candidateCount(s)).toBe(3);
    for (const id of ['clubfair', 'coordinator', 'prestige1', 'prestige2', 'prestige3'] as const) expect(buyTech(s, id), id).toBe(true);
    expect(candidateCount(s)).toBe(9);
    const before = bar(s, 'org');
    expect(buyTech(s, 'nepolist')).toBe(true);
    expect(bar(s, 'org')).toBeGreaterThan(before);
    expect(candidateCount(s)).toBe(11);
  });

  it('the crew has no cap, hires get pricier, and a burned-out member who keeps working quits', () => {
    const s = beginAndStart(32);
    const c0 = hireCost(s);
    for (let i = 0; i < 6; i++) s.members.push({ ...s.members[0], id: 1000 + i });
    expect(s.members.length).toBeGreaterThan(8);
    expect(hireCost(s)).toBeGreaterThan(c0);
    const tired = s.members[1];
    tired.burnout = true; tired.burnoutWorked = false;
    const rested = s.members[2];
    rested.burnout = true; rested.burnoutWorked = false; rested.task = null;
    s.schedule = [];
    endLiveDay(s, true);
    expect(s.members.some((m) => m.id === tired.id)).toBe(false);
    expect(s.members.find((m) => m.id === rested.id)?.burnout).toBe(false);
  });

  it('something interactive appears about every 6 s or faster in Standard mode', () => {
    let total = 0;
    let days = 0;
    for (let seed = 0; seed < 30; seed++) {
      const s = newGame(seed, 'standard');
      beginGame(s);
      startLiveDay(s);
      total += s.schedule.filter((e) => e.kind === 'bubble' || e.kind === 'alert' || e.kind === 'treeMove' || e.kind === 'news').length;
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
    for (const id of ['rust_rewrite', 'leftpad', 'its_dns', 'wifi_unbearable', 'linkedin_larp', 'pre_everything', 'equity_offer', 'ysee_afterparty']) {
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

  it('crew level up after enough days on a matching task, capped at the skill cap', () => {
    const s = beginAndStart(7);
    const m = s.members[0];
    m.task = (Object.keys(TASK_ROLES) as (keyof typeof TASK_ROLES)[]).find((k) => TASK_ROLES[k].includes(m.role))!;
    m.baseSkill = 7;
    const skill = m.baseSkill;
    expect(crewGrowth(s)).toHaveLength(0);
    expect(crewGrowth(s)).toHaveLength(0);
    const ups = crewGrowth(s);
    expect(ups.map((u) => u.memberId)).toContain(m.id);
    expect(m.baseSkill).toBe(skill + 1);
    for (let i = 0; i < 6; i++) crewGrowth(s);
    expect(m.baseSkill).toBe(8);
  });
});
