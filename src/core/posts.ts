// Social posts are automated: 📱 bubbles pop up on regions; tapping one posts the best-fitting card there.
import { POST_BY_ID, TIER_LABEL, TIER_MULT, type PostCard } from '../content/posts';
import { SPONSOR_BY_ID } from '../content/sponsors';
import { T } from './config';
import { addRep, addTicker, fx, hasTech, log, socialSkillSum } from './helpers';
import { joke } from './jokes';
import { bearImpulse, milestone } from './map';
import { rand } from './rng';
import { bar } from './tech';
import type { GameState, PostId, RegionId, Tier } from './types';
import { spawnBubble } from './events';

/** Regions where a card lands badly (affinity ×0.5). */
const MISMATCH: Partial<Record<PostId, RegionId[]>> = {
  flyer: ['twitter', 'intl'],
  meme_bear: ['intl'],
  linkedin: ['frat', 'highschools', 'twitter'],
  dance: ['intl', 'acc'],
  pizza: ['twitter'],
  reel: ['frat'],
  influencer: ['intl'],
  clapback: ['highschools', 'intl'],
  dog: ['acc'],
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
  if (s.unlockedTech.includes('ricklee')) p += 0.08;
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

/** Automated posting: the social team picks the card that fits this region best (with some variety). */
export function pickCard(s: GameState, regionId: RegionId): PostCard {
  const r = s.regions.find((x) => x.id === regionId)!;
  const scored = s.unlockedPosts.map((id) => POST_BY_ID[id])
    .filter((c) => c.cost * 20 <= s.budget) // paid posts only when they're pocket change
    .map((c) => {
      let v = c.power * (1 + c.viralBase) * (1 - c.risk * 0.5) * affinity(c, regionId) * partyMult(c, regionId);
      if (c.id === 'clapback') v *= r.tree > r.bear ? 1.6 : 0.6;
      return { c, v: v * (0.85 + rand(s) * 0.3) };
    })
    .sort((a, b) => b.v - a.v);
  return scored[0]?.c ?? POST_BY_ID.flyer;
}

/** Fire a post at a region (from a tapped 📱 bubble). The result goes to the news feed. */
export function firePost(s: GameState, cardId: PostId, regionId: RegionId): Tier {
  const card = POST_BY_ID[cardId];
  s.budget -= Math.min(s.budget, card.cost);
  s.postsFired++;
  const r = s.regions.find((x) => x.id === regionId)!;
  const awareBefore = r.bear;

  const tier = rollTier(s, card);
  const sss = socialSkillSum(s);
  const lunatic = s.members.some((m) => m.task === 'social' && m.trait === 'linkedin') ? 1.2 : 1;
  const impulse = card.power * TIER_MULT[tier] * affinity(card, regionId) * (1 + 0.1 * sss) * partyMult(card, regionId) * lunatic * (1 + bar(s, 'hype') / 200) * (regionId === 'uc' && hasTech(s, 'ericou') ? 1.5 : 1) * IMPULSE_SCALE;
  if (card.fullSpill) bearImpulse(s, regionId, impulse, 1);
  else if (card.party && regionId === 'frat') bearImpulse(s, regionId, impulse, 1);
  else bearImpulse(s, regionId, impulse, T.spillFactor * (hasTech(s, 'influencers') ? 1.5 : 1));

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
    if (rand(s) < 0.5) spawnBubble(s, 'idea', regionId);
  } else if (tier === 'flop' || tier === 'ratio') {
    fx(s, { kind: 'shake' });
    fx(s, { kind: 'sfx', sfx: tier === 'ratio' ? 'error' : 'flop' });
    if (tier === 'ratio') addTicker(s, 'CAMPUS', `Bear U ratio'd in ${r.name}; replies "a group project and everyone is failing"`.slice(0, 100));
  } else {
    fx(s, { kind: 'sfx', sfx: 'tap' });
  }
  const gain = Math.round((r.bear - awareBefore) * 100);
  addTicker(s, 'POSTS', `${card.icon} ${card.name} → ${r.name}: ${TIER_LABEL[tier]}${gain > 0 ? ` · +${gain}% aware` : gain < 0 ? ` · ${gain}% aware` : ''}${card.cost ? ` · $${card.cost}` : ''}`.slice(0, 100));
  log(s, `post:${tier}`, card.name, impulse);
  return tier;
}

/** Global scale on post impulses ([TUNE]; see docs/balance.md). */
export const IMPULSE_SCALE = 0.6;
