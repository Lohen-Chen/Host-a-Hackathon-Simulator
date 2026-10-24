import type { RegionId, RegionNode } from '../core/types';

// Coordinates are in a 360×300 map viewBox (Section 6.3).
export const REGIONS: Omit<RegionNode, 'bear' | 'tree' | 'signups' | 'treeSignups'>[] = [
  { id: 'dorms', name: 'Dorms', pop: 200, conv: 1.0, x: 70, y: 70, neighbors: ['sproul', 'frat', 'twitter'] },
  { id: 'frat', name: 'Frat Row', pop: 140, conv: 0.9, x: 52, y: 178, neighbors: ['dorms', 'sproul'] },
  { id: 'quad', name: 'Engineering Quad', pop: 240, conv: 1.2, x: 268, y: 150, neighbors: ['sproul', 'twitter', 'career'] },
  { id: 'sproul', name: 'Sproul Plaza', pop: 160, conv: 1.0, x: 160, y: 152, neighbors: ['dorms', 'frat', 'quad', 'treeu'] },
  { id: 'twitter', name: 'Twitter/X', pop: 180, conv: 1.0, x: 196, y: 50, neighbors: ['dorms', 'quad', 'highschools'] },
  { id: 'career', name: 'Career Center', pop: 90, conv: 0.7, x: 310, y: 246, neighbors: ['quad', 'twitter'] },
  { id: 'highschools', name: 'Local High Schools', pop: 90, conv: 0.8, x: 318, y: 52, neighbors: ['twitter', 'sproul'] },
  { id: 'treeu', name: 'Tree University', pop: 100, conv: 0.6, x: 150, y: 256, neighbors: ['sproul'] },
];

export const REGION_BLURB: Record<RegionId, string> = {
  dorms: 'Loves memes and free food.',
  frat: 'Loves parties. Leaves LinkedIn posts on read.',
  quad: 'Highest conversion. Smells like solder.',
  sproul: 'The hub. Flyers and clapbacks.',
  twitter: 'Viral hub. Ratios happen here.',
  career: 'LinkedIn posts. Sponsors lurk.',
  highschools: 'Young hackers. Wholesome.',
  treeu: "Tree's home turf. Conquering it is a flex.",
};

// High Schools connects to Sproul in the spec but Sproul's list omits it; edges are made symmetric at init.
export function symmetricNeighbors(): Record<RegionId, RegionId[]> {
  const map = {} as Record<RegionId, Set<RegionId>>;
  for (const r of REGIONS) map[r.id] = new Set(r.neighbors);
  for (const r of REGIONS) for (const n of r.neighbors) map[n].add(r.id);
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]])) as Record<RegionId, RegionId[]>;
}

export const INITIAL_AWARENESS: Record<RegionId, { bear: number; tree: number }> = {
  dorms: { bear: 0.08, tree: 0.05 },
  frat: { bear: 0.04, tree: 0.04 },
  quad: { bear: 0.06, tree: 0.08 },
  sproul: { bear: 0.15, tree: 0.06 },
  twitter: { bear: 0.03, tree: 0.08 },
  career: { bear: 0.02, tree: 0.08 },
  highschools: { bear: 0.02, tree: 0.04 },
  treeu: { bear: 0.0, tree: 0.9 },
};
