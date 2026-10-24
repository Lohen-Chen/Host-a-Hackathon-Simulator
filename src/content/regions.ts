import type { RegionId, RegionNode } from '../core/types';

// Plague Inc-style world: eight populations that hype spreads between (10,000 hackers total).
// Coordinates are in a 360×300 map viewBox, laid out like a stylized US map.
export const REGIONS: Omit<RegionNode, 'bear' | 'tree' | 'signups' | 'treeSignups'>[] = [
  { id: 'uc', name: 'UC Schools', pop: 1800, conv: 1.1, x: 48, y: 150, neighbors: ['highschools', 'frat', 'intl', 'twitter', 'b1g'] },
  { id: 'highschools', name: 'Local High Schools', pop: 800, conv: 0.8, x: 112, y: 92, neighbors: ['uc', 'twitter', 'b1g'] },
  { id: 'twitter', name: 'Twitter/X', pop: 900, conv: 0.7, x: 190, y: 32, neighbors: ['uc', 'highschools', 'b1g', 'intl', 'acc'] },
  { id: 'frat', name: 'Frat Row', pop: 600, conv: 0.6, x: 122, y: 196, neighbors: ['uc', 'sec', 'b1g'] },
  { id: 'b1g', name: 'B1G Schools', pop: 1900, conv: 1.0, x: 214, y: 110, neighbors: ['highschools', 'twitter', 'frat', 'sec', 'acc', 'uc'] },
  { id: 'sec', name: 'SEC Schools', pop: 1300, conv: 0.8, x: 214, y: 222, neighbors: ['frat', 'b1g', 'acc'] },
  { id: 'acc', name: 'ACC Schools', pop: 1500, conv: 1.0, x: 312, y: 158, neighbors: ['b1g', 'sec', 'twitter', 'intl'] },
  { id: 'intl', name: 'International Students', pop: 1200, conv: 1.2, x: 60, y: 262, neighbors: ['uc', 'twitter', 'acc'] },
];

export const TOTAL_POP = REGIONS.reduce((a, r) => a + r.pop, 0);

export const REGION_BLURB: Record<RegionId, string> = {
  uc: 'Home turf. Bears everywhere.',
  highschools: 'Young hackers. Wholesome. Parents drive.',
  twitter: 'Viral hub, low conversion. Ratios happen here.',
  frat: 'Loves parties. Leaves LinkedIn posts on read.',
  b1g: 'Huge and loud. Whatever Purdue and IU do echoes here.',
  sec: 'Loves tailgates more than terminals.',
  acc: "Tree's home conference now. Don't ask how.",
  intl: 'Highest conversion. Will fly 14 hours for free pizza.',
};

/** Edges are made symmetric at init, so each list only needs one side. */
export function symmetricNeighbors(): Record<RegionId, RegionId[]> {
  const map = {} as Record<RegionId, Set<RegionId>>;
  for (const r of REGIONS) map[r.id] = new Set(r.neighbors);
  for (const r of REGIONS) for (const n of r.neighbors) map[n].add(r.id);
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]])) as Record<RegionId, RegionId[]>;
}

/** Bear starts at home in the UC system; Tree starts in the ACC. */
export const INITIAL_AWARENESS: Record<RegionId, { bear: number; tree: number }> = {
  uc: { bear: 0.18, tree: 0.04 },
  highschools: { bear: 0.04, tree: 0.02 },
  twitter: { bear: 0.03, tree: 0.06 },
  frat: { bear: 0.03, tree: 0.02 },
  b1g: { bear: 0.01, tree: 0.04 },
  sec: { bear: 0.0, tree: 0.04 },
  acc: { bear: 0.0, tree: 0.2 },
  intl: { bear: 0.01, tree: 0.05 },
};
