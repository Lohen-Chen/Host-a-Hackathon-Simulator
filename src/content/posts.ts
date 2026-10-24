import type { PostId, RegionId, TechId } from '../core/types';

export interface PostCard {
  id: PostId;
  name: string;
  icon: string;
  unlock: TechId | null;
  power: number;
  viralBase: number;
  risk: number;
  cost: number;
  favored: RegionId[] | 'all';
  party?: boolean;
  /** spills at full strength to every neighbor */
  fullSpill?: boolean;
  blurb: string;
}

// Section 7.2
export const POSTS: PostCard[] = [
  { id: 'flyer', name: 'Wholesome Flyer', icon: '📄', unlock: null, power: 0.15, viralBase: 0.02, risk: 0, cost: 0, favored: ['uc', 'highschools'], blurb: 'Comic Sans. Tear-off tabs. Pure of heart.' },
  { id: 'meme_bear', name: 'Bear vs. Tree Meme', icon: '🐻', unlock: null, power: 0.22, viralBase: 0.1, risk: 0.05, cost: 0, favored: ['twitter', 'frat', 'uc'], blurb: 'Bear with sunglasses. Tree crying. Classic.' },
  { id: 'linkedin', name: '"Humbled to Announce" LinkedIn Post', icon: '💼', unlock: null, power: 0.12, viralBase: 0.04, risk: 0.02, cost: 0, favored: ['intl', 'b1g'], blurb: 'Raises sponsor invite chance today.' },
  { id: 'dance', name: 'Club President Dances', icon: '🕺', unlock: null, power: 0.2, viralBase: 0.18, risk: 0.25, cost: 0, favored: ['frat', 'sec'], party: true, blurb: 'High risk. Higher hips.' },
  { id: 'pizza', name: 'Free Pizza Giveaway Thread', icon: '🍕', unlock: null, power: 0.28, viralBase: 0.08, risk: 0, cost: 400, favored: ['intl', 'sec'], party: true, blurb: 'The oldest trick. Still works.' },
  { id: 'reel', name: 'Hype Reel', icon: '🎬', unlock: 'website', power: 0.35, viralBase: 0.14, risk: 0.08, cost: 200, favored: ['twitter', 'highschools', 'b1g'], blurb: 'Drone shots of a parking lot. Epic music.' },
  { id: 'influencer', name: 'Influencer Collab', icon: '🤳', unlock: 'promo', power: 0.6, viralBase: 0.2, risk: 0.2, cost: 1000, favored: ['twitter', 'sec', 'acc'], blurb: 'They have 2M followers and one ring light.' },
  { id: 'clapback', name: 'Clapback at Tree U', icon: '🔥', unlock: null, power: 0.15, viralBase: 0.1, risk: 0.15, cost: 0, favored: ['acc', 'twitter'], blurb: 'On a non-flop: −5 Tree hype.' },
  { id: 'countdown', name: '"It\'s Happening" Countdown', icon: '⏳', unlock: 'website', power: 0.25, viralBase: 0.1, risk: 0.05, cost: 0, favored: 'all', fullSpill: true, blurb: 'Spills to every neighbor at full strength.' },
  { id: 'dog', name: 'Photo of the Club Dog', icon: '🐕', unlock: null, power: 0.25, viralBase: 0.12, risk: 0, cost: 0, favored: ['uc', 'highschools'], blurb: 'You do not have a club dog.' },
];

export const POST_BY_ID = Object.fromEntries(POSTS.map((p) => [p.id, p])) as Record<PostId, PostCard>;

export const TIER_MULT = { flop: 0.2, meh: 0.7, solid: 1, viral: 4, mega: 12, ratio: 0.5 } as const;
export const TIER_LABEL = { flop: 'FLOP', meh: 'MEH', solid: 'SOLID', viral: 'VIRAL!', mega: 'MEGA-VIRAL!!', ratio: "RATIO'D" } as const;
