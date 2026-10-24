import type { BidderId, VenueId } from '../core/types';

export interface VenueDef { id: VenueId; name: string; cap: number; price: number; ambience: number; joke: string }

// Section 6.9
export const VENUES: VenueDef[] = [
  { id: 'lawn', name: 'The Lawn', cap: 250, price: 0, ambience: 1, joke: "Sprinklers run at 3 AM. It's a feature." },
  { id: 'soda', name: 'Basement of Soda Hall', cap: 400, price: 2000, ambience: 2, joke: 'Smells like 12 years of cold pizza.' },
  { id: 'parking', name: 'A Very Large Parking Structure', cap: 700, price: 4500, ambience: 3, joke: 'Hackers sleep in their cars (they would anyway).' },
  { id: 'stadium', name: 'Memorial Stadium (Seismic Retrofit Pending)', cap: 1500, price: 12000, ambience: 5, joke: "Technically safe if you don't cheer." },
  { id: 'palace', name: 'The Palace of Fine Pastries', cap: 1000, price: 15000, ambience: 9, joke: 'Dome, pillars, free croissants. Insufferably beautiful.' },
];
export const VENUE_BY_ID = Object.fromEntries(VENUES.map((v) => [v.id, v])) as Record<VenueId, VenueDef>;

/** Tree's fallback if it loses every lot. */
export const TREE_BACKUP = { name: 'Tree U Gymnasium', cap: 600, ambience: 4 };

export interface BidderDef {
  id: BidderId;
  name: string;
  icon: string;
  blurb: string;
  /** fold threshold as a multiple of the venue's price anchor: [min, max], per venue override */
  fold: [number, number];
  venueBias?: Partial<Record<VenueId, number>>;
}

export const BIDDERS: BidderDef[] = [
  { id: 'tree', name: 'Tree Hacks', icon: '🌲', blurb: 'Deep pockets. Folds late. Trash-talks.', fold: [1.15, 1.6] },
  { id: 'furcon', name: 'Bay Area FurCon', icon: '🦊', blurb: 'Bids on "vibes." Wants big halls.', fold: [0.7, 1.1], venueBias: { stadium: 0.45, palace: 0.3, soda: -0.2 } },
  { id: 'spreadsheet', name: 'Competitive Spreadsheet Club', icon: '📊', blurb: 'Has modeled this. Has a pivot table.', fold: [0.8, 1.15] },
  { id: 'tammy', name: 'A Wedding Planner Named Tammy', icon: '💐', blurb: 'Surprisingly ruthless.', fold: [0.95, 1.5], venueBias: { palace: 0.35, parking: -0.3 } },
];
export const BIDDER_BY_ID = Object.fromEntries(BIDDERS.map((b) => [b.id, b])) as Record<BidderId, BidderDef>;
