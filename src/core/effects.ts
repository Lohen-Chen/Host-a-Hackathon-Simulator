// Declarative effects used by alerts, bubbles and Tree moves.
import type { GameState, RegionId } from './types';

export interface Effects {
  budget?: number;
  rep?: number;
  signups?: number;
  mood?: number;
  tp?: number;
  treeHype?: number;
  website?: number;
  quality?: number;
  sponsorMood?: number;
  inviteBonus?: number;
  outputMult?: number;
  impulse?: { target: RegionId | 'ctx' | 'random' | 'all'; amount: number; party?: boolean };
  treeImpulse?: { target: RegionId | 'ctx' | 'random' | 'all'; amount: number };
  flags?: Record<string, number | boolean | string>;
  flagAdd?: Record<string, number>;
  memberIdleSteps?: number;
  memberBenchDays?: number;
  memberSkill?: number;
  allIdleSteps?: number;
  siteDown?: number;
}

export interface Outcome extends Effects { text: string }

export interface ChoiceDef {
  label: string;
  /** budget cost, shown on the button; also checked for affordability */
  cost?: number;
  hint?: string;
  requires?: (s: GameState) => boolean;
  out?: Outcome;
  odds?: { p: number; win: Outcome; lose: Outcome };
  /** custom logic; may return outcome text that replaces `out.text` */
  run?: (s: GameState, ctx: { memberId?: number; regionId?: RegionId; sponsorId?: string }) => string | void;
}

export interface AlertDef {
  id: string;
  title: string | ((s: GameState) => string);
  body: string | ((s: GameState) => string);
  weight: number | ((s: GameState) => number);
  when?: (s: GameState) => boolean;
  once?: boolean;
  /** max appearances per run (default 1 if once, else 2) */
  max?: number;
  tech?: boolean;
  satire?: boolean;
  /** jokes.txt key for a headline shown 5–8 s before the alert */
  foreshadow?: string;
  seconds?: number;
  defaultChoice: number;
  choices: ChoiceDef[];
  needsMember?: boolean;
  region?: RegionId | 'random';
  icon?: string;
}
