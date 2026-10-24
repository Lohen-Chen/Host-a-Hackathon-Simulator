// Sponsor courting minigame modal (pauses the clock).
import { SPONSOR_BY_ID, TIER_INFO, VIBE_HINT } from '../content/sponsors';
import { BRIBE_COST, courtingReply, finishCourting, type GameState } from '../core';
import { store } from '../ui/store';

const TYPE_LABEL = { buzzword: '🧠 Buzzword', humble: '🙏 Humble', hype: '🚀 Hype', honest: '💬 Honest', bribe: '🍕 Bribe', overpromise: '🤞 Overpromise' } as const;

export function Courting({ s }: { s: GameState }) {
  const c = s.courting!;
  const d = SPONSOR_BY_ID[c.sponsorId];
  return (
    <div class="modal-back">
      <div class="card modal col">
        <div class="row"><h2 class="grow">🤝 {d.name}</h2><span class="chip">{TIER_INFO[d.tier].name}</span></div>
        <div class="tiny dim">👀 {VIBE_HINT[c.vibe]} · Offer: {d.money ? `$${d.money.toLocaleString('en-US')}` : 'in-kind'} · Perk: {d.perk}</div>
        <div class="row small"><span>Interest</span><div class="skillbar grow" style={{ height: '10px' }}><div style={{ width: `${c.interest}%`, background: c.interest >= 70 ? 'var(--good)' : c.interest >= 35 ? 'var(--gold)' : 'var(--bad)' }} /></div><b>{Math.round(c.interest)}</b></div>
        <div class="tiny dim">35 = basic deal · 70 = premium deal + perk · Round {Math.min(3, c.round + 1)}/3</div>
        {c.reaction && <div class="small">{c.reaction}</div>}
        {!c.result ? (
          <>
            <div class="speech">{c.line}</div>
            <div class="col" style={{ marginTop: '6px' }}>
              {c.replies.map((r, i) => (
                <button key={i} class="btn" disabled={r.type === 'bribe' && s.budget < BRIBE_COST} onClick={() => store.act((st) => courtingReply(st, i))}>
                  <div class="tiny gold">{TYPE_LABEL[r.type]}{r.type === 'bribe' ? ` ($${BRIBE_COST})` : r.type === 'overpromise' ? ' (bigger money, extra promise)' : ''}</div>
                  <div style={{ textAlign: 'left' }}>{r.text}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div class={`speech ${c.result.outcome === 'walk' ? 'bad' : ''}`}>{c.result.text}</div>
            {c.result.promises.length > 0 && <div class="small">🤞 You promised: {c.result.promises.join(' · ')}</div>}
            <button class="btn btn-gold" onClick={() => store.act((st) => finishCourting(st))}>{c.result.outcome === 'walk' ? 'Sad trombone. Back to work.' : 'Shake hands (firmly)'}</button>
          </>
        )}
      </div>
    </div>
  );
}
