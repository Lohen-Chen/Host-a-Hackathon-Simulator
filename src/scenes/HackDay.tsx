// Hackathon Day: text beats over one CSS-animated scene, with three live decisions (skippable).
import { useEffect } from 'preact/hooks';
import { hackdayChoose, hackdayNext, hackdaySkip, type GameState } from '../core';
import { BearMascot } from '../ui/art';
import { MapSvg } from '../ui/HypeMap';
import { store } from '../ui/store';

/** Check-ins fill the map over the first beats: doors, opening, hacking. */
const ARRIVAL = [0.45, 0.8, 1];

export function HackDay({ s }: { s: GameState }) {
  const h = s.hackday!;
  const b = h.beats[Math.min(h.index, h.beats.length - 1)];
  const waiting = !!b.choices && b.picked === undefined;
  useEffect(() => {
    if (waiting) return;
    const t = setTimeout(() => store.act((st) => hackdayNext(st)), b.outcome ? 6500 : 5200);
    return () => clearTimeout(t);
  }, [h.index, waiting]);
  const arrival = ARRIVAL[h.index];
  const here = Math.round(Number(s.flags.attendees ?? 0) * (arrival ?? 1));
  const screen = b.id === 'tree' || b.id === 'tree_side' ? <span>🌲 synergy 🌲</span>
    : b.id === 'expo' || b.id === 'd_demo' ? <span>DEMO TIME</span>
    : b.id === 'd_wifi' ? <span>📡 NO INTERNET</span>
    : b.id === 'd_leland' ? <span>📱 LIVE: L. Sr.</span>
    : <span>BEAR HACKS<br />{h.index + 1}/{h.beats.length}</span>;
  return (
    <div class="scene" onClick={() => !waiting && store.act((st) => hackdayNext(st))}>
      <div class="row"><h2 class="grow">🏁 Hackathon Day</h2><button class="btn btn-ghost" onClick={(e) => { e.stopPropagation(); store.act((st) => hackdaySkip(st)); }}>Skip to results</button></div>
      {arrival !== undefined ? (
        <div class="card arrivals">
          <div class="row tiny"><b class="grow">🚪 Check-in</b><span class="rs-b">🐻 {here.toLocaleString('en-US')} here</span></div>
          <MapSvg s={s} arrival={arrival} />
        </div>
      ) : (
        <div class="stage">
          <div class="spot" />
          <div class="screen">{screen}</div>
          <div style={{ position: 'absolute', left: '10px', bottom: '40px' }}><BearMascot size={40} mood={b.tone === 'bad' ? 'sad' : 'happy'} /></div>
          <div class="crowd" />
        </div>
      )}
      <div class={`beat ${b.tone}`} key={b.id}>
        <div class="ico">{b.icon}</div>
        <h2>{b.title}</h2>
        <p style={{ fontSize: '15px' }}>{b.text}</p>
        {b.choices && b.picked === undefined && (
          <div class="choices col">
            {b.choices.map((c, i) => (
              <button key={i} class="btn" disabled={c.disabled} onClick={(e) => { e.stopPropagation(); store.act((st) => hackdayChoose(st, i)); }}>
                {c.label}{c.hint ? <span class="tiny"> · {c.hint}</span> : null}
              </button>
            ))}
          </div>
        )}
        {b.outcome && <p class="outcome" style={{ fontSize: '15px' }}><b>{b.choices?.[b.picked ?? 0]?.label}:</b> {b.outcome}</p>}
      </div>
      <div class="tiny dim center">{waiting ? 'The night waits for you. Pick one.' : 'Tap to continue'}</div>
    </div>
  );
}
