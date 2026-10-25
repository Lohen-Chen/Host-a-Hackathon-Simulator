// Hackathon Day: text beats over one CSS-animated scene (skippable).
import { useEffect } from 'preact/hooks';
import { hackdayNext, hackdaySkip, type GameState } from '../core';
import { BearMascot } from '../ui/art';
import { store } from '../ui/store';

export function HackDay({ s }: { s: GameState }) {
  const h = s.hackday!;
  const b = h.beats[Math.min(h.index, h.beats.length - 1)];
  useEffect(() => {
    const t = setTimeout(() => store.act((st) => hackdayNext(st)), 5200);
    return () => clearTimeout(t);
  }, [h.index]);
  const screen = b.id === 'tree' ? <span>🌲 synergy 🌲</span> : b.id === 'expo' ? <span>DEMO TIME</span> : <span>BEAR HACKS<br />{h.index + 1}/{h.beats.length}</span>;
  return (
    <div class="scene" onClick={() => store.act((st) => hackdayNext(st))}>
      <div class="row"><h2 class="grow">🏁 Hackathon Day</h2><button class="btn btn-ghost" onClick={(e) => { e.stopPropagation(); store.act((st) => hackdaySkip(st)); }}>Skip to results</button></div>
      <div class="stage">
        <div class="spot" />
        <div class="screen">{screen}</div>
        <div style={{ position: 'absolute', left: '10px', bottom: '40px' }}><BearMascot size={40} mood={b.tone === 'bad' ? 'sad' : 'happy'} /></div>
        <div class="crowd" />
      </div>
      <div class={`beat ${b.tone}`} key={b.id}>
        <div class="ico">{b.icon}</div>
        <h2>{b.title}</h2>
        <p style={{ fontSize: '15px' }}>{b.text}</p>
      </div>
      <div class="tiny dim center">Tap to continue</div>
    </div>
  );
}
