// Day 3 venue auction (plain DOM): price counter, speech bubbles, hold-to-bid.
import { BIDDER_BY_ID, VENUE_BY_ID } from '../content/venues';
import { finishAuction, skipAuction, type GameState } from '../core';
import { store } from '../ui/store';

export function Auction({ s }: { s: GameState }) {
  const a = s.auction!;
  const v = VENUE_BY_ID[a.lots[Math.min(a.lot, a.lots.length - 1)]];
  const down = (e: Event) => { e.preventDefault(); store.holding = true; store.emit(); };
  const up = () => { store.holding = false; store.emit(); };
  if (a.phase === 'done') {
    const mine = s.venue ? VENUE_BY_ID[s.venue] : null;
    return (
      <div class="scene">
        <h2>🔨 Auction results</h2>
        {a.results.map((r) => <div key={r.venue} class="card small"><b>{VENUE_BY_ID[r.venue].name}</b> → {r.winner} (${r.price.toLocaleString('en-US')})</div>)}
        {mine && <div class="card"><b>Your venue: {mine.name}</b><div class="small">Capacity {mine.cap} · Ambience {mine.ambience}/9</div><div class="small dim">{mine.joke}</div></div>}
        <button class="btn btn-gold btn-big" onClick={() => store.act((st) => finishAuction(st))}>Continue</button>
      </div>
    );
  }
  const spectating = !!s.venue && a.results.every((r) => r.winner !== 'Bear U' || r.venue !== a.lots[a.lot]);
  return (
    <div class="scene" onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
      <div class="row"><h2 class="grow">🔨 Venue Auction · Lot {a.lot + 1}/{a.lots.length}</h2><span class="chip">💰 ${Math.round(s.budget).toLocaleString('en-US')}</span></div>
      <div class="card">
        <b>{v.name}</b>
        <div class="small">Capacity {v.cap} · Ambience {v.ambience}/9 · Anchor ${v.price.toLocaleString('en-US')}</div>
        <div class="small dim">"{v.joke}"</div>
      </div>
      <div class="price" aria-live="polite">${Math.round(a.price).toLocaleString('en-US')}</div>
      {a.speech && <div class="speech" key={a.speech.text}><b>{a.speech.who}:</b> {a.speech.text}</div>}
      <div class="bidders">
        {a.bidders.map((b) => <div key={b.id} class={`bidder ${b.in ? '' : 'out'}`}>{BIDDER_BY_ID[b.id].icon} {b.name}<div class="tiny dim">{BIDDER_BY_ID[b.id].blurb}</div></div>)}
        <div class={`bidder ${a.playerIn ? '' : 'out'}`}>🐻 Bear U (you)<div class="tiny dim">{s.venue ? 'Already have a venue (spectating)' : a.playerIn ? 'Holding = bidding' : 'Folded'}</div></div>
      </div>
      {a.revealed && <div class="tiny gold">🕵️ Scouting intel: {BIDDER_BY_ID[a.revealed.bidder].name} folds around ${a.revealed.max.toLocaleString('en-US')}.</div>}
      {a.phase === 'sold' && <div class="milestone" style={{ position: 'static', transform: 'none', animation: 'none' }}>SOLD to {a.soldTo} for ${a.soldPrice.toLocaleString('en-US')}!</div>}
      {a.phase !== 'sold' && (
        <button class={`btn btn-big hold-btn ${store.holding && a.playerIn ? 'holding' : ''}`} disabled={!a.playerIn || spectating}
          onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>
          {a.phase === 'intro' ? 'Get ready… press & HOLD to bid' : a.playerIn ? (store.holding ? '✊ HOLDING… release to fold' : 'HOLD TO BID') : 'You folded'}
        </button>
      )}
      <div class="tiny dim">The price rises. Hold BID to stay in; release to fold. Last one holding wins. Lose every lot and you get The Lawn (free, sprinklers at 3 AM).</div>
      <button class="btn btn-ghost" onClick={() => store.act((st) => skipAuction(st))}>Skip the rest (fold everything)</button>
    </div>
  );
}
