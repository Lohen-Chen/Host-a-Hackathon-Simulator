import type { Effects } from '../core/effects';

export interface NewsDef {
  id: string;
  icon: string;
  title: string;
  body: string;
  /** shown under the body so the player knows what changed */
  effect: string;
  fx: Effects;
}

// Scripted world news (Plague Inc headline popups). Each fires at most once per run, on a random day.
export const NEWS: NewsDef[] = [
  {
    id: 'purdue_natty', icon: '🏈', title: 'Purdue football wins natty',
    body: 'Purdue has won the national championship. West Lafayette is on fire (mostly figuratively). B1G students are hyped about everything, including hackathons.',
    effect: 'B1G Schools: hype up for everyone',
    fx: { impulse: { target: 'b1g', amount: 0.15 }, treeImpulse: { target: 'b1g', amount: 0.08 } },
  },
  {
    id: 'purdue_iu', icon: '📉', title: 'Purdue obliterates IU in 80-2 game',
    body: 'Purdue beat IU 80-2. Nobody is sure which sport it was. Shaken IU students are looking for a new identity, and "hacker" is right there.',
    effect: 'B1G Schools: +400 interested hackers',
    fx: { signups: 50 },
  },
  {
    id: 'iu_chaos', icon: '🌪️', title: 'IU falls to chaos',
    body: 'Bloomington has descended into chaos. Three dining halls declared independence. Nobody is reading their email, including Tree University\'s.',
    effect: 'B1G Schools: Tree loses its grip',
    fx: { treeImpulse: { target: 'b1g', amount: -0.15 }, impulse: { target: 'b1g', amount: 0.05 } },
  },
  {
    id: 'kelley_annoying', icon: '👔', title: 'IU Kelley School named #1 in most annoying students',
    body: 'A national survey crowned IU\'s Kelley School of Business the home of the most annoying students. Kelley students celebrated by sending LinkedIn invites to the survey.',
    effect: 'Business majors sign up to "network": +250 interested, participant mood −2',
    fx: { signups: 30, mood: -2 },
  },
];

export const NEWS_BY_ID = Object.fromEntries(NEWS.map((n) => [n.id, n])) as Record<string, NewsDef>;
