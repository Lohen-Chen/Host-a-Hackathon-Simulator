// Hackathon Day: ~10 state-aware text beats, then results (Section 6.11).
import { PROMISES } from '../content/promises';
import { SPONSOR_BY_ID } from '../content/sponsors';
import { TREE_BACKUP, VENUE_BY_ID } from '../content/venues';
import { log } from './helpers';
import { RIVAL_CEO, joke, treeRegionCount } from './jokes';
import { checkPromises, expectedAttendees, scoreBear, scoreTree, treeAttendees, venueCap, type EventFacts } from './score';
import { pick, shuffle } from './rng';
import type { Beat, GameState } from './types';

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
  s.hackday = { beats: buildBeats(s, facts), index: 0, t: 0 };

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
      : pick(s, ['Tree wins this year. Leland Sr. called it "synergy."', 'Tree had more hackers. You had more heart. (Heart is not a metric.)', 'Defeat. But the Blue Screen respects you.']),
  };
  log(s, 'result', win ? 'win' : 'loss', bear.total);
}

function buildBeats(s: GameState, f: EventFacts): Beat[] {
  const v = VENUE_BY_ID[s.venue ?? 'lawn'];
  const beats: Beat[] = [];
  const add = (id: string, icon: string, title: string, text: string, tone: Beat['tone'] = 'neutral') => beats.push({ id, icon, title, text, tone });

  // 1. Doors open
  if (f.overflow > 0) add('doors', '🚪', 'Doors open', `${Math.round(f.expected)} hackers showed up for ${f.cap} spots at ${v.name}. The fire marshal is counting out loud. ${Math.round(f.overflow)} were sent to the parking lot.`, 'bad');
  else if (f.attendees < f.cap * 0.4) add('doors', '🚪', 'Doors open', `${f.attendees} hackers in a venue for ${f.cap}. You can hear an echo. The echo signed up too.`, 'bad');
  else add('doors', '🚪', 'Doors open', `${f.attendees} hackers pour into ${v.name}. ${v.joke}`, 'good');

  // 2. Opening ceremony (promise check #1)
  const p1 = s.promises[0];
  const dave = s.flags.dave === 'hired' ? ' Dave from Sponsorship emails the whole audience a welcome. Twice.' : '';
  if (p1) add('opening', '🎤', 'Opening ceremony', `${p1.kept ? PROMISES[p1.kind].kept : PROMISES[p1.kind].broken}${dave}`, p1.kept ? 'good' : 'bad');
  else add('opening', '🎤', 'Opening ceremony', `No sponsors to thank, so the president thanked the router. The router did not respond.${dave}`);

  // 3. Hacking begins
  add('hacking', '⌨️', 'Hacking begins', `Teams form in record time. One team is building "${joke(s, 'project')}." Another is just four people and a whiteboard that says "AI?"`);

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

  // 6. Protest (Balantir)
  if (f.protest) add('protest', '📢', 'Protest', 'Hackers protest the Balantir "Defense track." Signs read "HACK THE PLANET, NOT THE PLANET." The Balantir rep watches. Silently. Through sunglasses.', 'bad');

  // 7. Blue Screen
  if (s.flags.bsod === 'rebooted') add('bsod', '🦸', 'The Blue Screen returns', 'The projector shows a sad face. An IT hero steps up: "Have you tried turning it off and on again?" It works. Standing ovation.', 'good');
  else if (s.flags.bsod === 'haunted') add('bsod', '🟦', 'The Blue Screen returns', 'Mid-ceremony, the projector dies and shows a giant sad face :( "Your hackathon ran into a problem." Nobody knows how to reboot it.', 'bad');

  // 8. Demo expo
  const projects = [joke(s, 'project'), joke(s, 'project'), joke(s, 'project')];
  add('expo', '🏆', 'Demo expo', `Judges see "${projects[0]}," "${projects[1]}," and "${projects[2]}." One demo works. It was on one machine.`);

  // 9. Tree check-in
  const tv = s.treeVenue ? VENUE_BY_ID[s.treeVenue].name : TREE_BACKUP.name;
  const tr = treeRegionCount(s);
  add('tree', '🌲', 'Meanwhile at Tree U', `At ${tv}, ${RIVAL_CEO} is giving a keynote about synergy from his phone. Tree controlled ${tr}/8 regions. ${pick(s, TREE_CHAOS)}`);

  // 10. Closing ceremony (promise check #2 + callbacks)
  const rest = s.promises.slice(1, 3).map((p) => (p.kept ? PROMISES[p.kind].kept : PROMISES[p.kind].broken));
  const founder = Number(s.flags.founderRound ?? 0) >= 1 ? ' The walk-in founder returns, now "a unicorn." The product is still "coming soon."' : '';
  const rust = Number(s.flags.rust ?? 0) >= 1 ? ' The website is still in Rust. It still compiles.' : '';
  add('closing', '🎉', 'Closing ceremony', `${rest.join(' ') || 'Awards are handed out. Everyone gets a sticker.'}${founder}${rust}`.trim(), f.broken > f.kept ? 'bad' : 'good');

  // 11. After-party epilogue
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
  if (s.flags.bsod === 'rebooted') out.push('IT Hero: Turned It Off and On Again');
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
  if (!h) return;
  h.index++;
  h.t = 0;
  if (h.index >= h.beats.length) s.phase = 'results';
}

export function hackdaySkip(s: GameState) {
  if (s.hackday) s.hackday.index = s.hackday.beats.length;
  s.phase = 'results';
}
