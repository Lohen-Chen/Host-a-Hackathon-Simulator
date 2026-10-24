// Tech tree purchases (Section 6.2). Buying does not pause the clock.
import { TECH_BY_ID } from '../content/techTree';
import { fx, log } from './helpers';
import type { GameState, TechId } from './types';

export type TechState = 'owned' | 'available' | 'locked' | 'poor';

export function techState(s: GameState, id: TechId): TechState {
  const n = TECH_BY_ID[id];
  if (s.unlockedTech.includes(id)) return 'owned';
  if (!n.mvp || (n.prereq && !s.unlockedTech.includes(n.prereq))) return 'locked';
  return s.techPoints >= n.cost ? 'available' : 'poor';
}

export function buyTech(s: GameState, id: TechId): boolean {
  if (techState(s, id) !== 'available') return false;
  const n = TECH_BY_ID[id];
  s.techPoints -= n.cost;
  s.unlockedTech.push(id);
  switch (id) {
    case 'clubfair': s.unlockedRoles.push('recruiter'); break;
    case 'design': s.unlockedRoles.push('designer'); break;
    case 'logistics': s.unlockedRoles.push('logistics'); break;
    case 'coordinator': s.unlockedRoles.push('coordinator'); break;
    case 'training2': s.trainingMult = 1.5; break;
    case 'training3': s.trainingMult = 1.7; break;
    case 'prestige2': s.prestigeLevel = 2; break;
    case 'prestige3': s.prestigeLevel = 3; break;
    case 'website': s.unlockedPosts.push('reel', 'countdown'); break;
    case 'promo': s.unlockedPosts.push('influencer'); break;
    case 'rep2': s.repCap = 150; break;
    case 'rep3': s.repCap = 200; break;
    case 'billboard': s.reputation = Math.min(s.repCap, s.reputation + 10); break;
    default: break;
  }
  fx(s, { kind: 'sfx', sfx: 'levelup' });
  fx(s, { kind: 'toast', text: `Unlocked: ${n.name}. ${n.effect}`, tone: 'good' });
  log(s, 'tech', id, n.cost);
  return true;
}
