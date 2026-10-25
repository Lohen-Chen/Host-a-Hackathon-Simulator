// Hackathon Day: ~10 state-aware text beats, then results (Section 6.11).
import { PROMISES } from '../content/promises';
import { SPONSOR_BY_ID } from '../content/sponsors';
import { TREE_BACKUP, VENUE_BY_ID } from '../content/venues';
import { addRep, hasTech, log, roleSkillSum } from './helpers';
import { RIVAL_CEO, joke, treeRegionCount } from './jokes';
import { checkPromises, expectedAttendees, scoreBear, scoreTree, treeAttendees, venueCap, type EventFacts } from './score';
import { chance, clamp, pick, shuffle } from './rng';
import type { Beat, GameState, TechId, TraitId } from './types';

export function startHackday(s: GameState) {
  s.phase = 'hackday';
  const cap = venueCap(s);
  const expected = expectedAttendees(s);
  const overflow = Math.max(0, expected - cap);
  const attendees = Math.round(Math.min(expected, cap));
  const dumpster = s.budget < 0;
  checkPromises(s, attendees);
  const kept = s.promises.filter((p) => p.kept).length;
  const broken = s.promises.length - kept;
  const protest = s.sponsors.some((x) => SPONSOR_BY_ID[x.id].perkFx.protest);
  const facts: EventFacts = { expected, attendees, cap, overflow, dumpster, protest, kept, broken };
  s.flags.attendees = attendees;
  s.hackday = { beats: buildBeats(s, facts), index: 0, t: 0, facts };
}

/** Scored once the day is over, so the live decisions count. */
function finishHackday(s: GameState) {
  const h = s.hackday!;
  for (const b of h.beats) if (b.choices && b.picked === undefined) chooseBeat(s, b, b.defaultChoice ?? 0);
  const facts = h.facts;
  const attendees = facts.attendees;
  const bear = scoreBear(s, facts);
  const tree = scoreTree(s);
  const t = treeAttendees(s);
  const win = attendees > t.attendees;
  s.results = {
    bear,
    tree,
    attendees,
    treeAttendees: Math.round(t.attendees),
    win,
    awards: awards(s, facts),
    headline: win
      ? pick(s, ['BEAR WINS. Tree University is "pivoting to reflection."', 'More hackers than Tree! Leland Sr. put down his phone.', 'VICTORY. The bear suit still smells, but it smells like winning.'])
      : pick(s, ['Tree wins this year. Leland Sr. called it "synergy."', 'Tree had more hackers. You had more heart. (Heart is not a metric.)', 'Defeat. Leland Sr. has already posted a LinkedIn carousel about it.']),
  };
  log(s, 'result', win ? 'win' : 'loss', bear.total);
  s.phase = 'results';
}

function buildBeats(s: GameState, f: EventFacts): Beat[] {
  const v = VENUE_BY_ID[s.venue ?? 'lawn'];
  const beats: Beat[] = [];
  const add = (id: string, icon: string, title: string, text: string, tone: Beat['tone'] = 'neutral') => beats.push({ id, icon, title, text, tone });

  // 1. Doors open
  if (f.overflow > 0) add('doors', '🚪', 'Doors open', `${Math.round(f.expected)} hackers showed up for ${f.cap} spots at ${v.name}. The fire marshal is counting out loud. ${Math.round(f.overflow)} were sent to the parking lot.`, 'bad');
  else if (f.attendees < f.cap * 0.4) add('doors', '🚪', 'Doors open', `${f.attendees} hackers in a venue for ${f.cap}. You can hear an echo. The echo signed up too.`, 'bad');
  else add('doors', '🚪', 'Doors open', `${f.attendees} hackers pour into ${v.name}. ${v.joke}`, 'good');
  const doorsLine = buildLine(s, DOORS_LINES);
  if (doorsLine) beats[beats.length - 1].text += ` ${doorsLine}`;

  // 2. Opening ceremony (promise check #1)
  const p1 = s.promises[0];
  const dave = s.flags.dave === 'hired' ? ' Dave from Sponsorship emails the whole audience a welcome. Twice.' : '';
  if (p1) add('opening', '🎤', 'Opening ceremony', `${p1.kept ? PROMISES[p1.kind].kept : PROMISES[p1.kind].broken}${dave}`, p1.kept ? 'good' : 'bad');
  else add('opening', '🎤', 'Opening ceremony', `No sponsors to thank, so the president thanked the router. The router did not respond.${dave}`);

  // 3. Hacking begins
  const hackLine = buildLine(s, HACKING_LINES);
  add('hacking', '⌨️', 'Hacking begins', `Teams form in record time. One team is building "${joke(s, 'project')}."${hackLine ? ` ${hackLine}` : ' Another is just four people and a whiteboard that says "AI?"'}`);

  // Tree Hacks, as a side story driven by Tree's Hype, Organization and Talent.
  add('tree_side', '🌲', 'Meanwhile at Tree Hacks', treeSideStory(s));

  // 4. Sponsor workshops
  const perks = s.sponsors.filter((x) => x.premium).map((x) => SPONSOR_BY_ID[x.id]).filter((d) => d.perk !== 'none');
  if (perks.length) add('workshops', '🎓', 'Sponsor workshops', `${perks.slice(0, 3).map((d) => `${d.name}: ${d.perk}`).join(' · ')}. Hackers are learning. Some against their will.`, 'good');
  else if (s.sponsors.length) add('workshops', '🎓', 'Sponsor workshops', `${SPONSOR_BY_ID[s.sponsors[0].id].name} sent one rep with a banner and no workshop. They read the banner aloud.`);
  else add('workshops', '🎓', 'Sponsor workshops', 'No sponsors. A volunteer taught "Intro to Snacks." It was the best-rated workshop.');

  // 5. 3 AM valley (WiFi)
  const wifi = Number(s.flags.wifiPain ?? 0);
  const wifiLine = wifi <= 1 ? 'The WiFi holds at a shaky bar.' : wifi <= 3 ? 'The WiFi is "thinking about it." Download speed: vibes.' : 'The WiFi is a rumor of a bar. "2,000 hackers, one router, and a dream."';
  const pizzaLine = s.moodBank >= 4 ? 'Pizza arrives (on time, for once).' : 'The pizza will arrive at 11:59 AM tomorrow, as foretold.';
  add('valley', '🌙', '3 AM valley', `${wifiLine} ${pizzaLine}`, wifi > 3 ? 'bad' : 'neutral');

  // Crew moment: up to two members get a line from their trait.
  const crew = shuffle(s, [...s.members]).slice(0, 2);
  if (crew.length) add('crew', '🧑‍🤝‍🧑', 'Your crew', crew.map((m) => `${m.name}: ${CREW_MOMENTS[m.trait]}`).join(' '), 'good');

  // Live decision 1: the WiFi.
  decisionWifi(s, beats);

  // 6. Protest (Balantir)
  if (f.protest) add('protest', '📢', 'Protest', 'Hackers protest the Balantir "Defense track." Signs read "HACK THE PLANET, NOT THE PLANET." The Balantir rep watches. Silently. Through sunglasses.', 'bad');

  // Live decision 2: which demo opens the expo.
  decisionDemo(s, beats);

  // 7. Demo expo
  const projects = [joke(s, 'project'), joke(s, 'project'), joke(s, 'project')];
  add('expo', '🏆', 'Demo expo', `Judges see "${projects[0]}," "${projects[1]}," and "${projects[2]}." One demo works. It was on one machine.`);

  // 8. Tree check-in
  const tv = s.treeVenue ? VENUE_BY_ID[s.treeVenue].name : TREE_BACKUP.name;
  const tr = treeRegionCount(s);
  add('tree', '🌲', 'Meanwhile at Tree U', `At ${tv}, ${RIVAL_CEO} is giving a keynote about synergy from his phone. Tree controlled ${tr}/8 regions. ${pick(s, TREE_CHAOS)}`);

  // Live decision 3: Leland Sr. crashes the closing ceremony.
  decisionLeland(s, beats);

  // 9. Closing ceremony (promise check #2 + callbacks)
  const rest = s.promises.slice(1, 3).map((p) => (p.kept ? PROMISES[p.kind].kept : PROMISES[p.kind].broken));
  const founder = Number(s.flags.founderRound ?? 0) >= 1 ? ' The walk-in founder returns, now "a unicorn." The product is still "coming soon."' : '';
  const rust = Number(s.flags.rust ?? 0) >= 1 ? ' The website is still in Rust. It still compiles.' : '';
  add('closing', '🎉', 'Closing ceremony', `${rest.join(' ') || 'Awards are handed out. Everyone gets a sticker.'}${founder}${rust}`.trim(), f.broken > f.kept ? 'bad' : 'good');

  // 10. After-party epilogue
  if (s.flags.afterparty === 'official') add('afterparty', '🪩', 'After-party', 'The official after-party goes off. The Founder announces a "Series D, for the vibes." Frat Row calls it "historic."', 'good');
  else if (s.flags.afterparty === 'ysee') add('afterparty', '🪩', 'After-party', `YSee runs the after-party. Four hundred founders. Zero customers. One cheese plate. The cap table: you ${100 - Number(s.flags.equitySold ?? 0)}%, YSee ${Number(s.flags.equitySold ?? 0)}%.`);
  else if (s.flags.afterparty === 'declined') add('afterparty', '🪩', 'After-party', 'You declined the after-party. Frat Row threw its own anyway. You can hear it from here.');
  return beats;
}

const TREE_CHAOS = [
  'Their WiFi password is "synergy1." Their WiFi is also down.',
  'A Tree hacker asked a mentor a question. The mentor was a private equity associate. He asked about margins.',
  'Tree\'s swag bags contained one sticker and a QR code to a waitlist.',
  'Their catering boat drifted out to sea. Twice.',
];

function awards(s: GameState, f: EventFacts): string[] {
  const out: string[] = [];
  const virals = s.log.filter((l) => l.kind === 'post:viral' || l.kind === 'post:mega').length;
  if (Number(s.flags.rust ?? 0) >= 1) out.push('Best Rewrite Nobody Asked For (Rust)');
  if (Number(s.flags.equitySold ?? 0) >= 7) out.push(`Most Equity Sold for Least Money (${s.flags.equitySold}%)`);
  if (virals >= 3) out.push('Most Viral Club (Mostly by Accident)');
  if (s.flags.dave === 'hired') out.push("Dave's Inbox Award for Reply-All Excellence");
  if (Number(s.flags.founderRound ?? 0) >= 3) out.push('Most Funded Pre-Idea Startup (Not Ours)');
  if (f.protest) out.push('Most Protested Sponsor');
  if (treeRegionCount(s) === 0) out.push('Tree-Free Campus');
  if (s.sponsors.length >= 4) out.push('Logo Wall of the Year');
  if (s.flags.pirate) out.push('Best Pirate-Themed Registration Flow');
  if (f.overflow > 0) out.push("The Fire Marshal's Least Favorite Hackathon");
  const picked = shuffle(s, out).slice(0, 2);
  while (picked.length < 3) picked.push(joke(s, 'award'));
  return picked;
}

export function hackdayNext(s: GameState) {
  const h = s.hackday;
  if (!h || s.phase !== 'hackday') return;
  const cur = h.beats[h.index];
  if (cur?.choices && cur.picked === undefined) return; // a live decision waits for a pick
  h.index++;
  h.t = 0;
  if (h.index >= h.beats.length) finishHackday(s);
}

/** Skip to results: undecided live decisions take their default. */
export function hackdaySkip(s: GameState) {
  if (!s.hackday || s.phase !== 'hackday') return;
  s.hackday.index = s.hackday.beats.length;
  finishHackday(s);
}

/** Pick a choice on the current live-decision beat. */
export function hackdayChoose(s: GameState, i: number) {
  const b = s.hackday?.beats[s.hackday.index];
  if (!b?.choices || b.picked !== undefined || b.choices[i]?.disabled) return;
  chooseBeat(s, b, i);
}

// ─────────────────────────────── live decisions ───────────────────────────────

type DecisionFx = { mood?: number; quality?: number; artistic?: number; sponsormood?: number; rep?: number; budget?: number };
interface DecisionOption { label: string; hint?: string; disabled?: boolean; resolve: (s: GameState) => { text: string; fx: DecisionFx; good: boolean } }

/** Options live in code (functions don't save), so a decision is rebuilt from its id on pick. */
const DECISIONS: Record<string, (s: GameState) => DecisionOption[]> = {
  d_wifi: (s) => {
    const fixer = [...s.members].sort((a, b) => Number(b.role === 'logistics') - Number(a.role === 'logistics') || b.baseSkill - a.baseSkill)[0];
    const fixChance = hasTech(s, 'runofshow') ? 1 : clamp(0.45 + roleSkillSum(s, 'logistics') * 0.05, 0.45, 0.9);
    return [
      { label: 'Hotspot army ($1,500)', hint: 'Mood +7', disabled: s.budget < 1500,
        resolve: () => ({ text: 'Forty phones, forty hotspots, one very warm table. Everyone is back online.', fx: { mood: 7, budget: -1500 }, good: true }) },
      { label: fixer ? `Send ${fixer.name} to fix it` : 'Fix it yourself', hint: hasTech(s, 'runofshow') ? 'Run of Show: it\'s on tab 38' : `${Math.round(fixChance * 100)}% chance`,
        resolve: (st) => chance(st, fixChance)
          ? { text: `${fixer?.name ?? 'You'} found the router behind a vending machine. Unplugged it, plugged it back in. Hero.`, fx: { mood: 5 }, good: true }
          : { text: `${fixer?.name ?? 'You'} made it worse. The router now broadcasts a network called "sorry."`, fx: { mood: -3 }, good: false } },
      { label: 'Call it an "offline track"', hint: 'Rep +2, mood −4',
        resolve: () => ({ text: 'Hackers write code on paper. Two of them call it the best night of their lives. The rest are on Tree\'s WiFi.', fx: { rep: 2, mood: -4 }, good: false }) },
    ];
  },
  d_demo: (s) => {
    const out: DecisionOption[] = [
      { label: 'The flashy AI demo', hint: '50/50: quality +8 or −6',
        resolve: (st) => chance(st, 0.5)
          ? { text: 'It worked. The judges gasped. It was mostly a slideshow, but a confident one.', fx: { quality: 8 }, good: true }
          : { text: 'It asked the judges to log in to ChatGPT. Then it crashed. Then it apologized.', fx: { quality: -6 }, good: false } },
      { label: 'The one that definitely works', hint: 'Quality +3',
        resolve: () => ({ text: 'A to-do app. It works. The judges nod respectfully.', fx: { quality: 3 }, good: true }) },
    ];
    if (hasTech(s, 'mentors')) out.push({ label: 'Let a mentor fix the AI demo first', hint: 'Mentor Program: quality +6',
      resolve: () => ({ text: 'A mentor asked "have you tried caching it?" They had not. It works now.', fx: { quality: 6 }, good: true }) });
    if (hasTech(s, 'hwlab')) out.push({ label: 'The robot arm', hint: 'Hardware Lab: 70% for a big artistic boost',
      resolve: (st) => chance(st, 0.7)
        ? { text: 'The robot arm waved at the judges, then served them a slice of pizza. Standing ovation.', fx: { artistic: 10, quality: 4 }, good: true }
        : { text: 'It waved. Once. Then it caught fire, a little. Still the most memorable demo.', fx: { artistic: 3 }, good: false } });
    return out;
  },
  d_leland: () => [
    { label: 'Roast him on stage', hint: '60%: rep and mood up, or sponsors annoyed',
      resolve: (st) => chance(st, 0.6)
        ? { text: 'You read his tweets out loud in a calm voice. The room loses it. The clip does numbers.', fx: { rep: 3, mood: 4 }, good: true }
        : { text: 'Too far. A sponsor was in his group chat. They are "re-evaluating the partnership."', fx: { sponsormood: -6 }, good: false } },
    { label: 'Ignore him', hint: 'Nothing happens',
      resolve: () => ({ text: 'You keep going. The livestream has 11 viewers. Ten of them are Leland Sr.', fx: {}, good: true }) },
    { label: 'Invite him on stage', hint: 'Sponsors happy, hackers not',
      resolve: () => ({ text: 'He says "synergy" four times and pitches his AI agent. The sponsors love it. The hackers boo.', fx: { sponsormood: 6, mood: -5 }, good: false }) },
  ],
};

function addDecision(beats: Beat[], s: GameState, id: string, icon: string, title: string, text: string, defaultChoice: number) {
  const opts = DECISIONS[id](s);
  let def = defaultChoice;
  if (opts[def]?.disabled) def = opts.findIndex((o) => !o.disabled);
  beats.push({ id, icon, title, text, tone: 'neutral', choices: opts.map((o) => ({ label: o.label, hint: o.hint, disabled: o.disabled })), defaultChoice: def });
}

function decisionWifi(s: GameState, beats: Beat[]) {
  addDecision(beats, s, 'd_wifi', '📡', '3:07 AM: the WiFi dies', '2,000 laptops lose the internet at once. Someone is already writing a Medium post about it. What do you do?', s.members.length ? 1 : 2);
}

function decisionDemo(s: GameState, beats: Beat[]) {
  addDecision(beats, s, 'd_demo', '🎬', 'Which demo opens the expo?', 'The judges are walking in. The first demo sets the tone for everything after it.', 1);
}

function decisionLeland(s: GameState, beats: Beat[]) {
  addDecision(beats, s, 'd_leland', '📱', `${RIVAL_CEO} is crashing your closing ceremony`, `He's livestreaming into your projector from a boat. "Congrats on your little event. Anyway, synergy." The room looks at you.`, 1);
}

function chooseBeat(s: GameState, b: Beat, i: number) {
  const opt = DECISIONS[b.id]?.(s)[i];
  if (!opt) return;
  const r = opt.resolve(s);
  b.picked = i;
  b.outcome = r.text;
  b.tone = r.good ? 'good' : 'bad';
  for (const k of ['mood', 'quality', 'artistic', 'sponsormood'] as const) {
    if (r.fx[k]) s.flags[`hd_${k}`] = Number(s.flags[`hd_${k}`] ?? 0) + r.fx[k]!;
  }
  if (r.fx.rep) addRep(s, r.fx.rep);
  if (r.fx.budget) s.budget += r.fx.budget;
  log(s, `hackday:${b.id}`, String(i));
}

// ─────────────────────────────── callbacks to your week ───────────────────────────────

type Line = [TechId, string];
const DOORS_LINES: Line[] = [
  ['leetcode', 'The line goes around the block: everyone has to invert a binary tree to get a wristband.'],
  ['waitlist', 'One hacker still thinks they are #4,812 on the waitlist. They are let in out of pity.'],
  ['swag', 'The swag table is stripped bare in four minutes. Someone is wearing three hoodies.'],
  ['travel', 'A hacker flew in from Ohio on your dime and wants you to know it.'],
  ['olympiad', 'A 15-year-old IMO medalist is here. Her mom is waiting in the car.'],
];
const HACKING_LINES: Line[] = [
  ['mixer', 'The Team Matching Mixer paired a designer with a Rust dev. They are not speaking, but the app is beautiful.'],
  ['hwlab', 'The Hardware Lab smells like solder and ambition. Someone is building a robot arm "for pizza."'],
  ['poker', 'Someone already lost their laptop in a poker bet. They are coding on a borrowed iPad.'],
  ['workshops', 'The Git workshop ended with everyone in a merge conflict and a new friend.'],
  ['aicredits', 'The AI credits are gone in an hour. A business major spent them all on logo ideas.'],
];

function buildLine(s: GameState, lines: Line[]): string {
  const have = lines.filter(([id]) => hasTech(s, id));
  return have.length ? pick(s, have)[1] : '';
}

const CREW_MOMENTS: Record<TraitId, string> = {
  caffeinated: 'has had nine cold brews and set up every table in the venue before sunrise.',
  mole: 'is texting old friends at Tree. Their event is apparently "a lot."',
  rust10: 'rewrote the judging form in Rust at 2 AM. It still compiles.',
  nepo: 'got a sponsor to show up by texting "my dad."',
  linkedin: 'is live-posting the event. "I hosted 2,000 hackers. Here\'s what it taught me about B2B sales."',
  trenchcoat: 'covered registration, catering and the photo booth. Payroll has questions.',
  survivor: 'carried three teams across the finish line, again.',
  pivoted: 'changed the closing ceremony theme twice. Both were better.',
  veteran: 'has seen worse. Much worse. Everyone feels calmer.',
  replyguy: 'is "actually"-ing a judge. The judge is enjoying it.',
  sleeper: 'slept under the stage and woke up just in time for the demos.',
  arts: 'turned the venue into an art installation with tape and fairy lights.',
  grass: 'led a 4 AM walk outside. Six hackers saw the sun for the first time this week.',
  memer: 'turned every announcement into a meme. Attendance at announcements tripled.',
};

function treeSideStory(s: GameState): string {
  const stats = [
    { v: s.treeOrg, low: 'Their AI agent ordered 4,000 Red Bulls and zero chairs. Hackers are coding on the floor.', high: 'Everything runs on time. It is eerie. Nobody is having fun.' },
    { v: s.treeTalent, low: 'Every Tree demo is the same ChatGPT wrapper with a different gradient.', high: 'A Tree team built a real product. Leland Sr. is already trying to buy it.' },
    { v: s.treeHype, low: 'Their keynote livestream has 40 viewers. Leland Sr. is one of them, twice.', high: 'Their keynote livestream hits 50k viewers. 49k of them are bots he bought.' },
  ];
  // The stat furthest from average tells the story.
  const top = stats.reduce((a, b) => (Math.abs(b.v - 60) > Math.abs(a.v - 60) ? b : a));
  return top.v < 60 ? top.low : top.high;
}
