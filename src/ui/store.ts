// The one UI store: holds the GameState, runs the real-time loop, and drains
// core fx into short-lived UI effects. Core stays DOM-free; this file is the bridge.
import { useEffect, useState } from 'preact/hooks';
import { advance, tickAuction, deserialize, isClockRunning, newGame, serialize, type Fx, type GameState, type Mode } from '../core';
import { sfx } from '../audio/sfx';

const SAVE_KEY = 'hahs-save-v1';
const SETTINGS_KEY = 'hahs-settings-v1';

export interface UiSettings { muted: boolean; relaxed: boolean; music: boolean }
export interface UiFx extends Fx { id: number; born: number }

type Listener = () => void;

class Store {
  state: GameState | null = null;
  version = 0;
  paused = false;
  hidden = false;
  /** a modal UI layer (pause menu, how-to) that should pause the clock */
  uiModal: string | null = null;
  fx: UiFx[] = [];
  settings: UiSettings = loadSettings();
  private listeners = new Set<Listener>();
  private last = 0;
  private lastRender = 0;
  private fxId = 0;
  private raf = 0;
  holding = false; // auction BID button

  subscribe(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  emit() { this.version++; for (const l of this.listeners) l(); }

  /** Run a core action against the current state and re-render. */
  act<T>(fn: (s: GameState) => T): T | undefined {
    if (!this.state) return undefined;
    const r = fn(this.state);
    this.drainFx();
    this.emit();
    return r;
  }

  newGame(mode: Mode, seed?: number) {
    const sd = seed ?? Math.floor(Math.random() * 1e6);
    this.state = newGame(sd, mode, this.settings.relaxed);
    this.fx = [];
    this.paused = false;
    this.emit();
  }

  continueGame(): boolean {
    const raw = safeGet(SAVE_KEY);
    const s = raw ? deserialize(raw) : null;
    if (!s) return false;
    this.state = s;
    this.state.settings.relaxed = this.settings.relaxed;
    this.emit();
    return true;
  }

  hasSave(): boolean {
    const raw = safeGet(SAVE_KEY);
    const s = raw ? deserialize(raw) : null;
    return !!s && s.phase !== 'results';
  }

  save() {
    if (!this.state) return;
    // Mid-day saves would lose real-time context; we save at day boundaries.
    if (this.state.phase === 'morning' || this.state.phase === 'night') safeSet(SAVE_KEY, serialize(this.state));
    if (this.state.phase === 'results') safeRemove(SAVE_KEY);
  }

  quit() { this.state = null; this.emit(); }

  setSettings(p: Partial<UiSettings>) {
    this.settings = { ...this.settings, ...p };
    safeSet(SETTINGS_KEY, JSON.stringify(this.settings));
    if (this.state) this.state.settings.relaxed = this.settings.relaxed;
    sfx.setMuted(this.settings.muted);
    sfx.setMusic(this.settings.music && !this.settings.muted);
    this.emit();
  }

  clockRunning(): boolean {
    return !!this.state && isClockRunning(this.state) && !this.paused && !this.hidden && !this.uiModal;
  }

  start() {
    const loop = (now: number) => {
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
      this.last = now;
      let changed = false;
      if (this.state && this.clockRunning() && dt > 0) {
        advance(this.state, dt);
        changed = true;
      }
      if (this.state?.phase === 'auction' && !this.paused && !this.hidden && dt > 0) {
        tickAuction(this.state, dt, this.holding);
        changed = true;
      }
      if (this.drainFx()) changed = true;
      // expire old UI fx
      const before = this.fx.length;
      this.fx = this.fx.filter((f) => now - f.born < fxLife(f));
      if (this.fx.length !== before) changed = true;
      // ~30 fps re-render while live; CSS transitions do the in-between smoothing.
      if (changed && now - this.lastRender > 33) { this.lastRender = now; this.emit(); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.visibilityState === 'hidden';
      if (this.hidden) this.save();
      this.emit();
    });
  }

  stop() { cancelAnimationFrame(this.raf); }

  private drainFx(): boolean {
    const s = this.state;
    if (!s || !s.fx.length) return false;
    const now = performance.now();
    for (const f of s.fx) {
      if (f.kind === 'sfx') { if (f.sfx) sfx.play(f.sfx); continue; }
      this.fx.push({ ...f, id: ++this.fxId, born: now });
    }
    s.fx = [];
    // Cap concurrent effects so a busy moment can't tank frame rate.
    if (this.fx.length > 40) this.fx = this.fx.slice(-40);
    return true;
  }
}

function fxLife(f: UiFx): number {
  switch (f.kind) {
    case 'toast': return 3600;
    case 'milestone': return 2200;
    case 'comment': return 2600;
    case 'banner': return 1600;
    case 'confetti': return 1400;
    case 'shake': return 400;
    default: return 1300;
  }
}

function loadSettings(): UiSettings {
  const d: UiSettings = { muted: false, relaxed: false, music: true };
  try {
    const raw = safeGet(SETTINGS_KEY);
    return raw ? { ...d, ...JSON.parse(raw) } : d;
  } catch { return d; }
}

function safeGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage may throw; the game still works */ } }
function safeRemove(k: string) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

export const store = new Store();

export function useStore(): Store {
  const [, setV] = useState(0);
  useEffect(() => store.subscribe(() => setV((v) => v + 1)), []);
  return store;
}
