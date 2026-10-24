// SVG campus hype map + DOM overlay for bubbles, floaters and the Tree move icon.
import { BUBBLE_ICON, isTreeControlled, tapBubble, type GameState, type RegionId } from '../core';
import { store, type UiFx } from './store';

const W = 360;
const H = 300;

export function regionRadius(pop: number) { return 15 + Math.sqrt(pop) * 0.9; }

export function MapSvg({ s, onRegion, armed, pulses }: { s: GameState; onRegion?: (id: RegionId) => void; armed?: boolean; pulses?: UiFx[] }) {
  const pos = new Map(s.regions.map((r) => [r.id, r]));
  const edges: [RegionId, RegionId][] = [];
  for (const r of s.regions) for (const n of r.neighbors) if (r.id < n) edges.push([r.id, n]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} class={armed ? 'armed' : ''} role="group" aria-label="Campus hype map">
      <defs>
        <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#1a2740" stroke-width="1" /></pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      {edges.map(([a, b]) => { const A = pos.get(a)!; const B = pos.get(b)!; return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#3a4d70" stroke-width="3" stroke-dasharray="2 5" stroke-linecap="round" />; })}
      {s.regions.map((r) => {
        const rad = regionRadius(r.pop);
        const treeOwned = isTreeControlled(r);
        const pulse = pulses?.find((p) => p.regionId === r.id);
        return (
          <g key={r.id} class="region-hit" onClick={() => onRegion?.(r.id)} role="button" aria-label={`${r.name}: Bear ${Math.round(r.bear * 100)}%, Tree ${Math.round(r.tree * 100)}%, ${Math.round(r.signups)} signups`}>
            <circle class="base" cx={r.x} cy={r.y} r={rad} fill="#141e30" stroke="#000" stroke-width="2" />
            <circle class="region-fill" cx={r.x} cy={r.y} r={rad - 2} fill="var(--bear-hi)" fill-opacity={Math.min(0.92, r.bear * 0.95)} />
            <circle class="region-ring" cx={r.x} cy={r.y} r={rad - 1} fill="none" stroke="var(--tree-hi)" stroke-opacity={Math.min(1, r.tree * 1.1)} stroke-width={2 + r.tree * 6} />
            {pulse && <circle key={pulse.id} class="pulse" cx={r.x} cy={r.y} r={rad} fill="none" stroke={pulse.tone === 'bad' ? 'var(--tree-hi)' : 'var(--gold)'} stroke-width="4" />}
            <text class="region-label" x={r.x} y={r.y - 1} text-anchor="middle">{short(r.name)}</text>
            <text class="region-sub" x={r.x} y={r.y + 11} text-anchor="middle">{Math.round(r.signups)}{treeOwned ? ' 🌲' : ''}</text>
            <rect x={r.x - 16} y={r.y + rad + 2} width="32" height="4" fill="#0b1220" />
            <rect x={r.x - 16} y={r.y + rad + 2} width={32 * r.bear} height="2" fill="var(--bear-hi)" />
            <rect x={r.x - 16} y={r.y + rad + 4} width={32 * r.tree} height="2" fill="var(--tree-hi)" />
          </g>
        );
      })}
    </svg>
  );
}

function short(name: string) {
  return ({ 'Engineering Quad': 'Eng Quad', 'Local High Schools': 'High Schools', 'Tree University': 'Tree U', 'Career Center': 'Careers', 'Sproul Plaza': 'Sproul' } as Record<string, string>)[name] ?? name;
}

export function pct(r: { x: number; y: number }) {
  return { left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%` };
}

export function HypeMap({ s, onRegion }: { s: GameState; onRegion: (id: RegionId) => void }) {
  const fx = store.fx;
  const shaking = fx.some((f) => f.kind === 'shake');
  const regionOf = (id?: RegionId) => s.regions.find((r) => r.id === id);
  const armed = s.armedPost !== null;
  return (
    <div class={`map ${shaking ? 'shake' : ''}`}>
      <MapSvg s={s} onRegion={onRegion} armed={armed} pulses={fx.filter((f) => f.kind === 'pulse')} />
      <div class="overlay">
        {s.bubbles.map((b) => {
          const r = regionOf(b.regionId)!;
          const left = Math.max(0, b.ttl - (s.t - b.spawnedAt));
          const hazard = b.type === 'fire' || b.type === 'spy' || b.type === 'bsod';
          const jitter = ((b.id * 37) % 30) - 15;
          return (
            <button key={b.id} class={`bubble ${hazard ? 'hazard' : ''}`} style={{ left: `calc(${pct(r).left} + ${jitter}px)`, top: pct(r).top }}
              onPointerDown={(e) => { e.stopPropagation(); store.act((st) => tapBubble(st, b.id)); }}
              aria-label={`${b.type} bubble`}>
              {b.type === 'bsod' ? <span class="bsod" style={{ width: '40px', height: '30px' }}><span class="bsod-face">:(</span></span> : BUBBLE_ICON[b.type]}
              <span class="ttl" style={{ animationDuration: `${left}s` }} />
            </button>
          );
        })}
        {s.treeMove && (() => {
          const r = regionOf(s.treeMove.regionId)!;
          return <div class="tree-marker" style={pct(r)} aria-hidden="true">🌲</div>;
        })()}
        {s.alertQueue[0]?.regionId && (() => {
          const r = regionOf(s.alertQueue[0].regionId)!;
          return <div class="alert-marker" style={{ ...pct(r), marginTop: '-30px' }}>❗</div>;
        })()}
        {fx.map((f) => {
          const r = regionOf(f.regionId);
          const p = r ? pct(r) : { left: '50%', top: '45%' };
          if (f.kind === 'pop' || f.kind === 'defect') return <div key={f.id} class={`floater ${f.tone ?? ''}`} style={p}>{f.text}</div>;
          if (f.kind === 'banner' && r) return <div key={f.id} class={`tier-banner ${f.tone === 'bad' ? 'bad' : ''}`} style={p}>{f.text}</div>;
          if (f.kind === 'comment' && r) {
            const k = f.id % 3;
            return <div key={f.id} class="comment" style={{ left: p.left, top: `calc(${p.top} + ${-18 + k * 22}px)`, animationDelay: `${k * 0.25}s` }}>{f.text}</div>;
          }
          if (f.kind === 'confetti') return <Confetti key={f.id} at={p} />;
          return null;
        })}
      </div>
      {armed && <button class="arm-hint" onClick={() => store.act((st) => { st.armedPost = null; })}>📣 Tap a region to post · ✕</button>}
      <div class="legend"><span><span style={{ color: 'var(--bear-hi)' }}>●</span> Bear</span><span><span style={{ color: 'var(--tree-hi)' }}>◯</span> Tree</span></div>
    </div>
  );
}

function Confetti({ at }: { at: { left: string; top: string } }) {
  const colors = ['#fdb515', '#4f9cf9', '#ff6b6b', '#5ee08f', '#fff'];
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} class="confetti" style={{ ...at, background: colors[i % colors.length], '--dx': `${Math.cos(i) * 70}px`, '--dy': `${Math.sin(i * 1.7) * 60 - 40}px` } as Record<string, string>} />
      ))}
    </>
  );
}
