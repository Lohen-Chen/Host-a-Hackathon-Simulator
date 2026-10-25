// Game feel: things that fly to counters, sparks, rolling numbers and bumps. Pure UI; core never sees it.
import { useEffect, useRef, useState } from 'preact/hooks';
import { sfx } from '../audio/sfx';

interface Flyer { id: number; x: number; y: number; dx: number; dy: number; text: string; cls: string; delay: number; born: number; life: number }

let flyers: Flyer[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const changed = () => { for (const l of listeners) l(); };

function centerOf(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** The on-screen counter for a stat (the first visible one with data-counter="name"). */
export function counterEl(name: string): Element | null {
  for (const el of Array.from(document.querySelectorAll(`[data-counter="${name}"]`))) if ((el as HTMLElement).offsetParent) return el;
  return null;
}

function add(f: Omit<Flyer, 'id' | 'born'>) {
  flyers.push({ ...f, id: ++nextId, born: performance.now() });
  if (flyers.length > 60) flyers = flyers.slice(-60);
  setTimeout(() => { const now = performance.now(); flyers = flyers.filter((x) => now - x.born < x.life + x.delay); changed(); }, f.life + f.delay + 20);
  changed();
}

/** A few sparks scatter from a point. */
export function burst(from: { x: number; y: number }, n = 7, cls = 'spark') {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const d = 26 + Math.random() * 22;
    add({ x: from.x, y: from.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d, text: '', cls, delay: 0, life: 450 });
  }
}

/** Text or an emoji flies from a point (or element) into a counter, which bumps when it lands. */
export function flyTo(from: Element | { x: number; y: number }, counter: string, text: string, opts: { count?: number; cls?: string; spread?: number } = {}) {
  const a = 'getBoundingClientRect' in from ? centerOf(from) : from;
  const target = counterEl(counter);
  const b = centerOf(target);
  if (!a || !b) return;
  const n = opts.count ?? 1;
  for (let i = 0; i < n; i++) {
    const jx = n > 1 ? (Math.random() - 0.5) * (opts.spread ?? 30) : 0;
    const jy = n > 1 ? (Math.random() - 0.5) * (opts.spread ?? 30) : 0;
    add({ x: a.x + jx, y: a.y + jy, dx: b.x - a.x - jx, dy: b.y - a.y - jy, text, cls: opts.cls ?? 'fly', delay: i * 60, life: 620 });
  }
  setTimeout(() => bump(target), 600 + (n - 1) * 60);
}

/** Replays the bump animation on an element. */
export function bump(el: Element | null) {
  if (!el) return;
  el.classList.remove('bump');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('bump');
}

export function Flyers() {
  const [, set] = useState(0);
  useEffect(() => { const l = () => set((v) => v + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return (
    <div class="flyers" aria-hidden="true">
      {flyers.map((f) => (
        <span key={f.id} class={`flyer ${f.cls}`} style={{ left: `${f.x}px`, top: `${f.y}px`, '--dx': `${f.dx}px`, '--dy': `${f.dy}px`, animationDelay: `${f.delay}ms`, animationDuration: `${f.life}ms` } as Record<string, string>}>{f.text}</span>
      ))}
    </div>
  );
}

/** A number that rolls to its new value and flashes green or red. */
export function Rolling({ value, format, ms = 450 }: { value: number; format: (v: number) => string; ms?: number }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<'' | 'up' | 'down'>('');
  const from = useRef(value);
  useEffect(() => {
    if (Math.round(value) === Math.round(shown)) { setShown(value); return; }
    from.current = shown;
    setFlash(value > shown ? 'up' : 'down');
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      const e = 1 - (1 - p) ** 3;
      setShown(from.current + (value - from.current) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setFlash(''), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [Math.round(value)]);
  return <span class={`rolling ${flash}`}>{format(shown)}</span>;
}

/** Every button press gets a short tick (bubbles have their own pop). */
export function useButtonTicks() {
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const b = (e.target as Element | null)?.closest?.('button');
      if (!b || (b as HTMLButtonElement).disabled || b.classList.contains('bubble') || b.classList.contains('confirm-btn')) return;
      sfx.play('tick');
    };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, []);
}
