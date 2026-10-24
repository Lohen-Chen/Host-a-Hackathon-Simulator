import type { TechBranch, TechId } from '../core/types';

export interface TechNode {
  id: TechId;
  name: string;
  branch: TechBranch;
  cost: number;
  prereq?: TechId;
  effect: string;
  /** how much this node fills each of the three Plague Inc-style bars */
  bars: Partial<Record<TechBranch, number>>;
  /** joke category key in jokes.txt (techjoke|<key>) */
  joke: string;
  /** news text when a rumor unlocks this node for free (Plague Inc "mutation") */
  rumor: string;
}

export const BRANCHES: { id: TechBranch; name: string; icon: string; blurb: string }[] = [
  { id: 'hype', name: 'Hype', icon: '📣', blurb: 'How fast word spreads between regions, and how hard posts hit.' },
  { id: 'talent', name: 'Talent', icon: '🧠', blurb: 'Crew output, project quality and participant mood.' },
  { id: 'conversion', name: 'Conversion', icon: '🎟️', blurb: 'How many aware students become interested, and how cheap they are to confirm.' },
];

// Three tabs, Plague Inc evolution-menu style. Every node also raises the "interested" pool a little,
// so each unlock increases how many hackers you could confirm (if you pay for them).
export const TECH: TechNode[] = [
  // ── Hype ──
  { id: 'website', name: 'Website', branch: 'hype', cost: 4, bars: { hype: 10 }, effect: 'Website task + live preview; slower hype decay; Hype Reel & Countdown cards.', joke: 'website',
    rumor: 'A rumor says Bear Hacks has "the best website in the Bay." Someone panicked and built one overnight.' },
  { id: 'promo', name: 'Promo Video', branch: 'hype', cost: 6, prereq: 'website', bars: { hype: 14 }, effect: 'Influencer Collab card.', joke: 'promo',
    rumor: 'A rumor says a celebrity is in the Bear Hacks promo video. Now there is a promo video. The celebrity is the club dog.' },
  { id: 'reelposts', name: 'Content Calendar', branch: 'hype', cost: 4, bars: { hype: 8 }, effect: '+1 post charge per day.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks posts every hour. The social team started posting every hour to keep the rumor true.' },
  { id: 'memes', name: 'Meme Lord Pipeline', branch: 'hype', cost: 5, bars: { hype: 12 }, effect: 'Post viral chance +6%.', joke: 'stretch',
    rumor: 'A rumor says the Bear Hacks meme account is run by a 14-year-old genius. It is now. He is very good.' },
  { id: 'billboard', name: 'Billboard', branch: 'hype', cost: 8, prereq: 'promo', bars: { hype: 18 }, effect: 'Reputation +10.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks bought a billboard on the 101. Someone with a ladder made it true.' },
  { id: 'clapback', name: 'Clapback Team', branch: 'hype', cost: 5, bars: { hype: 6 }, effect: 'Tree moves land at 60% strength.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks has a "clapback team." Three sophomores formed one in a group chat. They are ruthless.' },
  // ── Talent ──
  { id: 'clubfair', name: 'Club Fair', branch: 'talent', cost: 3, bars: { talent: 5 }, effect: 'Unlock the Recruiter role.', joke: 'clubfair',
    rumor: 'A rumor says Bear Hacks is "the club to join this year." 40 freshmen showed up at the fair table. Recruiters unlocked.' },
  { id: 'design', name: 'Design Track', branch: 'talent', cost: 4, bars: { talent: 6 }, effect: 'Unlock the Designer role.', joke: 'design',
    rumor: 'A rumor says Bear Hacks has a design track. Two designers believed it and joined. Now it does.' },
  { id: 'logistics', name: 'Logistics Track', branch: 'talent', cost: 4, bars: { talent: 6 }, effect: 'Unlock the Logistics role.', joke: 'logistics',
    rumor: 'A rumor says Bear Hacks has "military-grade logistics." A person with a label maker appeared to make it so.' },
  { id: 'coordinator', name: 'Coordinator Track', branch: 'talent', cost: 5, bars: { talent: 6 }, effect: 'Unlock the Coordinator role.', joke: 'coordinator',
    rumor: 'A rumor says Bear Hacks "answers sponsor emails within the hour." A coordinator joined out of professional curiosity.' },
  { id: 'training2', name: 'Training II', branch: 'talent', cost: 5, bars: { talent: 12 }, effect: 'Crew skill ×1.5.', joke: 'training1',
    rumor: 'A rumor says the Bear Hacks crew are "cracked." The crew heard and started a study group. They are cracked now.' },
  { id: 'training3', name: 'Training III', branch: 'talent', cost: 8, prereq: 'training2', bars: { talent: 14 }, effect: 'Crew skill ×1.7.', joke: 'training2',
    rumor: 'A rumor says the Bear Hacks crew have "never slept." They have stopped sleeping. Output is up.' },
  { id: 'prestige2', name: 'Club Prestige', branch: 'talent', cost: 6, bars: { talent: 8 }, effect: '7 candidates every morning.', joke: 'prestige',
    rumor: 'A rumor says joining Bear Hacks "looks great on a resume." The applicant line wraps around Sproul.' },
  { id: 'snack', name: 'Snack Bar', branch: 'talent', cost: 4, bars: { talent: 8 }, effect: 'Participant mood +8 at the event.', joke: 'snack',
    rumor: 'A rumor started that Bear Hacks has a free pizza party. Now you have to have one. Snack Bar unlocked!' },
  // ── Conversion ──
  { id: 'applications', name: 'Application Portal', branch: 'conversion', cost: 3, bars: { conversion: 10 }, effect: 'More aware students apply.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks applications take "30 seconds." Someone rebuilt the form so they do.' },
  { id: 'discord', name: 'Discord Server', branch: 'conversion', cost: 4, bars: { conversion: 10, hype: 4 }, effect: 'Interested hackers stick around.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks has a Discord with 10,000 members. It has 12. Then it had 3,000. Rumors work.' },
  { id: 'travel', name: 'Travel Reimbursement', branch: 'conversion', cost: 6, bars: { conversion: 14 }, effect: 'Confirming a hacker costs $3 less.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks pays for flights. Finance found a loophole. It sort of does now.' },
  { id: 'aicredits', name: 'AI Credits', branch: 'conversion', cost: 5, bars: { conversion: 12, talent: 4 }, effect: 'Free credits for every hacker. Attracts… business majors.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks gives out unlimited AI credits. Finance found some. "Unlimited" is doing a lot of work.' },
  { id: 'swag', name: 'Swag Bags', branch: 'conversion', cost: 5, bars: { conversion: 10 }, effect: 'Confirming a hacker costs $2 less.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks swag includes a hoodie. 2,000 hoodies were ordered in a panic.' },
  { id: 'rep2', name: 'Reputation II', branch: 'conversion', cost: 6, bars: { conversion: 8 }, effect: 'Reputation cap 150; Golden Bear sponsors.', joke: 'rep2',
    rumor: 'A rumor says Bear Hacks is "basically Ivy League." Golden Bear sponsors started calling.' },
  { id: 'rep3', name: 'Reputation III', branch: 'conversion', cost: 9, prereq: 'rep2', bars: { conversion: 10 }, effect: 'Reputation cap 200.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks "invented hackathons." Wikipedia was edited. Nobody has fixed it.' },
];

export const TECH_BY_ID = Object.fromEntries(TECH.map((t) => [t.id, t])) as Record<TechId, TechNode>;
