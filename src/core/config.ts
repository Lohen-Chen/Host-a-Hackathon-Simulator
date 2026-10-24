// Tunable constants. Everything marked [TUNE] in the spec lives here so the
// balance simulator (scripts/sim.ts) and docs/balance.md have one place to point at.
import type { Mode } from './types';

export const STEPS_PER_DAY = 20;
export const DAYS = 7;
export const TITLE = 'Host a Hackathon Simulator';
export const OBJECTIVE = 'Get more hackers than Tree University.';

export interface ModeConfig { daySec: number; bubbles: number; alerts: number; tickerSec: number; auctionSec: number; label: string;
  /** Tree's ambient posting multiplier: shorter days give the player fewer bubbles to fight back with. */
  treePower: number;
  /** pausing popups per day before optional news is demoted to the ticker */
  popupsPerDay: number }
export const MODES: Record<Mode, ModeConfig> = {
  judge: { daySec: 30, bubbles: 6, alerts: 1, tickerSec: 4, auctionSec: 7, label: 'Judge (~5 min)', treePower: 0.8, popupsPerDay: 2 },
  standard: { daySec: 60, bubbles: 10, alerts: 1, tickerSec: 5, auctionSec: 10, label: '~10 min', treePower: 1, popupsPerDay: 2 },
  full: { daySec: 120, bubbles: 20, alerts: 2, tickerSec: 6, auctionSec: 10, label: 'Full (~17 min)', treePower: 1.2, popupsPerDay: 3 },
};

export const T = {
  startBudget: 20000,
  startRep: 10,
  hireCost: 300,
  hireStep: 150, // each hire beyond hireFree members costs this much more
  hireFree: 4,
  burnoutFree: 3, // crews this size or smaller never burn out
  burnoutPerMember: 0.07,
  burnoutMax: 0.6,
  // Tech points
  baseTpPerDay: 2,
  researchRate: 0.55, // organizer TP/day per effective skill point
  nonOrganizerResearch: 0.5, // TP/day for a non-organizer on research
  endDayBonusTp: 1,
  // Hype map
  spread: 0.02,
  decay: 0.03, // proportional: share of awareness lost per step
  treeSpread: 0.02,
  treeDecay: 0.02,
  treeControlPenalty: 0.6,
  signupLerp: 0.25,
  /** Tree's own ambient posting: impulses per day, scaled by treeHype/50 */
  treePostsPerDay: 4.25,
  treePostPower: 0.11,
  treeHypeStart: 45,
  treeHypeDaily: 1.5,
  // Posts
  spillFactor: 0.5,
  // Bubbles
  bubbleTtl: 6,
  maxBubbles: 4,
  minGap: 3,
  // Tree moves
  rubberBand: 1600,
  /** Tree moves land at this strength once the Clapback Team node is owned */
  clapbackMult: 0.6,
  // Rumors (Plague Inc mutations): free random nodes per run, scheduled like world news
  maxRumors: 2,
  // Sponsors
  inviteBase: 0.2,
  invitePerCoord: 0.02,
  balantirDay: 4,
  inviteCap: 0.8,
  equityCap: 28,
  // Confirming hackers: money turns interest into committed attendees (food, swag, travel)
  confirmBatch: 250,
  confirmCost: 14,
  confirmCostMin: 9,
  /** share of interested-but-unconfirmed hackers who show up anyway */
  walkInRate: 0.1,
  // Event day
  showRateBase: 0.8,
  /** attendees needed for a full Attendance score */
  attendanceFull: 4000,
  /** Tree's off-map campus hackers: base + per point of Tree hype */
  treeBase: 900,
  treeBasePerHype: 12,
  /** interest effects in alerts are written at the old 1,200-hacker scale */
  signupScale: 8,
};

export const RESEARCH_TASKS = ['research', 'social', 'website', 'venue', 'sponsors', 'recruit'] as const;
