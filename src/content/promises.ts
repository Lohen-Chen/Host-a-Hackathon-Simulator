import type { GameState, PromiseKind } from '../core/types';

export interface PromiseCtx { s: GameState; attendees: number; venueCap: number; hasRole: (r: string) => boolean }

export interface PromiseDef {
  text: string;
  check: (c: PromiseCtx) => boolean;
  kept: string;
  broken: string;
}

// Each promise is checked on hackathon day (opening and closing ceremonies).
export const PROMISES: Record<PromiseKind, PromiseDef> = {
  logo_site: { text: 'Logo on the website', check: (c) => c.s.websiteScore >= 30, kept: 'Logo on the website. Above the fold, even.', broken: "Their logo is on the website's 404 page. Only there." },
  attendees200: { text: '200+ attendees', check: (c) => c.attendees >= 200, kept: '200+ hackers. The sponsor counted twice.', broken: 'Promised 200 hackers. Delivered a nice small dinner party.' },
  attendees500: { text: '500+ attendees', check: (c) => c.attendees >= 500, kept: '500 hackers. The blimp was not needed.', broken: 'Promised 500. The other 380 were "on the waitlist in spirit."' },
  agi: { text: 'Mention "AGI" at the opening ceremony', check: (c) => c.s.reputation >= 30, kept: 'You said "AGI" at the opening. A GPU somewhere shed a tear.', broken: 'You forgot to say "AGI." ClosedAI\'s rep said it for you. Eleven times.' },
  drink_station: { text: 'Drink station at every table', check: (c) => c.s.unlockedTech.includes('snack') || c.hasRole('logistics'), kept: 'Drink station at every table. Nobody has slept since.', broken: 'One drink station. Forty tables. A line to the parking lot.' },
  tournament: { text: 'Side tournament', check: (c) => c.venueCap >= 400, kept: 'The side tournament ended in a 3 AM upset. Legends were born.', broken: 'No room for the tournament. It was held in a stairwell.' },
  livestream: { text: 'Livestream a "launch" of a hackathon project', check: (c) => c.s.websiteScore >= 50, kept: 'A to-do app was "launched" on a livestream. 12,000 viewers.', broken: 'The launch livestream buffered. The rocket emoji never left the pad.' },
  defense_track: { text: '"Defense track" prize', check: () => true, kept: 'The "Defense track" happened. So did the protest.', broken: '' },
  vc_slot: { text: '3-minute VC pitch slot', check: () => true, kept: 'The VC pitched for 3 minutes. It felt like 3 years.', broken: '' },
  logo_everywhere: { text: 'Logo on every surface', check: (c) => c.s.budget >= 1000, kept: 'Logos on every surface. Including the bear. The bear is fine.', broken: 'Ran out of printing budget. The logo was drawn on in marker.' },
  clippy: { text: 'Mentors must say "It looks like you\'re hacking"', check: (c) => c.hasRole('logistics') || c.s.reputation >= 50, kept: '"It looks like you\'re hacking." 300 times. Mentors need a nap.', broken: 'Mentors refused to say it. Macrohard sent a strongly worded paperclip.' },
  sticker_box: { text: 'Sticker on every box', check: (c) => c.s.budget >= 0, kept: 'Every box got a sticker. Some hackers got stickers too.', broken: "Couldn't afford stickers. Wrote 'DoorDish' on boxes with a Sharpie." },
  templates: { text: 'Teams must use templates', check: (c) => c.s.unlockedTech.length >= 4, kept: 'Every team used templates. Every project looks identical. Beautiful.', broken: 'Nobody used the templates. Notioned took notes about it.' },
  payments: { text: 'Every project must "integrate payments"', check: (c) => c.s.websiteScore >= 30, kept: 'Every project takes payments. Even the meditation app.', broken: 'Zero projects take payments. Stripey is "disappointed but not surprised."' },
  gpu_raffle: { text: 'One GPU raffle winner, many losers', check: () => true, kept: 'One winner. 399 losers. The raffle riot was brief but passionate.', broken: '' },
  data_lake: { text: 'Say "data lake" at least 10 times', check: (c) => c.s.reputation >= 25, kept: '"Data lake" said 14 times. Attendees now fear water.', broken: 'Said "data lake" only twice. Then "data puddle." It did not land.' },
  pre_seed: { text: 'Everyone must say "pre-seed" ten times', check: () => true, kept: 'Everyone said "pre-seed" ten times. Three people raised one.', broken: '' },
  afterparty_name: { text: 'YSee\'s name on the after-party', check: (c) => c.s.flags.afterparty !== 'declined', kept: 'The after-party had YSee\'s name on it. And on the cheese plate.', broken: 'No YSee after-party. YSee threw one anyway. You were not invited.' },
  no_customers: { text: 'No customers allowed within 50 feet', check: () => true, kept: 'No customers within 50 feet. Easy. There were no customers.', broken: '' },
  daily_post: { text: 'Sponsored post every day', check: (c) => c.s.postsFired >= 7, kept: 'A sponsored post every day. Followers are tired but loyal.', broken: 'Missed the daily sponsored posts. Wrinkle is "ironing out feelings."' },
  boba: { text: 'Boba flows', check: (c) => c.s.budget >= 0, kept: 'Boba flowed. Tapioca was found in places tapioca should not be.', broken: 'The boba stopped flowing. A brief silence fell over the venue.' },
  site80: { text: 'Website score 80+', check: (c) => c.s.websiteScore >= 80, kept: 'The website was so good the sponsor bookmarked it.', broken: 'The website was "under construction." Animated GIF and all.' },
  logo_moon: { text: 'Logo on the moon', check: () => false, kept: '', broken: 'The logo did not make it to the moon. It made it to a parking lot.' },
  hydration: { text: 'Hydration station', check: (c) => c.hasRole('logistics') || c.s.unlockedTech.includes('snack'), kept: 'Hydration station delivered. Very hydrated hackers.', broken: 'No hydration station. Hackers hydrated from the sprinklers.' },
};

/** Extra promises a sponsor may demand (and that overpromising adds). */
export const EXTRA_PROMISES: PromiseKind[] = ['logo_site', 'attendees200', 'attendees500', 'site80', 'logo_moon'];
