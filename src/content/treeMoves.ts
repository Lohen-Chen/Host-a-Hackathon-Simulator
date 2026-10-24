import type { RegionId } from '../core/types';

export interface TreeMoveDef {
  id: string;
  day: number;
  name: string;
  text: string;
  targets: RegionId[];
  impulse: number;
  treeHype: number;
  global?: boolean;
}

// Scripted daily storyline (Section 6.10). Times are picked per run by the scheduler.
export const TREE_MOVES: TreeMoveDef[] = [
  { id: 'puppy', day: 1, name: 'Puppy Campaign', text: 'Tree University is handing out puppy photos in the Dorms. Devastatingly effective.', targets: ['dorms', 'sproul'], impulse: 0.2, treeHype: 4 },
  { id: 'poach', day: 2, name: 'Sponsor Poaching', text: '{rivalceo} is "taking calls" with your sponsors. On a boat.', targets: ['career', 'quad'], impulse: 0.12, treeHype: 4 },
  { id: 'aggro', day: 3, name: 'Auction Aggression', text: 'Tree Hacks raised its venue budget. {rivalceo}: "We don\'t lose. We pivot."', targets: ['quad', 'sproul'], impulse: 0.12, treeHype: 3 },
  { id: 'keynote', day: 4, name: 'Billionaire Keynote', text: 'Tree booked a keynote from a billionaire who tweets at 3 AM. Everyone is talking about it.', targets: ['twitter', 'quad', 'dorms', 'sproul', 'career', 'highschools', 'frat'], impulse: 0.1, treeHype: 10, global: true },
  { id: 'rumor', day: 5, name: 'Rumor Campaign', text: 'Tree is spreading a rumor: "Bear U\'s hackathon is canceled." It is not canceled.', targets: ['twitter', 'highschools'], impulse: 0.22, treeHype: 4 },
  { id: 'countdown', day: 6, name: 'Countdown Spike', text: 'Tree launched a countdown clock. It is very large. It has a soundtrack.', targets: ['quad', 'dorms', 'twitter'], impulse: 0.16, treeHype: 8 },
  { id: 'surge', day: 7, name: 'Final Surge', text: '{rivalceo} is livestreaming "the final push." He is still on his phone.', targets: ['sproul', 'dorms', 'quad'], impulse: 0.22, treeHype: 8 },
];

export const TREE_CATCHUP: TreeMoveDef = {
  id: 'catchup', day: 0, name: 'Catch-Up Blitz', text: 'Tree University is panicking and has hired {number} interns to post memes.', targets: ['dorms', 'twitter'], impulse: 0.2, treeHype: 5,
};
