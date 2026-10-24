// Placeholder art (procedural SVG). The author will replace Bear, Tree, the Blue
// Screen face and avatar parts with hand-drawn pixel sprites (see docs/CREDITS.md).

export function BearMascot({ size = 64, mood = 'happy' }: { size?: number; mood?: 'happy' | 'sad' | 'smug' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" shape-rendering="crispEdges" aria-label="Beary the Bear" role="img">
      <rect x="4" y="3" width="7" height="7" fill="#7a4a1e" />
      <rect x="21" y="3" width="7" height="7" fill="#7a4a1e" />
      <rect x="6" y="5" width="3" height="3" fill="#c98b4f" />
      <rect x="23" y="5" width="3" height="3" fill="#c98b4f" />
      <rect x="5" y="7" width="22" height="20" fill="#8b5a2b" />
      <rect x="3" y="10" width="26" height="14" fill="#8b5a2b" />
      <rect x="10" y="17" width="12" height="8" fill="#d9a066" />
      <rect x="14" y="17" width="4" height="3" fill="#2b1a0e" />
      <rect x="9" y="12" width="3" height="3" fill="#111" />
      <rect x="20" y="12" width="3" height="3" fill="#111" />
      {mood === 'sad' ? <rect x="13" y="22" width="6" height="1" fill="#2b1a0e" /> : <rect x="12" y="21" width="8" height="2" fill="#2b1a0e" />}
      {mood === 'smug' && <rect x="7" y="11" width="18" height="2" fill="#003262" />}
      <rect x="5" y="27" width="22" height="4" fill="#003262" />
      <rect x="14" y="27" width="4" height="4" fill="#fdb515" />
    </svg>
  );
}

export function TreeMascot({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" shape-rendering="crispEdges" aria-label="Tree University mascot" role="img">
      <rect x="12" y="2" width="8" height="4" fill="#1f7a3a" />
      <rect x="8" y="6" width="16" height="6" fill="#1f7a3a" />
      <rect x="5" y="12" width="22" height="8" fill="#22863f" />
      <rect x="3" y="20" width="26" height="5" fill="#1f7a3a" />
      <rect x="9" y="13" width="14" height="3" fill="#111" />
      <rect x="10" y="14" width="4" height="1" fill="#555" />
      <rect x="18" y="14" width="4" height="1" fill="#555" />
      <rect x="13" y="18" width="6" height="1" fill="#0b3b1b" />
      <rect x="14" y="25" width="4" height="6" fill="#6b3f1d" />
      <rect x="22" y="22" width="4" height="7" fill="#8c1515" />
      <rect x="23" y="23" width="2" height="2" fill="#ccc" />
    </svg>
  );
}

export function BlueScreen({ big = false }: { big?: boolean }) {
  return (
    <div class={`bsod ${big ? 'bsod-big' : ''}`} role="img" aria-label="Blue screen with a sad face">
      <div class="bsod-face">:(</div>
      {big && <div class="bsod-text">Your hackathon ran into a problem and needs to restart.</div>}
    </div>
  );
}

const SKIN = ['#f5d0a9', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0662b'];
const HAIR = ['#2b1a0e', '#6b3f1d', '#d4a017', '#111', '#b5651d', '#8c1515', '#4b0082', '#ff69b4'];
const SHIRT = ['#003262', '#fdb515', '#3b7ea1', '#c4820e', '#46535e', '#00a598', '#ee1f60', '#859438'];

function hash(n: number, k: number) {
  let h = (n ^ (k * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  return (h ^ (h >>> 12)) >>> 0;
}

/** Procedural avatar from `avatarSeed` (hair/shirt/accessory palettes). */
export function Avatar({ seed, size = 40 }: { seed: number; size?: number }) {
  const skin = SKIN[hash(seed, 1) % SKIN.length];
  const hair = HAIR[hash(seed, 2) % HAIR.length];
  const shirt = SHIRT[hash(seed, 3) % SHIRT.length];
  const style = hash(seed, 4) % 4;
  const acc = hash(seed, 5) % 5;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="2" y="12" width="12" height="4" fill={shirt} />
      <rect x="4" y="3" width="8" height="9" fill={skin} />
      {style === 0 && <rect x="4" y="2" width="8" height="3" fill={hair} />}
      {style === 1 && <><rect x="3" y="2" width="10" height="3" fill={hair} /><rect x="3" y="5" width="2" height="5" fill={hair} /><rect x="11" y="5" width="2" height="5" fill={hair} /></>}
      {style === 2 && <><rect x="5" y="1" width="6" height="2" fill={hair} /><rect x="4" y="3" width="8" height="1" fill={hair} /></>}
      {style === 3 && <rect x="4" y="3" width="8" height="1" fill={hair} />}
      <rect x="6" y="6" width="1" height="2" fill="#111" />
      <rect x="9" y="6" width="1" height="2" fill="#111" />
      <rect x="7" y="10" width="2" height="1" fill="#7a3b2e" />
      {acc === 1 && <><rect x="5" y="6" width="3" height="2" fill="none" stroke="#111" stroke-width="0.6" /><rect x="8" y="6" width="3" height="2" fill="none" stroke="#111" stroke-width="0.6" /></>}
      {acc === 2 && <><rect x="3" y="5" width="1" height="4" fill="#333" /><rect x="12" y="5" width="1" height="4" fill="#333" /><rect x="3" y="2" width="10" height="1" fill="#333" /></>}
      {acc === 3 && <rect x="3" y="1" width="10" height="2" fill="#fdb515" />}
    </svg>
  );
}
