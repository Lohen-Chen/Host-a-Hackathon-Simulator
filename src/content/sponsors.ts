import type { PromiseKind, SponsorTier, Vibe } from '../core/types';

export interface SponsorDef {
  id: string;
  name: string;
  tier: SponsorTier;
  money: number;
  perk: string;
  perkFx: { quality?: number; mood?: number; rep?: number; viral?: number; protest?: boolean; riot?: number };
  vibe: Vibe;
  promise: PromiseKind;
  pitch: string;
}

// Section 7.1. Parody names only; no real logos.
export const SPONSORS: SponsorDef[] = [
  { id: 'closedai', name: 'ClosedAI', tier: 'golden', money: 15000, perk: 'AI Credits', perkFx: { quality: 10, mood: 4 }, vibe: 'techbro', promise: 'agi', pitch: '"Our model is open to everyone who signs this NDA."' },
  { id: 'bluebull', name: 'BlueBull', tier: 'silver', money: 10000, perk: 'Energy Drinks', perkFx: { quality: 5, mood: 5 }, vibe: 'genz', promise: 'drink_station', pitch: '"It gives you wings. Legally we can\'t say which kind."' },
  { id: 'clash', name: 'Clash of Royals', tier: 'bronze', money: 5000, perk: 'Side tournament', perkFx: { mood: 3 }, vibe: 'genz', promise: 'tournament', pitch: '"Hackers love three things: code, crowns, and yelling."' },
  { id: 'spacez', name: 'SpaceZ', tier: 'golden', money: 20000, perk: 'Rocket merch', perkFx: { mood: 5 }, vibe: 'techbro', promise: 'livestream', pitch: '"We put things in orbit. Sometimes on purpose."' },
  { id: 'balantir', name: 'Balantir Technologies', tier: 'golden', money: 100000, perk: 'A Very Large Check', perkFx: { mood: -15, protest: true }, vibe: 'defense', promise: 'defense_track', pitch: '"We see everything. Including this pitch. Especially this pitch."' },
  { id: 'slasha', name: '/A', tier: 'golden', money: 20000, perk: 'AI Credits+', perkFx: { quality: 15, mood: 5 }, vibe: 'vc', promise: 'vc_slot', pitch: '"We\'re a fund. We\'re also a vibe. Mostly a vibe."' },
  { id: 'rigidfinds', name: 'RigidFinds', tier: 'bronze', money: 10000, perk: 'none', perkFx: {}, vibe: 'corporate', promise: 'logo_everywhere', pitch: '"Pure cash. No perks. No joy."' },
  { id: 'fahrenheit', name: 'Fahrenheit', tier: 'silver', money: 10000, perk: 'Energy Drinks', perkFx: { quality: 5, mood: 5 }, vibe: 'genz', promise: 'hydration', pitch: '"Hydration, but make it 451 degrees."' },
  { id: 'macrohard', name: 'Macrohard', tier: 'golden', money: 30000, perk: 'Clippy Mentors', perkFx: { quality: 6, mood: -3 }, vibe: 'corporate', promise: 'clippy', pitch: '"It looks like you\'re hosting a hackathon. Would you like help?"' },
  { id: 'doordish', name: 'DoorDish', tier: 'partner', money: 0, perk: 'Late-night food', perkFx: { mood: 8 }, vibe: 'startup', promise: 'sticker_box', pitch: '"Food arrives in 30 minutes or 3 hours. No in-between."' },
  { id: 'notioned', name: 'Notioned', tier: 'silver', money: 8000, perk: 'Workshop', perkFx: { quality: 4 }, vibe: 'startup', promise: 'templates', pitch: '"Your second brain. Your first brain is tired."' },
  { id: 'stripey', name: 'Stripey', tier: 'silver', money: 12000, perk: 'Workshop', perkFx: { quality: 4 }, vibe: 'techbro', promise: 'payments', pitch: '"Every app is a payments app if you believe."' },
  { id: 'envidia', name: 'Envidia', tier: 'golden', money: 25000, perk: 'GPU Raffle', perkFx: { mood: 10, riot: 4 }, vibe: 'techbro', promise: 'gpu_raffle', pitch: '"One GPU. 400 hackers. May the odds be ever in your favor."' },
  { id: 'snowblake', name: 'SnowBlake', tier: 'bronze', money: 6000, perk: 'Data-lake workshop', perkFx: { quality: 2 }, vibe: 'corporate', promise: 'data_lake', pitch: '"Your data, but in a lake. A very cold lake."' },
  { id: 'ysee', name: 'YSee', tier: 'silver', money: 15000, perk: '"Batch 2026" workshop', perkFx: { quality: 3, rep: 5 }, vibe: 'startup', promise: 'pre_seed', pitch: '"We invest in founders who are pre-idea. You\'re perfect."' },
  { id: 'wrinkle', name: 'Wrinkle', tier: 'bronze', money: 4000, perk: 'Post viral chance up', perkFx: { viral: 0.05 }, vibe: 'genz', promise: 'daily_post', pitch: '"Ironing out social media, one wrinkle at a time."' },
  { id: 'bubbletrouble', name: 'Bubble Trouble Boba', tier: 'partner', money: 0, perk: 'Boba', perkFx: { mood: 6 }, vibe: 'genz', promise: 'boba', pitch: '"Tapioca is a lifestyle."' },
];

export const SPONSOR_BY_ID = Object.fromEntries(SPONSORS.map((s) => [s.id, s])) as Record<string, SponsorDef>;

export const TIER_INFO: Record<SponsorTier, { name: string; points: number; rank: number }> = {
  bronze: { name: 'Bronze', points: 14, rank: 1 },
  silver: { name: 'Silver', points: 22, rank: 2 },
  golden: { name: 'Golden Bear', points: 32, rank: 3 },
  partner: { name: 'Partner', points: 12, rank: 0 },
};

/** Courting reply score table per vibe (Section 6.8). */
export const VIBE_SCORES: Record<Vibe, Record<'buzzword' | 'humble' | 'hype' | 'honest' | 'bribe' | 'overpromise', number>> = {
  corporate: { buzzword: 24, humble: 16, hype: 4, honest: 10, bribe: -10, overpromise: 18 },
  techbro: { buzzword: 18, humble: 0, hype: 28, honest: 4, bribe: 10, overpromise: 22 },
  startup: { buzzword: 14, humble: 8, hype: 24, honest: 0, bribe: 4, overpromise: 30 },
  defense: { buzzword: 10, humble: 20, hype: 0, honest: 26, bribe: 6, overpromise: 10 },
  vc: { buzzword: 20, humble: -6, hype: 24, honest: -4, bribe: 16, overpromise: 30 },
  genz: { buzzword: -10, humble: 16, hype: 20, honest: 28, bribe: 10, overpromise: 0 },
};

export const VIBE_HINT: Record<Vibe, string> = {
  corporate: 'Wearing a lanyard over a blazer.',
  techbro: 'Vest. Cold brew. Strong opinions.',
  startup: 'Hoodie with a logo nobody recognizes.',
  defense: 'Sunglasses indoors. Says very little.',
  vc: 'Patagonia vest. Asks about your TAM.',
  genz: 'Holding a phone at a 45° angle.',
};

export const REPLIES: Record<'buzzword' | 'humble' | 'hype' | 'honest' | 'bribe' | 'overpromise', string[]> = {
  buzzword: [
    "We're leveraging {buzzword} to synergize the hacker funnel.",
    'Think of us as a platform for {buzzword}.',
    'Our north star is {buzzword}. Our south star is also {buzzword#1}.',
  ],
  humble: [
    "We're just a small club trying our best.",
    "Honestly? We'd be grateful for anything. Even {food}.",
    "We're humbled you'd even take this meeting.",
  ],
  hype: [
    'This is going to be the most {adj} hackathon in history.',
    "Tree University is SHAKING. You'll want to be on the winning side.",
    'We have {signups} signups and the energy of a rocket launch.',
  ],
  honest: [
    'We have a budget, a dream, and a bear suit that smells.',
    "Real talk: the WiFi will be bad. The people will be great.",
    "We don't know what we're doing. Nobody does. We just admit it.",
  ],
  bribe: [
    "Your logo on the bear suit. The bear doesn't get a vote.",
    'We will name a pizza after you.',
  ],
  overpromise: [
    "We'll have 500 hackers. And a blimp. Possibly a second blimp.",
    "Your logo on the moon. We're working out the details.",
  ],
};
