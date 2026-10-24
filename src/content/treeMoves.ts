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

// Scripted storyline (Section 6.10), now on four days so popups stay rare. Times are picked per run.
export const TREE_MOVES: TreeMoveDef[] = [
  { id: 'puppy', day: 1, name: 'Puppy Campaign', text: 'Tree University is handing out puppy photos at every high school in the state. Devastatingly effective.', targets: ['highschools', 'uc'], impulse: 0.2, treeHype: 4 },
  { id: 'poach', day: 2, name: 'Sponsor Poaching', text: '{rivalceo} is "taking calls" with your sponsors. On a boat.', targets: ['acc', 'b1g'], impulse: 0.12, treeHype: 4 },
  { id: 'keynote', day: 4, name: 'Billionaire Keynote', text: 'Tree booked a keynote from a billionaire who tweets at 3 AM. Everyone is talking about it.', targets: ['twitter', 'uc', 'b1g', 'sec', 'acc', 'intl', 'highschools', 'frat'], impulse: 0.1, treeHype: 10, global: true },
  { id: 'surge', day: 6, name: 'Final Surge', text: '{rivalceo} is livestreaming "the final push." He is still on his phone.', targets: ['twitter', 'sec', 'intl'], impulse: 0.22, treeHype: 8 },
];

export const TREE_CATCHUP: TreeMoveDef = {
  id: 'catchup', day: 0, name: 'Catch-Up Blitz', text: 'Tree University is panicking and has hired {number} interns to post memes.', targets: ['twitter', 'uc'], impulse: 0.2, treeHype: 5,
};
