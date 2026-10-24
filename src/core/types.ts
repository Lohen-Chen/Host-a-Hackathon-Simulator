// Core data model (Section 5). No DOM imports anywhere under /core.
import type { JokeHistory } from '../jokes/engine';

export type Mode = 'judge' | 'standard' | 'full';
export type Role = 'organizer' | 'social' | 'recruiter' | 'designer' | 'logistics' | 'coordinator';
export type Task = 'research' | 'social' | 'website' | 'venue' | 'sponsors' | 'recruit';
export type RegionId = 'dorms' | 'frat' | 'quad' | 'sproul' | 'twitter' | 'career' | 'highschools' | 'treeu';
export type Phase = 'intro' | 'morning' | 'live' | 'night' | 'auction' | 'hackday' | 'results';
export type TraitId =
  | 'caffeinated' | 'mole' | 'rust10' | 'nepo' | 'linkedin' | 'trenchcoat' | 'survivor'
  | 'pivoted' | 'veteran' | 'replyguy' | 'sleeper' | 'arts' | 'grass' | 'memer';
export type TechId =
  | 'clubfair' | 'design' | 'logistics' | 'coordinator' | 'training2' | 'prestige2' | 'website'
  | 'promo' | 'snack' | 'rep2' | 'training3' | 'prestige3' | 'reelposts' | 'rolodex' | 'billboard'
  | 'rep3' | 'applications' | 'nepolist' | 'travel';
export type PostId = 'flyer' | 'meme_bear' | 'linkedin' | 'dance' | 'pizza' | 'reel' | 'influencer' | 'clapback' | 'countdown' | 'dog';
export type BubbleType = 'donor' | 'idea' | 'buzz' | 'pizza' | 'lead' | 'fire' | 'spy' | 'party' | 'bsod';
export type Tier = 'flop' | 'meh' | 'solid' | 'viral' | 'mega' | 'ratio';
export type Vibe = 'corporate' | 'techbro' | 'startup' | 'defense' | 'vc' | 'genz';
export type SponsorTier = 'bronze' | 'silver' | 'golden' | 'partner';
export type VenueId = 'lawn' | 'soda' | 'parking' | 'stadium' | 'palace';
export type BidderId = 'tree' | 'furcon' | 'spreadsheet' | 'tammy';
export type TickerCat = 'BEAR BEAT' | 'TREE TIMES' | 'SPONSOR WIRE' | 'CAMPUS' | 'BREAKING';

export interface Member {
  id: number;
  name: string;
  bio: string;
  role: Role;
  baseSkill: number; // 1-8
  trait: TraitId;
  avatarSeed: number;
  task: Task | null;
  /** steps of no output (reassignment ramp, vim, standups, ...) */
  idleSteps: number;
  /** per-day random skill modifier (Rust trait) */
  dailyMod: number;
  /** Three Interns in a Trench Coat: today's bonus task */
  trenchTask: Task | null;
  /** fractional output accumulators per member (for "+1" pops) */
  acc: number;
  /** days of output lost (T1 revert, T16 redraw, bsod Arch reinstall) */
  benchedDays: number;
}

export interface RegionNode {
  id: RegionId;
  name: string;
  pop: number;
  x: number;
  y: number;
  neighbors: RegionId[];
  conv: number;
  bear: number;
  tree: number;
  signups: number;
  treeSignups: number;
}

export interface Bubble { id: number; type: BubbleType; regionId: RegionId; spawnedAt: number; ttl: number }

export interface ChoiceView { label: string; cost?: number; disabled?: boolean; hint?: string }

export interface ActiveAlert {
  uid: number;
  templateId: string;
  title: string;
  body: string;
  choices: ChoiceView[];
  /** seconds remaining (sim time) */
  remaining: number;
  seconds: number;
  defaultChoice: number;
  ctx: AlertCtx;
  /** shown on the map as a marker, if any */
  regionId?: RegionId;
}

export interface AlertCtx { memberId?: number; regionId?: RegionId; sponsorId?: string; filled: Record<string, string> }

export type ScheduledKind = 'bubble' | 'alert' | 'treeMove' | 'foreshadow' | 'invite';
export interface ScheduledEvent { at: number; kind: ScheduledKind; data?: string; done?: boolean }

export interface TreeMoveLive {
  uid: number;
  moveId: string;
  name: string;
  text: string;
  regionId: RegionId;
  targets: RegionId[];
  impulse: number;
  global: boolean;
  treeHype: number;
  remaining: number; // counter window seconds
  mult: number;
  responded: 'none' | 'counter' | 'clapback' | 'ignore';
}

export interface SignedSponsor { id: string; money: number; premium: boolean; mood: number; day: number }

export type PromiseKind =
  | 'logo_site' | 'attendees200' | 'attendees500' | 'agi' | 'drink_station' | 'tournament' | 'livestream'
  | 'defense_track' | 'vc_slot' | 'logo_everywhere' | 'clippy' | 'sticker_box' | 'templates' | 'payments'
  | 'gpu_raffle' | 'data_lake' | 'pre_seed' | 'afterparty_name' | 'no_customers' | 'daily_post' | 'boba'
  | 'site80' | 'logo_moon' | 'hydration';
export interface PromiseItem { uid: number; sponsorId: string; kind: PromiseKind; text: string; kept?: boolean }

export interface LogEntry { day: number; kind: string; text: string; value?: number }

export type FxKind = 'pop' | 'banner' | 'comment' | 'pulse' | 'sfx' | 'milestone' | 'shake' | 'confetti' | 'defect' | 'toast';
export interface Fx { kind: FxKind; regionId?: RegionId; text?: string; value?: number; tone?: 'good' | 'bad' | 'neutral'; sfx?: string }

export interface TickerItem { id: number; cat: TickerCat; text: string }

export type ReplyType = 'buzzword' | 'humble' | 'hype' | 'honest' | 'bribe' | 'overpromise';
export interface Courting {
  sponsorId: string;
  vibe: Vibe;
  round: number; // 0..2, 3 = finished
  interest: number;
  line: string;
  replies: { type: ReplyType; text: string }[];
  reaction: string;
  overpromised: boolean;
  bribed: boolean;
  result: null | { outcome: 'walk' | 'basic' | 'premium'; money: number; text: string; promises: string[] };
}

export interface AuctionBidder { id: BidderId; name: string; threshold: number; in: boolean }
export interface Auction {
  lots: VenueId[];
  lot: number;
  phase: 'intro' | 'bidding' | 'sold' | 'done';
  t: number;
  price: number;
  startPrice: number;
  rate: number;
  playerIn: boolean;
  bidders: AuctionBidder[];
  speech: { who: string; text: string } | null;
  soldTo: string | null;
  soldPrice: number;
  revealed: { bidder: BidderId; max: number } | null;
  results: { venue: VenueId; winner: string; price: number }[];
}

export interface Beat { id: string; icon: string; title: string; text: string; tone: 'good' | 'bad' | 'neutral' }
export interface HackDay { beats: Beat[]; index: number; t: number }

export interface ScoreBreakdown {
  categories: { id: string; name: string; weight: number; value: number; line: string }[];
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface Results {
  bear: ScoreBreakdown;
  tree: ScoreBreakdown;
  attendees: number;
  treeAttendees: number;
  win: boolean;
  awards: string[];
  headline: string;
}

export interface Settings { relaxed: boolean }

export interface DaySnapshot { signups: number; budget: number; rep: number; treeRegions: number; treeSignups: number; tp: number }

export interface GameState {
  version: 1;
  mode: Mode;
  seed: number;
  rngState: number;
  day: number; // 1..7
  phase: Phase;
  /** seconds elapsed in the current LIVE_DAY */
  t: number;
  step: number; // 0..20
  stepSec: number;
  daySec: number;

  budget: number;
  techPoints: number;
  tpAcc: number;
  reputation: number;
  repCap: number;
  regions: RegionNode[];
  treeHype: number;
  signups: number;
  treeSignups: number;
  bonusSignups: number;
  websiteScore: number;
  siteDownSteps: number;
  venueScore: number; // prep accumulated after the auction
  ambienceBonus: number;
  operations: number;
  scoutPoints: number;
  venue: VenueId | null;
  treeVenue: VenueId | null;

  members: Member[];
  candidates: Member[];
  rosterCap: number;
  nextId: number;

  unlockedRoles: Role[];
  unlockedPosts: PostId[];
  unlockedTech: TechId[];
  trainingMult: number;
  prestigeLevel: 1 | 2 | 3;

  hand: PostId[];
  rerollsLeft: number;
  chargesUsed: number;
  armedPost: number | null; // index into hand
  postsFired: number;

  bubbles: Bubble[];
  alertQueue: ActiveAlert[];
  schedule: ScheduledEvent[];
  treeMove: TreeMoveLive | null;
  treeNextRevealed: boolean;
  moodBank: number;
  qualityBonus: number;
  sponsorMoodDelta: number;
  inviteBonus: number; // today's extra invite chance
  outputMult: number; // today's crew output multiplier
  ignoredInvites: number;

  sponsors: SignedSponsor[];
  promises: PromiseItem[];
  courting: Courting | null;
  auction: Auction | null;
  hackday: HackDay | null;
  results: Results | null;

  ticker: TickerItem[];
  tickerT: number;
  lastInteractiveAt: number;
  firedAlerts: string[];
  flags: Record<string, number | boolean | string>;
  log: LogEntry[];
  jokeHistory: JokeHistory;
  milestones: string[];
  dayStart: DaySnapshot;
  recap: string[];
  tutorialStep: number;
  settings: Settings;
  /** transient UI events; the UI drains this each frame, headless runs ignore it */
  fx: Fx[];
  uid: number;
}
