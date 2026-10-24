// Social posts: arm a card, tap a region (Section 6.4).
import { POST_BY_ID, TIER_LABEL, TIER_MULT, type PostCard } from '../content/posts';
import { SPONSOR_BY_ID } from '../content/sponsors';
import { addRep, addTicker, chargesLeft, fx, log, socialSkillSum } from './helpers';
import { joke } from './jokes';
import { bearImpulse, milestone } from './map';
import { dealHand } from './state';
import { rand } from './rng';
import type { GameState, PostId, RegionId, Tier } from './types';
import { spawnBubble } from './events';

/** Regions where a card lands badly (affinity ×0.5). */
const MISMATCH: Partial<Record<PostId, RegionId[]>> = {
  flyer: ['twitter'],
  meme_bear: ['career'],
  linkedin: ['dorms', 'highschools', 'twitter'],
  dance: ['career', 'quad'],
  pizza: ['career'],
  reel: ['career'],
  influencer: ['career', 'treeu'],
  clapback: ['highschools', 'career'],
  dog: ['career'],
};

export function affinity(card: PostCard, region: RegionId): number {
  if (card.favored === 'all') return 1;
  if (card.favored.includes(region)) return 1.5;
  if (MISMATCH[card.id]?.includes(region)) return 0.5;
  return 1;
}

export function partyMult(card: PostCard, region: RegionId): number {
  if (region !== 'frat') return 1;
  return card.party ? 2 : 0.5;
}

export function viralChance(s: GameState, card: PostCard): number {
  const sss = socialSkillSum(s);
  let p = card.viralBase + 0.02 * sss;
  if (s.sponsors.some((x) => x.id === 'wrinkle')) p += SPONSOR_BY_ID.wrinkle.perkFx.viral ?? 0;
  if (s.members.some((m) => m.task === 'social' && m.trait === 'memer') && card.id !== 'linkedin') p += 0.04;
  return Math.min(0.85, p);
}

export function ratioChance(s: GameState, card: PostCard): number {
  return Math.max(0, card.risk - 0.01 * socialSkillSum(s));
}

export function rollTier(s: GameState, card: PostCard): Tier {
  const pRatio = ratioChance(s, card);
  const pViral = viralChance(s, card);
  const r = rand(s);
  if (r < pRatio) return 'ratio';
  if (r < pRatio + pViral) return rand(s) < 0.18 ? 'mega' : 'viral';
  let flop = 0.22;
  const onSocial = s.members.filter((m) => m.task === 'social');
  if (onSocial.some((m) => m.trait === 'linkedin')) flop += 0.08;
  if (card.id === 'linkedin' && onSocial.some((m) => m.trait === 'memer')) flop += 0.15;
  const r2 = rand(s);
  if (r2 < flop) return 'flop';
  if (r2 < flop + 0.33) return 'meh';
  return 'solid';
}

export function canFire(s: GameState, handIdx: number): boolean {
  const id = s.hand[handIdx];
  if (!id) return false;
  return chargesLeft(s) > 0 && s.budget >= POST_BY_ID[id].cost;
}

export function armPost(s: GameState, handIdx: number | null) {
  s.armedPost = handIdx !== null && canFire(s, handIdx) ? handIdx : null;
}

export function reroll(s: GameState): boolean {
  if (s.rerollsLeft <= 0) return false;
  s.rerollsLeft--;
  dealHand(s);
  return true;
}

export function firePost(s: GameState, handIdx: number, regionId: RegionId): Tier | null {
  if (!canFire(s, handIdx)) return null;
  const card = POST_BY_ID[s.hand[handIdx]];
  s.budget -= card.cost;
  s.chargesUsed++;
  s.postsFired++;
  s.hand.splice(handIdx, 1);
  s.armedPost = null;

  const tier = rollTier(s, card);
  const sss = socialSkillSum(s);
  const lunatic = s.members.some((m) => m.task === 'social' && m.trait === 'linkedin') ? 1.2 : 1;
  const impulse = card.power * TIER_MULT[tier] * affinity(card, regionId) * (1 + 0.1 * sss) * partyMult(card, regionId) * lunatic * IMPULSE_SCALE;
  const r = s.regions.find((x) => x.id === regionId)!;
  if (card.fullSpill) bearImpulse(s, regionId, impulse, 1);
  else if (card.party && regionId === 'frat') bearImpulse(s, regionId, impulse, 0.5, ['dorms', 'sproul']);
  else bearImpulse(s, regionId, impulse);

  if (tier === 'ratio') addRep(s, -3);
  if (tier === 'viral') addRep(s, 2);
  if (tier === 'mega') addRep(s, 4);
  if (card.id === 'clapback' && tier !== 'flop') {
    const k = s.members.some((m) => m.task === 'social' && m.trait === 'replyguy') ? 1.5 : 1;
    s.treeHype = Math.max(0, s.treeHype - 5 * k);
  }
  if (card.id === 'linkedin') s.inviteBonus += 0.05;

  fx(s, { kind: 'banner', regionId, text: TIER_LABEL[tier], tone: tier === 'flop' || tier === 'ratio' ? 'bad' : tier === 'meh' ? 'neutral' : 'good' });
  for (let i = 0; i < 3; i++) fx(s, { kind: 'comment', regionId, text: joke(s, `comment|${tier}`) });
  fx(s, { kind: 'pulse', regionId, tone: 'good' });
  if (tier === 'viral' || tier === 'mega') {
    fx(s, { kind: 'confetti', regionId });
    fx(s, { kind: 'sfx', sfx: 'viral' });
    milestone(s, 'firstViral', 'First viral post!');
    addTicker(s, 'BEAR BEAT', `Bear U post "${card.name}" goes ${tier === 'mega' ? 'MEGA-viral' : 'viral'} in ${r.name}`);
    if (rand(s) < 0.5) spawnBubble(s, 'buzz', regionId);
  } else if (tier === 'flop' || tier === 'ratio') {
    fx(s, { kind: 'shake' });
    fx(s, { kind: 'sfx', sfx: tier === 'ratio' ? 'error' : 'flop' });
    if (tier === 'ratio') addTicker(s, 'CAMPUS', `Bear U ratio'd in ${r.name}; replies "a group project and everyone is failing"`.slice(0, 100));
  } else {
    fx(s, { kind: 'sfx', sfx: 'tap' });
  }
  log(s, `post:${tier}`, card.name, impulse);
  return tier;
}

/** Global scale on post impulses ([TUNE]; see docs/balance.md). */
export const IMPULSE_SCALE = 0.6;
