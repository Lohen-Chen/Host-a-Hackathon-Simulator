import type { Effects } from '../core/effects';
import type { RegionId } from '../core/types';

export interface NewsDef {
  id: string;
  icon: string;
  title: string;
  body: string;
  /** shown under the body so the player knows what changed */
  effect: string;
  fx: Effects;
  /** where the map marker points, if anywhere */
  region?: RegionId;
}

// Scripted world news (Plague Inc headline popups). Each fires at most once per run, on a random day.
export const NEWS: NewsDef[] = [
  {
    id: 'purdue_natty', region: 'b1g', icon: '🏈', title: 'Purdue football wins natty',
    body: 'Purdue has won the national championship. West Lafayette is on fire (mostly figuratively). B1G students are hyped about everything, including hackathons.',
    effect: 'B1G Schools: hype up for everyone',
    fx: { impulse: { target: 'b1g', amount: 0.15 }, treeImpulse: { target: 'b1g', amount: 0.08 } },
  },
  {
    id: 'purdue_iu', region: 'b1g', icon: '📉', title: 'Purdue obliterates IU in 80-2 game',
    body: 'Purdue beat IU 80-2. Nobody is sure which sport it was. Shaken IU students are looking for a new identity, and "hacker" is right there.',
    effect: 'B1G Schools: +400 interested hackers',
    fx: { signups: 50 },
  },
  {
    id: 'iu_chaos', region: 'b1g', icon: '🌪️', title: 'IU falls to chaos',
    body: 'Bloomington has descended into chaos. Three dining halls declared independence. Nobody is reading their email, including Tree University\'s.',
    effect: 'B1G Schools: Tree loses its grip',
    fx: { treeImpulse: { target: 'b1g', amount: -0.15 }, impulse: { target: 'b1g', amount: 0.05 } },
  },
  {
    id: 'kelley_annoying', region: 'b1g', icon: '👔', title: 'IU Kelley School named #1 in most annoying students',
    body: 'A national survey crowned IU\'s Kelley School of Business the home of the most annoying students. Kelley students celebrated by sending LinkedIn invites to the survey.',
    effect: 'Business majors sign up to "network": +250 interested, participant mood −2',
    fx: { signups: 30, mood: -2 },
  },
  {
    id: 'carp_drones', icon: '🚁', title: 'Alex Carp proposes snack bar drones',
    body: 'Alex Carp wants drones spraying sugar-laced Coke Zero on people who keep taking all the food from the snack bar. Snack bar usage plummets.',
    effect: 'Participant mood −2 · project quality +2 (fewer snack breaks)',
    fx: { mood: -2, quality: 2 },
  },
  {
    id: 'flying_cars', icon: '🚗', title: 'Man will join a hackathon "when cars fly"',
    body: 'A man claims he\'ll join his first hackathon when cars fly… Oh wait.',
    effect: '+1 participant',
    fx: { signups: 1 / 8 },
  },
  {
    id: 'bear_21', icon: '🃏', title: 'Bear U students try to recreate 21 (2008)',
    body: 'A group of Bear University students tried to recreate the movie 21 at a casino. They were caught immediately. One of them was counting on his fingers.',
    effect: 'Reputation −2 (worth it)',
    fx: { rep: -2 },
  },
  {
    id: 'tree_21', icon: '🃏', title: 'Tree U students try to recreate 21 (2008)',
    body: 'A group of Tree University students tried to recreate the movie 21 at a casino. They were caught immediately. Their pitch deck called it "a liquidity event."',
    effect: 'Tree hype −4',
    fx: { treeHype: -4 },
  },
  {
    id: 'thiel_underclass', icon: '🏚️', title: 'Petros Thiel warns of a "permanent underclass"',
    body: 'Petros Thiel claims everyone who doesn\'t go to hackathons will be part of the "permanent underclass." Interest jumps two-fold.',
    effect: 'Hype jumps everywhere (for Tree too)',
    fx: { impulse: { target: 'all', amount: 0.05 }, treeImpulse: { target: 'all', amount: 0.03 } },
  },
  {
    id: 'pope_ai', icon: '⛪', title: 'The Pope declares AI not sentient',
    body: 'The Pope has declared that AI is not sentient. Relieved of their guilt about saying "please" to chatbots, students get to work. Productivity increases by 200%.',
    effect: 'Crew output ×3 for the rest of the day',
    fx: { outputMult: 3 },
  },
  {
    id: 'model_ai', icon: '🤖', title: 'Mario A. Model declares AI sentient',
    body: 'Venture capitalist Mario A. Model declares AI to be sentient. Productivity remains the same.',
    effect: 'Nothing changes. Nothing ever changes.',
    fx: {},
  },
  {
    id: 'ai_crabs', region: 'twitter', icon: '🦀', title: 'Transhumanists reveal humanity\'s final form',
    body: 'Transhumanists declare the final form of humanity to be AI-native crabs. Twitter/X has thoughts. So do the crabs.',
    effect: 'Twitter/X: hype up for everyone',
    fx: { impulse: { target: 'twitter', amount: 0.1 }, treeImpulse: { target: 'twitter', amount: 0.05 } },
  },
  {
    id: 'lotr_names', icon: '💍', title: 'Lord of the Rings sales skyrocket',
    body: 'Lord of the Rings book sales skyrocket as yet another company takes a name from it. Middle-earth is now mostly defense contractors and AI-native startups.',
    effect: 'Sponsors are in a naming mood: invite chance up',
    fx: { inviteBonus: 0.05 },
  },
  {
    id: 'ai_laundromat', icon: '🧺', title: 'Laundromat raises $40M to become "AI-native"',
    body: 'A Berkeley laundromat raised $40M to become "AI-native." The machines now say "thinking…" before eating your socks. Short Ocean bought it by lunch.',
    effect: 'Sponsors smell money: invite chance up',
    fx: { inviteBonus: 0.05 },
  },
  {
    id: 'pe_dining', icon: '🏦', title: 'Private equity buys the dining hall',
    body: 'Blackstump Capital bought the campus dining hall. Pizza is now $19, "AI-native," and slightly smaller. Hungry students remember that hackathons have free food.',
    effect: '+160 interested hackers',
    fx: { signups: 20 },
  },
];

export const NEWS_BY_ID = Object.fromEntries(NEWS.map((n) => [n.id, n])) as Record<string, NewsDef>;
