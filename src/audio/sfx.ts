// Audio: SFX are synthesized with WebAudio placeholders (swap in CC0 samples later, docs/CREDITS.md).
// Music is two looping tracks: one for the title screen, one for the game.
import gameUrl from './BG_Music.mp3';
import menuUrl from './Menu_Screen_Music.mp3';

export type Track = 'menu' | 'game';
const TRACKS: Record<Track, string> = { menu: menuUrl, game: gameUrl };
const MUSIC_VOL = 0.35;
type Voice = { f: number; t: number; d: number; type?: OscillatorType; slide?: number; vol?: number };

const PATCHES: Record<string, Voice[]> = {
  tap: [{ f: 660, t: 0, d: 0.05, type: 'square', vol: 0.12 }],
  pop: [{ f: 520, t: 0, d: 0.06, type: 'triangle', slide: 1.8 }, { f: 980, t: 0.05, d: 0.05, type: 'triangle' }],
  cash: [{ f: 988, t: 0, d: 0.07, type: 'square', vol: 0.12 }, { f: 1319, t: 0.07, d: 0.16, type: 'square', vol: 0.12 }],
  flop: [{ f: 220, t: 0, d: 0.25, type: 'sawtooth', slide: 0.5, vol: 0.12 }],
  viral: [523, 659, 784, 1047].map((f, i) => ({ f, t: i * 0.06, d: 0.12, type: 'square' as OscillatorType, vol: 0.1 })),
  alert: [{ f: 880, t: 0, d: 0.08, type: 'square', vol: 0.1 }, { f: 660, t: 0.1, d: 0.08, type: 'square', vol: 0.1 }],
  siren: [{ f: 600, t: 0, d: 0.3, type: 'sawtooth', slide: 1.6, vol: 0.08 }, { f: 960, t: 0.3, d: 0.3, type: 'sawtooth', slide: 0.62, vol: 0.08 }],
  fire: [{ f: 140, t: 0, d: 0.4, type: 'sawtooth', slide: 0.6, vol: 0.12 }],
  trombone: [392, 370, 349, 294].map((f, i) => ({ f, t: i * 0.22, d: i === 3 ? 0.6 : 0.2, type: 'sawtooth' as OscillatorType, vol: 0.08, slide: i === 3 ? 0.9 : 1 })),
  gavel: [{ f: 180, t: 0, d: 0.08, type: 'square', vol: 0.2 }, { f: 160, t: 0.14, d: 0.1, type: 'square', vol: 0.2 }],
  error: [{ f: 196, t: 0, d: 0.12, type: 'square', vol: 0.12 }, { f: 147, t: 0.13, d: 0.2, type: 'square', vol: 0.12 }],
  levelup: [523, 784, 1047, 1568].map((f, i) => ({ f, t: i * 0.07, d: 0.1, type: 'triangle' as OscillatorType, vol: 0.14 })),
  confetti: [{ f: 1200, t: 0, d: 0.05, type: 'triangle' }, { f: 1500, t: 0.05, d: 0.05, type: 'triangle' }, { f: 1800, t: 0.1, d: 0.08, type: 'triangle' }],
};

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private musicOn = true;
  private track: Track = 'menu';
  private audio: Partial<Record<Track, HTMLAudioElement>> = {};
  private unlocked = false;

  /** Must be called from a user gesture (first tap). */
  unlock() {
    if (!this.unlocked) document.addEventListener('visibilitychange', () => this.syncMusic());
    this.unlocked = true;
    this.syncMusic();
    if (this.ctx) { void this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
    this.syncMusic();
  }

  setMusic(on: boolean) { this.musicOn = on; this.syncMusic(); }

  /** Which loop should be playing (title screen vs. in-game). */
  setTrack(t: Track) {
    if (t === this.track) return;
    this.track = t;
    this.syncMusic();
  }

  play(name: string) {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const patch = PATCHES[name];
    if (!patch) return;
    const now = ctx.currentTime;
    for (const v of patch) this.voice(v, now);
  }

  private voice(v: Voice, now: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = v.type ?? 'square';
    o.frequency.setValueAtTime(v.f, now + v.t);
    if (v.slide && v.slide !== 1) o.frequency.exponentialRampToValueAtTime(v.f * v.slide, now + v.t + v.d);
    const vol = v.vol ?? 0.15;
    g.gain.setValueAtTime(0.0001, now + v.t);
    g.gain.exponentialRampToValueAtTime(vol, now + v.t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + v.t + v.d);
    o.connect(g).connect(this.master!);
    o.start(now + v.t);
    o.stop(now + v.t + v.d + 0.02);
  }

  private syncMusic() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    const want = this.unlocked && !this.muted && this.musicOn && document.visibilityState !== 'hidden' ? this.track : null;
    for (const [t, el] of Object.entries(this.audio) as [Track, HTMLAudioElement][]) if (t !== want) el.pause();
    if (!want) return;
    let el = this.audio[want];
    if (!el) {
      el = new Audio(TRACKS[want]);
      el.loop = true;
      el.volume = MUSIC_VOL;
      this.audio[want] = el;
    }
    if (el.paused) void el.play().catch(() => { /* blocked until the next tap */ });
  }
}

export const sfx = new Sfx();
