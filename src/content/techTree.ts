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
  /** optional flavor shown instead of a techjoke line */
  desc?: string;
  /** news text when a rumor unlocks this node for free (Plague Inc "mutation") */
  rumor: string;
}

export const BRANCHES: { id: TechBranch; name: string; icon: string; blurb: string }[] = [
  { id: 'hype', name: 'Hype', icon: '📣', blurb: 'How fast word spreads between regions, and how hard posts hit.' },
  { id: 'talent', name: 'Talent', icon: '🧠', blurb: 'Crew output, project quality and participant mood.' },
  { id: 'conversion', name: 'Conversion', icon: '🎟️', blurb: 'How many aware students become interested, and how cheap they are to confirm.' },
];

// Three branches, each a tree grown from one root node (prereq = parent). Every node also raises the "interested" pool a little,
// so each unlock increases how many hackers you could confirm (if you pay for them).
export const TECH: TechNode[] = [
  // ── Hype ──
  { id: 'website', name: 'Website', branch: 'hype', cost: 4, bars: { hype: 10 }, effect: 'Website task + live preview; slower hype decay; Hype Reel & Countdown posts.', joke: 'website',
    rumor: 'A rumor says Bear Hacks has "the best website in the Bay." Someone panicked and built one overnight.' },
  { id: 'promo', name: 'Promo Video', branch: 'hype', cost: 6, prereq: 'website', bars: { hype: 14 }, effect: 'Influencer Collab joins the post rotation.', joke: 'promo',
    rumor: 'A rumor says a celebrity is in the Bear Hacks promo video. Now there is a promo video. The celebrity is the club dog.' },
  { id: 'reelposts', name: 'Content Calendar', branch: 'hype', cost: 4, prereq: 'website', bars: { hype: 8 }, effect: '+1 📱 post bubble per day.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks posts every hour. The social team started posting every hour to keep the rumor true.' },
  { id: 'memes', name: 'Meme Lord Pipeline', branch: 'hype', cost: 5, prereq: 'reelposts', bars: { hype: 12 }, effect: 'Post viral chance +6%.', joke: 'stretch',
    rumor: 'A rumor says the Bear Hacks meme account is run by a 14-year-old genius. It is now. He is very good.' },
  { id: 'billboard', name: 'Billboard', branch: 'hype', cost: 8, prereq: 'promo', bars: { hype: 18 }, effect: 'Reputation +10.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks bought a billboard on the 101. Someone with a ladder made it true.' },
  { id: 'influencers', name: 'Influencer Network', branch: 'hype', cost: 7, prereq: 'promo', bars: { hype: 14 }, effect: '+1 📱 post bubble per day; posts spill 50% further into neighbors.', joke: 'stretch',
    desc: 'Twelve creators, one ring light, a shared Google Doc of hashtags.',
    rumor: 'A rumor says every TikToker on campus is "collabing with Bear Hacks." Eleven of them now are.' },
  { id: 'clapback', name: 'Clapback Team', branch: 'hype', cost: 5, prereq: 'website', bars: { hype: 6 }, effect: 'Tree moves land at 60% strength.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks has a "clapback team." Three sophomores formed one in a group chat. They are ruthless.' },
  // ── Talent ──
  { id: 'clubfair', name: 'Club Fair', branch: 'talent', cost: 3, bars: { talent: 5 }, effect: 'Unlock the Recruiter role.', joke: 'clubfair',
    rumor: 'A rumor says Bear Hacks is "the club to join this year." 40 freshmen showed up at the fair table. Recruiters unlocked.' },
  { id: 'design', name: 'Design Track', branch: 'talent', cost: 4, prereq: 'clubfair', bars: { talent: 6 }, effect: 'Unlock the Designer role.', joke: 'design',
    rumor: 'A rumor says Bear Hacks has a design track. Two designers believed it and joined. Now it does.' },
  { id: 'logistics', name: 'Logistics Track', branch: 'talent', cost: 4, prereq: 'clubfair', bars: { talent: 6 }, effect: 'Unlock the Logistics role.', joke: 'logistics',
    rumor: 'A rumor says Bear Hacks has "military-grade logistics." A person with a label maker appeared to make it so.' },
  { id: 'coordinator', name: 'Coordinator Track', branch: 'talent', cost: 5, prereq: 'clubfair', bars: { talent: 6 }, effect: 'Unlock the Coordinator role.', joke: 'coordinator',
    rumor: 'A rumor says Bear Hacks "answers sponsor emails within the hour." A coordinator joined out of professional curiosity.' },
  { id: 'training2', name: 'Training II', branch: 'talent', cost: 5, prereq: 'clubfair', bars: { talent: 12 }, effect: 'Crew skill ×1.5.', joke: 'training1',
    rumor: 'A rumor says the Bear Hacks crew are "cracked." The crew heard and started a study group. They are cracked now.' },
  { id: 'training3', name: 'Training III', branch: 'talent', cost: 8, prereq: 'training2', bars: { talent: 14 }, effect: 'Crew skill ×1.7.', joke: 'training2',
    rumor: 'A rumor says the Bear Hacks crew have "never slept." They have stopped sleeping. Output is up.' },
  { id: 'mentors', name: 'Mentor Program', branch: 'talent', cost: 6, prereq: 'training2', bars: { talent: 12 }, effect: 'Project quality +8 at the event.', joke: 'stretch',
    desc: 'Senior engineers, free coffee, and one guy who only says "have you tried caching it?"',
    rumor: 'A rumor says Bear Hacks mentors are "ex-FAANG." Two alumni heard and volunteered. One was an intern. Close enough.' },
  { id: 'prestige2', name: 'Club Prestige', branch: 'talent', cost: 6, prereq: 'coordinator', bars: { talent: 8 }, effect: '7 candidates every morning.', joke: 'prestige',
    rumor: 'A rumor says joining Bear Hacks "looks great on a resume." The applicant line wraps around Sproul.' },
  { id: 'snack', name: 'Snack Bar', branch: 'talent', cost: 4, prereq: 'logistics', bars: { talent: 8 }, effect: 'Participant mood +8 at the event.', joke: 'snack',
    rumor: 'A rumor started that Bear Hacks has a free pizza party. Now you have to have one. Snack Bar unlocked!' },
  { id: 'nepolist', name: 'Nepo List', branch: 'talent', cost: 5, prereq: 'prestige2', bars: { talent: 12 }, effect: '+2 candidates every morning, and they are better.', joke: 'stretch',
    desc: 'We prefer the term "direct recruitment"...',
    rumor: 'A rumor says Bear Hacks hires "only the best families." Three deans\' kids applied the same afternoon. Nepo List unlocked.' },
  // ── Conversion ──
  { id: 'applications', name: 'Application Portal', branch: 'conversion', cost: 3, bars: { conversion: 10 }, effect: 'More aware students apply.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks applications take "30 seconds." Someone rebuilt the form so they do.' },
  { id: 'discord', name: 'Discord Server', branch: 'conversion', cost: 4, prereq: 'applications', bars: { conversion: 10, hype: 4 }, effect: 'Interested hackers stick around.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks has a Discord with 10,000 members. It has 12. Then it had 3,000. Rumors work.' },
  { id: 'reminders', name: 'Reminder Emails', branch: 'conversion', cost: 5, prereq: 'discord', bars: { conversion: 10 }, effect: 'Show rate +5% (more confirmed hackers actually come).', joke: 'stretch',
    desc: 'Subject: "🚨 FINAL reminder (for real this time) (v3)"',
    rumor: 'A rumor says Bear Hacks texts you until you show up. Someone wrote the script. It is relentless.' },
  { id: 'travel', name: 'Travel Reimbursement', branch: 'conversion', cost: 6, prereq: 'applications', bars: { conversion: 14 }, effect: 'Confirming a hacker costs $3 less.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks pays for flights. Finance found a loophole. It sort of does now.' },
  { id: 'aicredits', name: 'AI Credits', branch: 'conversion', cost: 5, prereq: 'discord', bars: { conversion: 12, talent: 4 }, effect: 'Free credits for every hacker. Attracts… business majors.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks gives out unlimited AI credits. Finance found some. "Unlimited" is doing a lot of work.' },
  { id: 'swag', name: 'Swag Bags', branch: 'conversion', cost: 5, prereq: 'travel', bars: { conversion: 10 }, effect: 'Confirming a hacker costs $2 less.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks swag includes a hoodie. 2,000 hoodies were ordered in a panic.' },
  { id: 'rep2', name: 'Reputation II', branch: 'conversion', cost: 6, prereq: 'applications', bars: { conversion: 8 }, effect: 'Reputation cap 150; Golden Bear sponsors.', joke: 'rep2',
    rumor: 'A rumor says Bear Hacks is "basically Ivy League." Golden Bear sponsors started calling.' },
  { id: 'rep3', name: 'Reputation III', branch: 'conversion', cost: 9, prereq: 'rep2', bars: { conversion: 10 }, effect: 'Reputation cap 200.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks "invented hackathons." Wikipedia was edited. Nobody has fixed it.' },
];

export const TECH_BY_ID = Object.fromEntries(TECH.map((t) => [t.id, t])) as Record<TechId, TechNode>;
