// Burnout: the bigger the crew, the likelier someone burns out. A burned-out member
// who works the next day quits that night; a rest day (no task) brings them back.
import { DAYS, T } from './config';
import { addTicker, log } from './helpers';
import { chance, pick } from './rng';
import type { GameState } from './types';

const QUIT_LINES = [
  'said it\'s not you, it\'s the group chat pings',
  'left to "focus on their startup." The startup is a group chat',
  'joined Tree University\'s hackathon team. They offered a hoodie',
  'quit by changing their Slack status to 🏝️',
];

export const burnoutChance = (s: GameState) => Math.min(T.burnoutMax, Math.max(0, s.members.length - T.burnoutFree) * T.burnoutPerMember);

/** Night: burned-out members who worked today quit; rested ones recover; maybe someone new burns out. */
export function crewNight(s: GameState): string[] {
  const lines: string[] = [];
  for (const m of [...s.members]) {
    if (!m.burnout) continue;
    if (m.burnoutWorked) {
      s.members = s.members.filter((x) => x.id !== m.id);
      const why = pick(s, QUIT_LINES);
      lines.push(`😤 ${m.name} quit. They ${why}.`);
      addTicker(s, 'BEAR BEAT', `Bear Hacks organizer ${m.name} quits; ${why}`.slice(0, 100));
      log(s, 'quit', m.name);
    } else {
      m.burnout = false;
      lines.push(`😌 ${m.name} took a rest day and is back to normal.`);
    }
  }
  if (s.day < DAYS && s.members.length && chance(s, burnoutChance(s))) {
    const m = pick(s, s.members.filter((x) => !x.burnout).length ? s.members.filter((x) => !x.burnout) : s.members);
    m.burnout = true;
    m.burnoutWorked = false;
    lines.push(`🔥 ${m.name} is burned out. Give them a rest day (no task) tomorrow or they quit tomorrow night.`);
    log(s, 'burnout', m.name);
  }
  return lines;
}

/** Next hire costs more as the crew grows (no hard cap). */
export const hireCost = (s: GameState) => T.hireCost + T.hireStep * Math.max(0, s.members.length - T.hireFree);
