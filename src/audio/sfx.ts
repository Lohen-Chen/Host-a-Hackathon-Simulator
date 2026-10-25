// Audio: SFX are synthesized with WebAudio placeholders (swap in CC0 samples later, docs/CREDITS.md).
// Music is two looping tracks: one for the title screen, one for the game. They play through WebAudio
// buffers so the loop is gapless (an <audio loop> element stutters at the seam and MP3 padding adds silence).
import gameUrl from './BG_Music.mp3';
import menuUrl from './Menu_Screen_Music.mp3';

export type Track = 'menu' | 'game';
const TRACKS: Record<Track, string> = { menu: menuUrl, game: gameUrl };
const MUSIC_VOL = 0.35;
/** MP3 encoder delay and real length in samples at 44.1 kHz (from each file's iTunSMPB tag), so the loop skips the padding. */
const GAPLESS: Record<Track, { delay: number; frames: number }> = {
  game: { delay: 0x210, frames: 0x2affc6 },
  menu: { delay: 0x210, frames: 0x6271a },
};
type Voice = { f: number; t: number; d: number; type?: OscillatorType; slide?: number; vol?: number };

const PATCHES: Record<string, Voice[]> = {
  tap: [{ f: 660, t: 0, d: 0.05, type: 'square', vol: 0.12 }],
  tick: [{ f: 1400, t: 0, d: 0.025, type: 'square', vol: 0.05 }],
  stamp: [{ f: 110, t: 0, d: 0.09, type: 'square', vol: 0.22 }, { f: 70, t: 0.03, d: 0.12, type: 'triangle', vol: 0.2 }],
  coin: [{ f: 1568, t: 0, d: 0.05, type: 'square', vol: 0.06 }, { f: 2093, t: 0.04, d: 0.08, type: 'square', vol: 0.06 }],
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
  private musicGain: GainNode | null = null;
  private buffers: Partial<Record<Track, AudioBuffer>> = {};
  private loading: Partial<Record<Track, Promise<AudioBuffer | null>>> = {};
  private source: { track: Track; node: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** Fallback when WebAudio is unavailable. */
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;

  /** Must be called from a user gesture (first tap). */
  unlock() {
    if (!this.unlocked) document.addEventListener('visibilitychange', () => this.syncMusic());
    this.unlocked = true;
    if (this.ctx) { void this.ctx.resume(); this.syncMusic(); return; }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.ctx.destination);
    } catch { this.ctx = null; }
    this.syncMusic();
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

  /** pitch multiplies every voice's frequency (a streak can climb). */
  play(name: string, pitch = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const patch = PATCHES[name];
    if (!patch) return;
    const now = ctx.currentTime;
    for (const v of patch) this.voice(pitch === 1 ? v : { ...v, f: v.f * pitch }, now);
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
    const on = this.unlocked && !this.muted && this.musicOn && document.visibilityState !== 'hidden';
    if (!this.ctx || !this.musicGain) { this.syncElement(on); return; }
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(on ? MUSIC_VOL : 0, now, 0.08);
    if (on) void this.playTrack(this.track);
  }

  /** Decode a track once; later calls reuse the buffer. */
  private load(track: Track): Promise<AudioBuffer | null> {
    const ctx = this.ctx!;
    this.loading[track] ??= fetch(TRACKS[track])
      .then((r) => r.arrayBuffer())
      .then((b) => new Promise<AudioBuffer>((res, rej) => { void ctx.decodeAudioData(b, res, rej); }))
      .then((buf) => (this.buffers[track] = buf))
      .catch(() => null);
    return this.loading[track]!;
  }

  /** Start `track` looping (crossfading from the current one). */
  private async playTrack(track: Track) {
    if (this.source?.track === track) return;
    const buf = this.buffers[track] ?? (await this.load(track));
    const ctx = this.ctx;
    if (!buf || !ctx || !this.musicGain || this.track !== track || this.source?.track === track) return;
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    // Skip the encoder delay and end padding if the decoder kept them (Chrome strips them itself; others may not).
    const g = GAPLESS[track];
    const scale = buf.sampleRate / 44100;
    if (buf.length > (g.frames + 64) * scale) {
      node.loopStart = (g.delay * scale) / buf.sampleRate;
      node.loopEnd = ((g.delay + g.frames) * scale) / buf.sampleRate;
    }
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1, now + 0.4);
    node.connect(gain).connect(this.musicGain);
    node.start(now, node.loopStart);
    const old = this.source;
    this.source = { track, node, gain };
    if (old) {
      old.gain.gain.setTargetAtTime(0.0001, now, 0.12);
      old.node.stop(now + 0.6);
    }
  }

  /** No WebAudio: fall back to a plain looping <audio> element. */
  private syncElement(on: boolean) {
    if (!on) { this.audio?.pause(); return; }
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.volume = MUSIC_VOL;
    }
    const el = this.audio;
    if (el.dataset.track !== this.track) {
      el.dataset.track = this.track;
      el.src = TRACKS[this.track];
    }
    // If the browser still blocks it, the next tap (unlock) tries again.
    if (el.paused) void el.play().catch(() => {});
  }
}

export const sfx = new Sfx();
