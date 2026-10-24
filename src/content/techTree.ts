import type { TechId } from '../core/types';

export interface TechNode {
  id: TechId;
  name: string;
  branch: 'Organization' | 'Advertisement' | 'Talent';
  cost: number;
  prereq?: TechId;
  effect: string;
  /** joke category key in jokes.txt (techjoke|<key>) */
  joke: string;
  mvp: boolean;
}

// Section 6.2. Only `mvp: true` nodes are shown and buyable; the rest stay as data.
export const TECH: TechNode[] = [
  { id: 'clubfair', name: 'Club Fair', branch: 'Organization', cost: 3, effect: 'Unlock the Recruiter role.', joke: 'clubfair', mvp: true },
  { id: 'design', name: 'Design Track', branch: 'Organization', cost: 4, effect: 'Unlock the Designer role.', joke: 'design', mvp: true },
  { id: 'logistics', name: 'Logistics Track', branch: 'Organization', cost: 4, effect: 'Unlock the Logistics role.', joke: 'logistics', mvp: true },
  { id: 'coordinator', name: 'Coordinator Track', branch: 'Organization', cost: 5, effect: 'Unlock the Coordinator role.', joke: 'coordinator', mvp: true },
  { id: 'training2', name: 'Training II', branch: 'Organization', cost: 5, effect: 'Crew skill ×1.5.', joke: 'training1', mvp: true },
  { id: 'training3', name: 'Training III', branch: 'Organization', cost: 8, prereq: 'training2', effect: 'Crew skill ×1.7.', joke: 'training2', mvp: false },
  { id: 'prestige2', name: 'Club Prestige II', branch: 'Organization', cost: 6, effect: '7 candidates every morning.', joke: 'prestige', mvp: true },
  { id: 'prestige3', name: 'Club Prestige III', branch: 'Organization', cost: 9, prereq: 'prestige2', effect: '12 candidates every morning.', joke: 'prestige', mvp: false },
  { id: 'website', name: 'Website', branch: 'Advertisement', cost: 4, effect: 'Website task + live preview; slower hype decay; Hype Reel & Countdown cards.', joke: 'website', mvp: true },
  { id: 'promo', name: 'Promo Video', branch: 'Advertisement', cost: 6, prereq: 'website', effect: '+15% conversion; Influencer Collab card.', joke: 'promo', mvp: true },
  { id: 'reelposts', name: 'Hype Reel Posts', branch: 'Advertisement', cost: 3, effect: '+1 post charge cap.', joke: 'stretch', mvp: false },
  { id: 'rolodex', name: 'Influencer Rolodex', branch: 'Advertisement', cost: 5, effect: 'Influencer card without Promo Video.', joke: 'stretch', mvp: false },
  { id: 'billboard', name: 'Billboard', branch: 'Advertisement', cost: 8, prereq: 'promo', effect: '+25% conversion; rep +10.', joke: 'stretch', mvp: false },
  { id: 'snack', name: 'Snack Bar', branch: 'Talent', cost: 4, effect: 'Participant mood +8 at the event.', joke: 'snack', mvp: true },
  { id: 'rep2', name: 'Reputation II', branch: 'Talent', cost: 6, effect: 'Reputation cap 150; Golden Bear sponsors.', joke: 'rep2', mvp: true },
  { id: 'rep3', name: 'Reputation III', branch: 'Talent', cost: 9, prereq: 'rep2', effect: 'Reputation cap 200.', joke: 'stretch', mvp: false },
  { id: 'applications', name: 'Applications', branch: 'Talent', cost: 3, effect: 'Hackers ×0.85, project quality +12%.', joke: 'stretch', mvp: false },
  { id: 'nepolist', name: 'Nepo List', branch: 'Talent', cost: 5, effect: 'Pick from 5 high-stat quirky recruits daily.', joke: 'stretch', mvp: false },
  { id: 'travel', name: 'Travel Reimbursement', branch: 'Talent', cost: 6, effect: 'Show rate +8%, $10 per attendee.', joke: 'stretch', mvp: false },
];

export const TECH_BY_ID = Object.fromEntries(TECH.map((t) => [t.id, t])) as Record<TechId, TechNode>;
