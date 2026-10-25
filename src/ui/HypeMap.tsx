// SVG hype map: each region is a block of dots (one per 50 students) colored Bear / Tree / neutral,
// plus a DOM overlay for bubbles, floaters and the Tree move icon.
import { BUBBLE_ICON, isTreeControlled, tapBubble, type GameState, type RegionId } from '../core';
import { store, type UiFx } from './store';

const W = 360;
const H = 300;

/** About this many students per dot. Each region's block is a full rectangle, so the exact number per dot varies a little by region. */
export const PER_SQUARE = 50;
const CELL = 8;
const SQ = 7;

interface Block { n: number; cols: number; rows: number; per: number; x0: number; y0: number; w: number; h: number; order: number[] }
const blocks = new Map<string, Block>();

/** The rectangle closest to pop / 50 dots with a pleasant aspect (about 4:3), so every block is symmetrical. */
function grid(pop: number): [number, number] {
  const target = pop / PER_SQUARE;
  let best: [number, number] = [1, 1];
  let bestCost = Infinity;
  for (let rows = 1; rows <= 10; rows++) {
    for (let cols = rows; cols <= rows * 2; cols++) {
      const cost = (Math.abs(cols * rows - target) / target) * 8 + Math.abs(cols / rows - 1.3);
      if (cost < bestCost) { bestCost = cost; best = [cols, rows]; }
    }
  }
  return best;
}

/** Each region is a compact block of dots around its map point. The fill order grows in rings from the
 *  middle outward, so Bear spreads like an infection from the center and Tree closes in from the edges. */
function blockFor(r: { id: string; pop: number; x: number; y: number }): Block {
  const key = `${r.id}:${r.pop}`;
  const hit = blocks.get(key);
  if (hit) return hit;
  const [cols, rows] = grid(r.pop);
  const n = cols * rows;
  const w = cols * CELL - (CELL - SQ);
  const h = rows * CELL - (CELL - SQ);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const order = Array.from({ length: n }, (_, i) => i)
    .map((i) => { const dx = (i % cols) - cx; const dy = Math.floor(i / cols) - cy; return { i, d: Math.hypot(dx, dy), a: Math.atan2(dy, dx) }; })
    .sort((a, b) => a.d - b.d || a.a - b.a).map((o) => o.i);
  const b = { n, cols, rows, per: r.pop / n, x0: r.x - w / 2, y0: r.y - h / 2, w, h, order };
  blocks.set(key, b);
  return b;
}

/** Dot colors for a region: [bear, tree] counts out of block.n. */
export function squareSplit(r: { signups: number; treeSignups: number }, b: { n: number; per: number }): [number, number] {
  const bear = Math.min(b.n, Math.round(r.signups / b.per));
  const tree = Math.min(b.n - bear, Math.round(r.treeSignups / b.per));
  return [bear, tree];
}

/** A very rough continental-US silhouette behind the regions, Plague Inc world-map style. */
const US_PATH = 'M18 92 L40 64 L70 52 L120 48 L170 44 L230 46 L262 58 L300 60 L332 70 L346 92 L336 120 L344 150 L330 182 L306 210 L284 238 L262 250 L238 268 L214 262 L188 246 L150 244 L118 232 L84 222 L56 204 L30 178 L20 140 Z';

/** With `arrival` (0–1), the map shows Hackathon Day check-ins instead of hype: blue dots light up as hackers walk in. */
export function MapSvg({ s, onRegion, selected, pulses, arrival }: { s: GameState; onRegion?: (id: RegionId) => void; selected?: RegionId | null; pulses?: UiFx[]; arrival?: number }) {
  const turnout = arrival === undefined ? 1 : (Number(s.flags.attendees ?? 0) / Math.max(1, s.signups)) * arrival;
  const pos = new Map(s.regions.map((r) => [r.id, r]));
  const edges: [RegionId, RegionId][] = [];
  for (const r of s.regions) for (const n of r.neighbors) if (r.id < n) edges.push([r.id, n]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Hype map">
      <defs>
        <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#1a2740" stroke-width="1" /></pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      <path d={US_PATH} fill="#16243c" stroke="#2b3f62" stroke-width="2" stroke-linejoin="round" />
      {edges.map(([a, b]) => { const A = pos.get(a)!; const B = pos.get(b)!; return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#3a4d70" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" />; })}
      {s.regions.map((r) => {
        const b = blockFor(r);
        const [bear, tree] = arrival === undefined ? squareSplit(r, b) : [Math.min(b.n, Math.round((r.signups * turnout) / b.per)), 0];
        const color = new Array<string>(b.n).fill('sq-n');
        // Check-in: everyone interested shows dim blue until they walk in.
        if (arrival !== undefined) for (let k = 0; k < squareSplit(r, b)[0]; k++) color[b.order[k]] = 'sq-w';
        for (let k = 0; k < bear; k++) color[b.order[k]] = 'sq-b';
        for (let k = 0; k < tree; k++) color[b.order[b.n - 1 - k]] = 'sq-t';
        const treeOwned = isTreeControlled(r);
        const pulse = pulses?.find((p) => p.regionId === r.id);
        const sel = selected === r.id;
        return (
          <g key={r.id} class={`region-hit ${sel ? 'sel' : ''}`} onClick={(e) => { if (!bubbleFirst(e)) onRegion?.(r.id); }} role="button"
            aria-label={`${r.name}: ${Math.round(r.signups)} for Bear, ${Math.round(r.treeSignups)} for Tree, of ${r.pop}`}>
            <rect class="block-bg" x={b.x0 - 3} y={b.y0 - 3} width={b.w + 6} height={b.h + 6} rx="6" />
            {color.map((c, i) => <circle key={i} class={`sq ${c}`} cx={b.x0 + (i % b.cols) * CELL + SQ / 2} cy={b.y0 + Math.floor(i / b.cols) * CELL + SQ / 2} r={SQ / 2} />)}
            {pulse && <rect key={pulse.id} class={`pulse ${pulse.tone === 'bad' ? 'bad' : ''}`} x={b.x0 - 4} y={b.y0 - 4} width={b.w + 8} height={b.h + 8} rx="4" />}
            <text class={`region-label ${treeOwned ? 'tree-owned' : ''}`} x={r.x} y={b.y0 - 6} text-anchor="middle">{short(r.name)}</text>
            <text class="region-sub" x={r.x} y={b.y0 + b.h + 11} text-anchor="middle">{arrival === undefined
              ? <><tspan class="rs-b">{compact(r.signups)}</tspan> <tspan class="rs-t">{compact(r.treeSignups)}</tspan></>
              : <tspan class="rs-b">{compact(r.signups * turnout)} here</tspan>}</text>
          </g>
        );
      })}
    </svg>
  );
}

function short(name: string) {
  return ({ 'Local High Schools': 'High Schools', 'International Students': 'Intl', 'UC Schools': 'UC', 'B1G Schools': 'B1G', 'SEC Schools': 'SEC', 'ACC Schools': 'ACC' } as Record<string, string>)[name] ?? name;
}

function compact(v: number) {
  const a = Math.round(v);
  return a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(a);
}

/** Bubbles win over regions. A bubble pops on pointer-down, so the click that follows can land on the
 * region under it; and a tap just off a bobbing bubble's edge should still pop the bubble. */
let bubbleTapAt = -Infinity;
function bubbleFirst(e: MouseEvent): boolean {
  if (performance.now() - bubbleTapAt < 600) return true;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('.map .bubble'))) {
    const r = el.getBoundingClientRect();
    const pad = 12;
    if (e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return true;
    }
  }
  return false;
}

export function pct(r: { x: number; y: number }) {
  return { left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%` };
}

export function HypeMap({ s, onRegion, selected }: { s: GameState; onRegion: (id: RegionId) => void; selected?: RegionId | null }) {
  const fx = store.fx;
  const shaking = fx.some((f) => f.kind === 'shake');
  const regionOf = (id?: RegionId) => s.regions.find((r) => r.id === id);
  return (
    <div class={`map ${shaking ? 'shake' : ''}`}>
      <MapSvg s={s} onRegion={onRegion} selected={selected} pulses={fx.filter((f) => f.kind === 'pulse')} />
      <div class="overlay">
        {s.bubbles.map((b) => {
          const r = regionOf(b.regionId)!;
          const left = Math.max(0, b.ttl - (s.t - b.spawnedAt));
          const jitter = ((b.id * 37) % 30) - 15;
          return (
            <button key={b.id} class={`bubble ${b.type === 'post' ? 'post' : ''}`} style={{ left: `calc(${pct(r).left} + ${jitter}px)`, top: pct(r).top }}
              onPointerDown={(e) => { e.stopPropagation(); bubbleTapAt = performance.now(); store.act((st) => tapBubble(st, b.id)); }}
              aria-label={`${b.type} bubble`}>
              {BUBBLE_ICON[b.type]}
              <span class="ttl" style={{ animationDuration: `${left}s` }} />
            </button>
          );
        })}
        {s.popups[0]?.kind === 'tree' && s.popups[0].regionId && (() => {
          const r = regionOf(s.popups[0].regionId)!;
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
          if (f.kind === 'confetti') return <Confetti key={f.id} at={p} />;
          return null;
        })}
        {[...new Set(fx.filter((f) => f.kind === 'comment' && f.regionId).map((f) => f.regionId!))].map((id) => {
          // One stacked column per region so replies never pile on top of each other.
          const r = regionOf(id)!;
          const cs = fx.filter((f) => f.kind === 'comment' && f.regionId === id).slice(-3);
          return (
            <div key={id} class="comments" style={{ left: `clamp(30%, ${pct(r).left}, 70%)`, top: pct(r).top }}>
              {cs.map((f, k) => <div key={f.id} class="comment" style={{ animationDelay: `${k * 0.25}s` }}>{f.text}</div>)}
            </div>
          );
        })}
      </div>
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
