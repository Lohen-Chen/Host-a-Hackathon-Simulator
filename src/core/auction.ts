// Day 3 venue auction: hold BID to stay in, release to fold (Section 6.9).
import { BIDDERS, BIDDER_BY_ID, VENUE_BY_ID } from '../content/venues';
import { MODES } from './config';
import { addTicker, fx, log } from './helpers';
import { joke } from './jokes';
import { pick, rand, randRange, shuffle } from './rng';
import type { Auction, BidderId, GameState, VenueId } from './types';

const INTRO_SEC = 1.4;
const SOLD_SEC = 2.0;
const GRACE_SEC = 1.5;

export function startAuction(s: GameState) {
  s.phase = 'auction';
  const lots = shuffle(s, ['soda', 'parking', 'stadium', 'palace'] as VenueId[]).slice(0, 3).sort((a, b) => VENUE_BY_ID[a].price - VENUE_BY_ID[b].price);
  s.auction = {
    lots, lot: 0, phase: 'intro', t: 0, price: 0, startPrice: 0, rate: 0, playerIn: true,
    bidders: [], speech: null, soldTo: null, soldPrice: 0, revealed: null, results: [],
  };
  setupLot(s);
}

function setupLot(s: GameState) {
  const a = s.auction!;
  const v = VENUE_BY_ID[a.lots[a.lot]];
  const dur = MODES[s.mode].auctionSec;
  a.phase = 'intro';
  a.t = 0;
  a.startPrice = Math.round(v.price * 0.5);
  a.price = a.startPrice;
  a.rate = (v.price * 2.1 - a.startPrice) / dur;
  a.playerIn = !s.venue && s.budget >= a.startPrice;
  a.speech = null;
  a.soldTo = null;
  const scout = Math.min(0.15, s.scoutPoints * 0.025);
  a.bidders = BIDDERS.filter((b) => !(b.id === 'tree' && s.treeVenue)).map((b) => {
    let th = randRange(s, b.fold[0], b.fold[1]) + (b.venueBias?.[v.id] ?? 0);
    if (b.id === 'tree') th += 0.25 * Number(s.flags.treeAggro ?? 0);
    if (b.id === 'tammy' && s.flags.tammy === 'angry') th += 0.25;
    if (b.id === 'tammy' && s.flags.tammy === 'calm') th -= 0.1;
    th *= 1 - scout;
    return { id: b.id, name: b.name, threshold: Math.max(0.55, th), in: true };
  });
  a.revealed = null;
  if (s.scoutPoints >= 1.5 && a.bidders.length) {
    const b = [...a.bidders].sort((x, y) => y.threshold - x.threshold)[0];
    a.revealed = { bidder: b.id, max: Math.round((b.threshold * v.price) / 100) * 100 };
  }
}

/** Advance the auction by dt seconds. `holding` = the player is pressing BID. */
export function tickAuction(s: GameState, dt: number, holding: boolean) {
  const a = s.auction;
  if (!a || a.phase === 'done') return;
  a.t += dt;
  const v = VENUE_BY_ID[a.lots[a.lot]];
  if (a.phase === 'intro') {
    if (a.t >= INTRO_SEC) { a.phase = 'bidding'; a.t = 0; }
    return;
  }
  if (a.phase === 'sold') {
    if (a.t >= SOLD_SEC) nextLot(s);
    return;
  }
  // bidding
  a.price = a.startPrice + a.rate * a.t;
  if (a.playerIn) {
    if (a.price > s.budget) {
      a.playerIn = false;
      a.speech = { who: 'Your card', text: 'DECLINED. (The treasurer screams softly.)' };
      fx(s, { kind: 'sfx', sfx: 'error' });
    } else if (!holding && a.t > GRACE_SEC) {
      a.playerIn = false;
      a.speech = { who: 'You', text: pick(s, FOLD_LINES) };
    }
  }
  let lastFold: BidderId | null = null;
  for (const b of a.bidders) {
    if (b.in && a.price >= b.threshold * v.price) {
      b.in = false;
      lastFold = b.id;
      a.speech = { who: b.name, text: pick(s, FOLD_BY[b.id]) };
      fx(s, { kind: 'sfx', sfx: 'tap' });
    }
  }
  // Random taunts from bidders still in.
  if (!lastFold && rand(s) < dt * 0.55) {
    const inB = a.bidders.filter((b) => b.in);
    if (inB.length) {
      const b = pick(s, inB);
      a.speech = { who: b.name, text: joke(s, `taunt|${b.id}`).replace(/^[^:]+:\s*/, '') };
    }
  }
  const aiIn = a.bidders.filter((b) => b.in);
  if (a.playerIn && aiIn.length === 0) return sell(s, 'you');
  if (!a.playerIn && aiIn.length === 1) return sell(s, aiIn[0].id);
  if (!a.playerIn && aiIn.length === 0) return sell(s, lastFold ?? 'furcon');
}

function sell(s: GameState, winner: BidderId | 'you') {
  const a = s.auction!;
  const vid = a.lots[a.lot];
  const v = VENUE_BY_ID[vid];
  const price = Math.round(a.price / 50) * 50;
  a.phase = 'sold';
  a.t = 0;
  a.soldPrice = price;
  if (winner === 'you') {
    s.budget -= price;
    s.venue = vid;
    a.soldTo = 'Bear U';
    a.speech = { who: 'Auctioneer', text: `SOLD to Bear University for $${price.toLocaleString('en-US')}!` };
    fx(s, { kind: 'sfx', sfx: 'gavel' });
    fx(s, { kind: 'confetti' });
    addTicker(s, 'BEAR BEAT', `Bear U wins ${v.name} for $${price.toLocaleString('en-US')}; ${v.joke}`.slice(0, 100));
  } else {
    a.soldTo = BIDDER_BY_ID[winner].name;
    if (winner === 'tree' && !s.treeVenue) s.treeVenue = vid;
    a.speech = { who: 'Auctioneer', text: `SOLD to ${a.soldTo}!` };
    fx(s, { kind: 'sfx', sfx: 'gavel' });
    if (winner === 'tree') addTicker(s, 'TREE TIMES', `Tree Hacks wins ${v.name}; {rivalceo} "humbled"`.replace('{rivalceo}', 'Chad Leland III'));
    if (winner === 'furcon') addTicker(s, 'CAMPUS', `Bay Area FurCon wins ${v.name}; plans "the most wholesome dance-off ever"`.slice(0, 100));
    if (winner === 'tammy') addTicker(s, 'CAMPUS', `Wedding planner Tammy wins ${v.name}; "the bride will be thrilled," she says, menacingly`.slice(0, 100));
  }
  a.results.push({ venue: vid, winner: a.soldTo!, price });
  log(s, 'auction', `${v.name}:${a.soldTo}`, price);
}

function nextLot(s: GameState) {
  const a = s.auction!;
  a.lot++;
  if (a.lot >= a.lots.length) {
    a.phase = 'done';
    if (!s.venue) {
      s.venue = 'lawn';
      addTicker(s, 'BEAR BEAT', "Bear U hackathon will be held on The Lawn; sprinklers at 3 AM are \"a feature\"");
      log(s, 'auction', 'fallback:lawn', 0);
    }
    return;
  }
  setupLot(s);
}

/** Skip the rest of the auction (fold everything that's left). */
export function skipAuction(s: GameState) {
  const a = s.auction;
  if (!a) return;
  let guard = 0;
  while (a.phase !== 'done' && guard++ < 10000) tickAuction(s, 0.25, false);
}

export const auctionVenue = (a: Auction) => VENUE_BY_ID[a.lots[Math.min(a.lot, a.lots.length - 1)]];

const FOLD_LINES = ['"I fold. Respectfully. Financially."', '"Our treasurer just made a noise."', '"We\'ll take the next one. Probably."'];
const FOLD_BY: Record<BidderId, string[]> = {
  tree: ['"Let\'s circle back on this. Synergy."', '"I have to take this call." (He folds.)', '"We were going to pivot anyway."'],
  furcon: ['"Aww! You win this one, friend! 🦊"', '"Our budget is out of vibes!"', '"No hard feelings! (Some feelings.)"'],
  spreadsheet: ['"The model says fold. We obey the model."', '"Cell C7 turned red. We\'re out."', '"Exceeded our pivot table."'],
  tammy: ['"Fine. The bride will understand. Eventually."', '"I\'ll remember this. I remember everything."', '"I have three other venues on hold. Ta-ta."'],
};
