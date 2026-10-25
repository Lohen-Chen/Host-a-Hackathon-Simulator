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
  { id: 'hype', name: 'Hype', icon: '📣', blurb: 'How quickly word spreads, and how many aware students turn into interest.' },
  { id: 'org', name: 'Organization', icon: '🗂️', blurb: 'How well the event is run and how good your organizers are.' },
  { id: 'talent', name: 'Talent', icon: '🧠', blurb: 'How talented the hackers are: better projects, happier sponsors.' },
];

// Three branches, each a tree grown from one root node (prereq = parent). Every node also raises the "interested" pool a little,
// so each unlock increases how many hackers you could confirm (if you pay for them).
export const TECH: TechNode[] = [
  // ── Hype ──
  { id: 'website', name: 'Website', branch: 'hype', cost: 4, bars: { hype: 10 }, effect: 'Website task + live preview; slower hype decay; Hype Reel & Countdown posts.', joke: 'website',
    rumor: 'A rumor says Bear Hacks has "the best website in the Bay." Someone panicked and built one overnight.' },
  { id: 'promo', name: 'Promo Video', branch: 'hype', cost: 6, prereq: 'website', bars: { hype: 14 }, effect: 'Influencer Collab joins the post rotation.', joke: 'promo',
    rumor: 'A rumor says a celebrity is in the Bear Hacks promo video. Now there is a promo video. The celebrity is the club dog.' },
  { id: 'sfbus', name: 'SF Bus Ad', branch: 'hype', cost: 8, prereq: 'promo', bars: { hype: 18 }, effect: 'Reputation +8; Twitter/X hype up.', joke: 'stretch',
    desc: '"Using 90% of our budget on our domain name." "Anguilla loves our money."',
    rumor: 'A rumor says Bear Hacks has an ad on every Muni bus. Someone with a vinyl printer made it true on the 38 Geary.' },
  { id: 'influencers', name: 'Influencer Network', branch: 'hype', cost: 7, prereq: 'promo', bars: { hype: 14 }, effect: '+1 📱 post bubble per day; posts spill 50% further into neighbors.', joke: 'stretch',
    desc: 'Twelve creators, one ring light, a shared Google Doc of hashtags.',
    rumor: 'A rumor says every TikToker on campus is "collabing with Bear Hacks." Eleven of them now are.' },
  { id: 'reelposts', name: 'Content Calendar', branch: 'hype', cost: 4, prereq: 'website', bars: { hype: 8 }, effect: '+1 📱 post bubble per day.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks posts every hour. The social team started posting every hour to keep the rumor true.' },
  { id: 'ugc', name: 'UGC Creators', branch: 'hype', cost: 5, prereq: 'reelposts', bars: { hype: 10 }, effect: '+1 📱 post bubble per day.', joke: 'stretch',
    desc: '"What is an ABG CMO?"',
    rumor: 'A rumor says Bear Hacks pays creators in exposure. Six creators accepted. They were paid in exposure.' },
  { id: 'ericou', name: 'Eric Ou', branch: 'hype', cost: 6, prereq: 'ugc', bars: { hype: 12 }, effect: 'Posts in UC Schools hit 50% harder.', joke: 'stretch',
    desc: '"SoCal Asians flock to me."',
    rumor: 'A rumor says Eric Ou is coming to Bear Hacks. Eric Ou heard the rumor and is coming to Bear Hacks.' },
  { id: 'ricklee', name: 'Rick Lee of Bluely', branch: 'hype', cost: 8, prereq: 'ericou', bars: { hype: 16 }, effect: 'Post viral chance +8%.', joke: 'stretch',
    desc: '"global rank #1 entrepreneur"',
    rumor: 'A rumor says Rick Lee of Bluely cheated his way into Bear Hacks. He would like you to know it was "on purpose."' },
  { id: 'discord', name: 'Discord Server', branch: 'hype', cost: 4, prereq: 'website', bars: { hype: 8, org: 4 }, effect: 'Interested hackers stick around: show rate +3%.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks has a Discord with 10,000 members. It has 12. Then it had 3,000. Rumors work.' },
  { id: 'poker', name: 'Poker Tournament', branch: 'hype', cost: 5, prereq: 'discord', bars: { hype: 8 }, effect: 'Frat Row and Twitter/X hype up; participant mood +3.', joke: 'stretch',
    desc: 'Texas Hold\'em. Texas has not been informed.',
    rumor: 'A rumor says Bear Hacks runs a high-stakes poker night. The stakes are Monster cans. They are very high.' },
  { id: 'hackad', name: 'Advertise at a Hackathon', branch: 'hype', cost: 4, prereq: 'website', bars: { hype: 8 }, effect: '+150 interested hackers (they were already at one).', joke: 'stretch',
    desc: '"Interesting choice."',
    rumor: 'A rumor says Bear Hacks recruits at other hackathons. Someone stood up at Tree Hacks and said "anyway." It worked.' },
  { id: 'travel', name: 'Travel Reimbursement', branch: 'hype', cost: 5, prereq: 'website', bars: { hype: 10 }, effect: 'More aware students become interested (+8%). Confirming a hacker costs $2 more.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks pays for flights. Finance found a loophole. It sort of does now.' },
  { id: 'swag', name: 'Swag Bags', branch: 'hype', cost: 5, prereq: 'travel', bars: { hype: 10 }, effect: 'Show rate +4%, participant mood +4. Confirming a hacker costs $2 more.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks swag includes a hoodie. 2,000 hoodies were ordered in a panic.' },
  { id: 'waitlist', name: 'Waitlist Theater', branch: 'hype', cost: 5, prereq: 'website', bars: { hype: 10 }, effect: 'More aware students become interested (+6%). On Day 6, 5% of interested hackers you haven\'t confirmed get tired of waiting and leave.', joke: 'stretch',
    desc: '"You are #4,812 on the waitlist." There is no list.',
    rumor: 'A rumor says the Bear Hacks waitlist is 10,000 deep. Someone made a waitlist page so it would be.' },
  // ── Organization ──
  { id: 'clubfair', name: 'Club Fair', branch: 'org', cost: 3, bars: { org: 5 }, effect: 'Unlock the Recruiter role.', joke: 'clubfair',
    rumor: 'A rumor says Bear Hacks is "the club to join this year." 40 freshmen showed up at the fair table. Recruiters unlocked.' },
  { id: 'design', name: 'Design Track', branch: 'org', cost: 4, prereq: 'clubfair', bars: { org: 6 }, effect: 'Unlock the Designer role.', joke: 'design',
    rumor: 'A rumor says Bear Hacks has a design track. Two designers believed it and joined. Now it does.' },
  { id: 'logistics', name: 'Logistics Track', branch: 'org', cost: 4, prereq: 'clubfair', bars: { org: 6 }, effect: 'Unlock the Logistics role.', joke: 'logistics',
    rumor: 'A rumor says Bear Hacks has "military-grade logistics." A person with a label maker appeared to make it so.' },
  { id: 'snack', name: 'Snack Bar', branch: 'org', cost: 4, prereq: 'logistics', bars: { org: 8 }, effect: 'Participant mood +8 at the event.', joke: 'snack',
    rumor: 'A rumor started that Bear Hacks has a free pizza party. Now you have to have one. Snack Bar unlocked!' },
  { id: 'reminders', name: 'Reminder Emails', branch: 'org', cost: 5, prereq: 'logistics', bars: { org: 10 }, effect: 'Show rate +5% (more confirmed hackers actually come).', joke: 'stretch',
    desc: 'Subject: "🚨 FINAL reminder (for real this time) (v3)"',
    rumor: 'A rumor says Bear Hacks texts you until you show up. Someone wrote the script. It is relentless.' },
  { id: 'runofshow', name: 'Run of Show', branch: 'org', cost: 4, prereq: 'logistics', bars: { org: 8 }, effect: 'Participant mood +5 at the event.', joke: 'stretch',
    desc: 'A 40-tab spreadsheet. Tab 38 is just "vibes."',
    rumor: 'A rumor says Bear Hacks runs "on a minute-by-minute schedule." Someone made the spreadsheet. It has conditional formatting.' },
  { id: 'coordinator', name: 'Coordinator Track', branch: 'org', cost: 5, prereq: 'clubfair', bars: { org: 6 }, effect: 'Unlock the Coordinator role.', joke: 'coordinator',
    rumor: 'A rumor says Bear Hacks "answers sponsor emails within the hour." A coordinator joined out of professional curiosity.' },
  { id: 'prestige1', name: 'Club Prestige I', branch: 'org', cost: 3, prereq: 'coordinator', bars: { org: 4 }, effect: '5 candidates every morning.', joke: 'prestige',
    rumor: 'A rumor says joining Bear Hacks "looks great on a resume." Five people believed it.' },
  { id: 'prestige2', name: 'Club Prestige II', branch: 'org', cost: 5, prereq: 'prestige1', bars: { org: 6 }, effect: '7 candidates every morning.', joke: 'prestige',
    rumor: 'A rumor says Bear Hacks alumni "all work at FAANG." The applicant line wraps around Sproul.' },
  { id: 'prestige3', name: 'Club Prestige III', branch: 'org', cost: 7, prereq: 'prestige2', bars: { org: 8 }, effect: '9 candidates every morning.', joke: 'prestige',
    rumor: 'A rumor says Bear Hacks has a 2% acceptance rate. It does now. Everyone applied.' },
  { id: 'nepolist', name: 'Nepo List', branch: 'org', cost: 5, prereq: 'prestige3', bars: { org: 10 }, effect: '+2 candidates every morning, and they are better.', joke: 'stretch',
    desc: 'We prefer the term "direct recruitment"...',
    rumor: 'A rumor says Bear Hacks hires "only the best families." Three deans\' kids applied the same afternoon. Nepo List unlocked.' },
  { id: 'resumebook', name: 'Resume Book', branch: 'org', cost: 5, prereq: 'coordinator', bars: { org: 6, talent: 10 }, effect: 'Sponsor mood +5; serious hackers apply to be in it.', joke: 'stretch',
    desc: '400 PDFs named resume_final_FINAL(2).pdf.',
    rumor: 'A rumor says recruiters read the Bear Hacks resume book. One did. He is now everyone\'s favorite person.' },
  { id: 'rep2', name: 'Reputation II', branch: 'org', cost: 6, prereq: 'coordinator', bars: { org: 8 }, effect: 'Reputation cap 150; Golden Bear sponsors.', joke: 'rep2',
    rumor: 'A rumor says Bear Hacks is "basically Ivy League." Golden Bear sponsors started calling.' },
  { id: 'rep3', name: 'Reputation III', branch: 'org', cost: 9, prereq: 'rep2', bars: { org: 10 }, effect: 'Reputation cap 200.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks "invented hackathons." Wikipedia was edited. Nobody has fixed it.' },
  { id: 'training2', name: 'Training II', branch: 'org', cost: 5, prereq: 'clubfair', bars: { org: 12 }, effect: 'Crew skill ×1.5.', joke: 'training1',
    rumor: 'A rumor says the Bear Hacks crew are "cracked." The crew heard and started a study group. They are cracked now.' },
  { id: 'training3', name: 'Training III', branch: 'org', cost: 8, prereq: 'training2', bars: { org: 14 }, effect: 'Crew skill ×1.7.', joke: 'training2',
    rumor: 'A rumor says the Bear Hacks crew have "never slept." They have stopped sleeping. Output is up.' },
  // ── Talent ──
  { id: 'applications', name: 'Application Portal', branch: 'talent', cost: 3, bars: { talent: 8 }, effect: 'More aware students apply (+6% interest).', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks applications take "30 seconds." Someone rebuilt the form so they do.' },
  { id: 'highsignal', name: 'It\'s "High Signal" bro', branch: 'talent', cost: 5, prereq: 'applications', bars: { talent: 14 }, effect: 'Project quality +6.', joke: 'stretch',
    desc: 'Every applicant must describe themselves as "cracked" in under 280 characters.',
    rumor: 'A rumor says Bear Hacks is "high signal." Nobody knows what that means. Every cracked sophomore applied anyway.' },
  { id: 'leetcode', name: 'LeetCode Gate', branch: 'talent', cost: 6, prereq: 'highsignal', bars: { talent: 14 }, effect: 'Project quality +6, but 8% less interest.', joke: 'stretch',
    desc: 'Invert a binary tree to get your wristband.',
    rumor: 'A rumor says the Bear Hacks door has a coding interview. Someone installed a keypad. It asks for two-sum.' },
  { id: 'mentors', name: 'Mentor Program', branch: 'talent', cost: 6, prereq: 'applications', bars: { talent: 12 }, effect: 'Project quality +8 at the event.', joke: 'stretch',
    desc: 'Senior engineers, free coffee, and one guy who only says "have you tried caching it?"',
    rumor: 'A rumor says Bear Hacks mentors are "ex-FAANG." Two alumni heard and volunteered. One was an intern. Close enough.' },
  { id: 'workshops', name: 'Beginner Workshops', branch: 'talent', cost: 4, prereq: 'mentors', bars: { talent: 8 }, effect: 'Project quality +3, participant mood +4.', joke: 'stretch',
    desc: 'Intro to React, taught by someone who learned it Tuesday.',
    rumor: 'A rumor says Bear Hacks teaches "Git in 10 minutes." It took 90. Everyone left with a merge conflict and a friend.' },
  { id: 'olympiad', name: 'Olympiad Outreach', branch: 'talent', cost: 5, prereq: 'applications', bars: { talent: 10 }, effect: 'High Schools hype up; project quality +4.', joke: 'stretch',
    desc: 'Seventeen-year-olds with three papers and no driver\'s license.',
    rumor: 'A rumor says a 15-year-old IMO medalist is coming to Bear Hacks. Her mom is driving her.' },
  { id: 'aicredits', name: 'AI Credits', branch: 'talent', cost: 5, prereq: 'applications', bars: { talent: 6, hype: 4 }, effect: 'Free credits for every hacker. Attracts… business majors.', joke: 'stretch',
    rumor: 'A rumor says Bear Hacks gives out unlimited AI credits. Finance found some. "Unlimited" is doing a lot of work.' },
  { id: 'hwlab', name: 'Hardware Lab', branch: 'talent', cost: 6, prereq: 'mentors', bars: { talent: 10 }, effect: 'Artistic value +8, project quality +4; Arts Majors get +1 skill.', joke: 'stretch',
    desc: 'Forty Arduinos, one soldering iron, zero fire extinguishers.',
    rumor: 'A rumor says Bear Hacks has a hardware lab. Someone found a box of Arduinos in a closet. It does now.' },
  { id: 'mixer', name: 'Team Matching Mixer', branch: 'talent', cost: 5, prereq: 'workshops', bars: { talent: 8, org: 2 }, effect: 'Participant mood +4, project quality +3.', joke: 'stretch',
    desc: 'Icebreaker: "What\'s your stack, and why is it wrong?"',
    rumor: 'A rumor says Bear Hacks matches teams by vibe. Someone built the matching form. It asks for your star sign and your linter.' },
];

export const TECH_BY_ID = Object.fromEntries(TECH.map((t) => [t.id, t])) as Record<TechId, TechNode>;
