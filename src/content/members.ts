import type { Role, Task, TraitId } from '../core/types';

export const ROLE_INFO: Record<Role, { name: string; icon: string; task: Task; blurb: string }> = {
  organizer: { name: 'Organizer', icon: '📋', task: 'research', blurb: 'Generates Tech Points on Research.' },
  social: { name: 'Social Media', icon: '📱', task: 'social', blurb: 'More 📱 post bubbles, more virality.' },
  recruiter: { name: 'Recruiter', icon: '🤝', task: 'recruit', blurb: 'Bigger, better candidate pools.' },
  designer: { name: 'Designer', icon: '🎨', task: 'website', blurb: 'Builds the website and venue ambience.' },
  logistics: { name: 'Logistics', icon: '📦', task: 'venue', blurb: 'Venue operations. Fewer disasters.' },
  coordinator: { name: 'Coordinator', icon: '💼', task: 'sponsors', blurb: 'Lands more (and better) sponsors.' },
};

export const TASK_INFO: Record<Task, { name: string; icon: string; blurb: string }> = {
  research: { name: 'Research', icon: '🔬', blurb: 'Tech Points. Organizers are best at it.' },
  social: { name: 'Social', icon: '📣', blurb: '+1 📱 post bubble a day per Social Media member, virality up.' },
  website: { name: 'Website', icon: '🌐', blurb: 'Website score (needs the Website node).' },
  venue: { name: 'Venue', icon: '🏟️', blurb: 'Before the Day 4 auction: scout it. After: venue prep.' },
  sponsors: { name: 'Sponsors', icon: '💼', blurb: 'Raises sponsor invite chance and quality.' },
  recruit: { name: 'Recruit', icon: '🎯', blurb: "Bigger, better candidate pool tomorrow." },
};

/** Which roles count as a match for a task (venue prep takes Designers or Logistics). */
export const TASK_ROLES: Record<Task, Role[]> = {
  research: ['organizer'],
  social: ['social'],
  website: ['designer'],
  venue: ['logistics', 'designer'],
  sponsors: ['coordinator'],
  recruit: ['recruiter'],
};

export const MISMATCH_TOOLTIPS = [
  'Role mismatch (×0.3). They are trying their best. Their best is 30%.',
  'Role mismatch (×0.3). Like asking a cat to do your taxes.',
  'Role mismatch (×0.3). They googled "how to do this job" and closed the tab.',
];

export const TRAITS: Record<TraitId, { name: string; desc: string; joke: string }> = {
  caffeinated: { name: 'Caffeinated', desc: '+2 skill early in the day, −1 later.', joke: 'Vibrates at a frequency only dogs can hear.' },
  mole: { name: 'Ex-Tree Mole', desc: "Reveals Tree's next move. 10% chance a day to leak yours.", joke: 'Still has a Tree U lanyard "for nostalgia."' },
  rust10: { name: 'Claims 10 Years of Rust Experience', desc: 'Random ±3 skill each day.', joke: 'Rust is 11 years old. They started in the womb.' },
  nepo: { name: 'Nepo Baby', desc: '+3 reputation on hire. Skill is a coin flip.', joke: 'Their parent "knows a guy" at every company.' },
  linkedin: { name: 'LinkedIn Lunatic', desc: '+post power, but more cringe flops.', joke: 'Agree? 👇' },
  trenchcoat: { name: 'Three Interns in a Trench Coat', desc: 'Random task counts as their specialty each day.', joke: 'Payroll is confused. So is the trench coat.' },
  survivor: { name: 'Group Project Survivor', desc: '+2 skill on Venue (logistics).', joke: 'Has carried four group projects on their back.' },
  pivoted: { name: 'Pivoted Four Times', desc: 'Reassignment is free (no ramp-up).', joke: 'Currently pivoting. Ask again in 5 minutes.' },
  veteran: { name: 'Hackathon Veteran (47 hackathons, 0 shipped)', desc: '+mood on hackathon day.', joke: 'Owns 47 hoodies. Wears them all at once in winter.' },
  replyguy: { name: 'Reply Guy', desc: '+50% clapback power.', joke: '"Actually," he began, for the 9,000th time.' },
  sleeper: { name: 'Sleeps Under Desk', desc: '−20% output in the morning.', joke: 'Their desk has a pillow and a mailing address.' },
  arts: { name: 'Arts Major', desc: '+2 on Website/Venue; half output on Research.', joke: "Can't use a calculator. Can make one look amazing." },
  grass: { name: 'Has Touched Grass', desc: '+2 mood on hackathon day; steady output.', joke: 'Goes outside. Voluntarily. Weird flex.' },
  memer: { name: 'Speaks Only in Memes', desc: '+virality on Social; LinkedIn posts flop harder.', joke: 'Communicates exclusively in reaction images.' },
};
