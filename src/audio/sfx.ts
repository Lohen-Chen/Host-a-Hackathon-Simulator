// Placeholder audio: every SFX and the music loop are synthesized with WebAudio,
// so the bundle ships zero audio files. Swap in CC0 samples later (docs/CREDITS.md).
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

const MELODY = [0, 4, 7, 12, 7, 4, 2, 5, 9, 14, 9, 5, 0, 4, 7, 11];

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private musicOn = true;
  private musicTimer = 0;
  private beat = 0;

  /** Must be called from a user gesture (first tap). */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
      this.syncMusic();
    } catch { this.ctx = null; }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
    this.syncMusic();
  }

  setMusic(on: boolean) { this.musicOn = on; this.syncMusic(); }

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
    if (typeof window === 'undefined') return;
    window.clearInterval(this.musicTimer);
    if (!this.ctx || this.muted || !this.musicOn) return;
    // A tiny chiptune arpeggio (placeholder for a CC0 loop).
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || document.visibilityState === 'hidden') return;
      const n = MELODY[this.beat++ % MELODY.length];
      const bass = this.beat % 4 === 1;
      this.voice({ f: 262 * Math.pow(2, n / 12), t: 0, d: 0.14, type: 'triangle', vol: 0.035 }, this.ctx.currentTime);
      if (bass) this.voice({ f: 65.4 * Math.pow(2, MELODY[(this.beat >> 2) * 4 % MELODY.length] / 12), t: 0, d: 0.3, type: 'square', vol: 0.025 }, this.ctx.currentTime);
    }, 190);
  }
}

export const sfx = new Sfx();
