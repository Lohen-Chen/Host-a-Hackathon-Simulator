// Tunable constants. Everything marked [TUNE] in the spec lives here so the
// balance simulator (scripts/sim.ts) and docs/balance.md have one place to point at.
import type { Mode } from './types';

export const STEPS_PER_DAY = 20;
export const DAYS = 7;
export const TITLE = 'Host a Hackathon Simulator';
export const OBJECTIVE = 'Get more hackers than Tree University.';

export interface ModeConfig { daySec: number; bubbles: number; alerts: number; tickerSec: number; auctionSec: number; label: string }
export const MODES: Record<Mode, ModeConfig> = {
  judge: { daySec: 30, bubbles: 5, alerts: 1, tickerSec: 4, auctionSec: 7, label: 'Judge (~5 min)' },
  standard: { daySec: 60, bubbles: 10, alerts: 2, tickerSec: 5, auctionSec: 10, label: 'Standard (~10 min)' },
  full: { daySec: 120, bubbles: 20, alerts: 4, tickerSec: 6, auctionSec: 10, label: 'Full (~17 min)' },
};

export const T = {
  startBudget: 20000,
  startRep: 10,
  hireCost: 300,
  rosterCap: 8,
  // Tech points
  baseTpPerDay: 2,
  researchRate: 0.55, // organizer TP/day per effective skill point
  nonOrganizerResearch: 0.5, // TP/day for a non-organizer on research
  endDayBonusTp: 1,
  // Hype map
  spread: 0.02,
  decay: 0.006,
  treeSpread: 0.02,
  treeDecay: 0.004,
  treeControlPenalty: 0.6,
  signupLerp: 0.25,
  promoBonus: 0.15,
  /** Tree's own ambient posting: impulses per day, scaled by treeHype/50 */
  treePostsPerDay: 3,
  treePostPower: 0.11,
  treeHypeStart: 45,
  treeHypeDaily: 1.5,
  // Posts
  spillFactor: 0.5,
  // Bubbles
  bubbleTtl: 6,
  maxBubbles: 4,
  minGap: 3,
  // Alerts
  alertSeconds: 9,
  // Tree moves
  treeWindow: 6,
  counterCost: 500,
  rubberBand: 200,
  // Sponsors
  inviteBase: 0.3,
  invitePerCoord: 0.03,
  inviteCap: 0.8,
  equityCap: 28,
  // Event day
  foodPerAttendee: 12,
  showRateBase: 0.62,
};

export const RESEARCH_TASKS = ['research', 'social', 'website', 'venue', 'sponsors', 'recruit'] as const;
