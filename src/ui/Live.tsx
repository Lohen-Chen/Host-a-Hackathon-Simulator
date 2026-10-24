// LIVE_DAY: the real-time home view (Section 9 layout).
import { useEffect, useRef, useState } from 'preact/hooks';
import { REGION_BLURB } from '../content/regions';
import {
  OBJECTIVE, canRespond, chargesLeft, endLiveDay, firePost, resolveAlert, respondTreeMove, treeRegionCount,
  type GameState, type RegionId, type TickerItem,
} from '../core';
import { T } from '../core/config';
import { BearMascot } from './art';
import { HypeMap } from './HypeMap';
import { CrewSheet, PostsSheet, SponsorsSheet, TechSheet } from './sheets';
import { store } from './store';
import { WebsitePreview } from './WebsitePreview';

type SheetId = 'crew' | 'posts' | 'tech' | 'sponsors' | null;

export function TopBar({ s }: { s: GameState }) {
  const frac = s.phase === 'live' ? s.t / s.daySec : 0;
  return (
    <div class="topbar">
      <span class="stat"><b>Day {s.day}/7</b></span>
      <span class="clock" style={{ background: `conic-gradient(var(--gold) ${frac * 360}deg, #24324a 0)` }} aria-label={`Day ${Math.round(frac * 100)}% done`}>
        <span style={{ background: '#0b1220', borderRadius: '50%', width: '20px', height: '20px', display: 'grid', placeItems: 'center' }}>{s.step}</span>
      </span>
      <span class="stat">💰 {money(s.budget)}</span>
      <span class="stat">🔬 {s.techPoints}</span>
      <span class="stat">⭐ {Math.round(s.reputation)}</span>
      <span class="stat vs"><span class="b">🐻 {Math.round(s.signups)}</span> vs <span class="t">🌲 {Math.round(s.treeSignups)}</span></span>
      <span class="grow" />
      <MuteButton />
      <button class="icon-btn" aria-label="Pause" onClick={() => { store.paused = true; store.emit(); }}>⏸</button>
    </div>
  );
}

export function money(v: number) {
  const a = Math.abs(v);
  const str = a >= 10000 ? `${(a / 1000).toFixed(1)}k` : Math.round(a).toLocaleString('en-US');
  return `${v < 0 ? '−' : ''}$${str}`;
}

export function MuteButton() {
  const muted = store.settings.muted;
  return <button class="icon-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => store.setSettings({ muted: !muted })}>{muted ? '🔇' : '🔊'}</button>;
}

export function Objective({ s }: { s: GameState }) {
  return (
    <div class="objective"><span>🎯 {OBJECTIVE}</span><span class="dim">Tree controls {treeRegionCount(s)}/8</span></div>
  );
}

export function Ticker({ items }: { items: TickerItem[] }) {
  const last = items[items.length - 1];
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement) return;
    setShift(Math.min(0, el.parentElement.clientWidth - el.scrollWidth - 16));
  }, [last?.id]);
  if (!last) return <div class="ticker" />;
  const cat = last.cat.split(' ')[0];
  return (
    <div class="ticker" aria-live="polite">
      <div key={last.id} ref={ref} class={`ticker-item ${shift < 0 ? 'ticker-scroll' : ''}`} style={{ '--shift': `${shift}px`, '--dur': `${Math.max(4, -shift / 30 + 3)}s` } as Record<string, string>}>
        <span class={`ticker-cat cat-${cat}`}>{last.cat}</span><span>{last.text}</span>
      </div>
    </div>
  );
}

function AlertToast({ s }: { s: GameState }) {
  const a = s.alertQueue[0];
  if (!a) return null;
  const frac = Math.max(0, a.remaining / a.seconds);
  return (
    <div class="alert" role="alertdialog" aria-label={a.title}>
      {s.alertQueue.length > 1 && <span class="chip queue-chip">+{s.alertQueue.length - 1} queued</span>}
      <div class="countdown"><div style={{ width: `${frac * 100}%` }} /></div>
      <h3><span>🚨</span><span>{a.title}</span></h3>
      <p>{a.body}</p>
      <div class="choices">
        {a.choices.map((c, i) => (
          <button key={i} class={`btn ${i === a.defaultChoice ? 'def' : ''}`} disabled={c.disabled} onClick={() => store.act((st) => resolveAlert(st, i))}>
            {c.label}{c.cost ? ` ($${c.cost.toLocaleString('en-US')})` : ''}{c.hint ? <span class="tiny"> · {c.hint}</span> : null}
            {i === a.defaultChoice && <span class="tiny"> · default if time runs out</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function TreeMoveCard({ s }: { s: GameState }) {
  const m = s.treeMove;
  if (!m || s.alertQueue.length) return null;
  const frac = Math.max(0, m.remaining / (T.treeWindow * (s.settings.relaxed ? 2 : 1)));
  return (
    <div class="alert tree" role="alertdialog" aria-label={`Tree move: ${m.name}`}>
      <div class="countdown"><div style={{ width: `${frac * 100}%`, background: 'var(--tree)' }} /></div>
      <h3><span>🌲</span><span>TREE MOVE: {m.name}</span></h3>
      <p>{m.text}</p>
      <div class="choices">
        <button class="btn" disabled={!canRespond(s, 'counter')} onClick={() => store.act((st) => respondTreeMove(st, 'counter'))}>Counter-programming ($500) · halves it</button>
        <button class="btn" disabled={!canRespond(s, 'clapback')} onClick={() => store.act((st) => respondTreeMove(st, 'clapback'))}>Clapback (uses a post charge) · −Tree hype</button>
        <button class="btn def" onClick={() => store.act((st) => respondTreeMove(st, 'ignore'))}>Ignore</button>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = store.fx.filter((f) => f.kind === 'toast').slice(-3);
  const ms = store.fx.filter((f) => f.kind === 'milestone').slice(-1)[0];
  return (
    <>
      <div class="toasts">{toasts.map((t) => <div key={t.id} class={`toast ${t.tone ?? ''}`}>{t.text}</div>)}</div>
      {ms && <div key={ms.id} class={`milestone ${ms.tone === 'bad' ? 'bad' : ''}`}>{ms.text}</div>}
    </>
  );
}

const HINTS = [
  'Tap a floating bubble before it pops! 💵💡🍕 (🔥 and 🕵️ are hazards: tap those too.)',
  'Open 📣 Posts, tap a card, then tap a region on the map to fire it.',
  'Open 👥 Crew, tap a member, then tap a task. Specialties are green.',
  'Alerts have a countdown. Pick fast, or the default happens. Good luck!',
];

function Tutorial({ s }: { s: GameState }) {
  if (s.day !== 1 || s.tutorialStep >= 4) return null;
  if (s.alertQueue.length || s.treeMove) return null;
  return (
    <div class="hint" role="note">
      <BearMascot size={32} />
      <div class="grow"><b>Beary:</b> {HINTS[s.tutorialStep]}</div>
      <button class="icon-btn" aria-label="Next hint" onClick={() => store.act((st) => { st.tutorialStep++; })}>✕</button>
    </div>
  );
}

export function Live({ s }: { s: GameState }) {
  const [sheet, setSheet] = useState<SheetId>(null);
  const [info, setInfo] = useState<RegionId | null>(null);
  const onRegion = (id: RegionId) => {
    if (s.armedPost !== null) {
      store.act((st) => { firePost(st, st.armedPost!, id); if (st.tutorialStep === 1) st.tutorialStep = 2; });
      return;
    }
    setInfo(info === id ? null : id);
  };
  const toggle = (id: SheetId) => setSheet(sheet === id ? null : id);
  const r = info ? s.regions.find((x) => x.id === info) : null;
  return (
    <>
      <TopBar s={s} />
      <Objective s={s} />
      <Ticker items={s.ticker} />
      <div class="map-wrap">
        <HypeMap s={s} onRegion={onRegion} />
        <div class="site-mini" onClick={() => setSheet('crew')}>{s.unlockedTech.includes('website') && <WebsitePreview score={s.websiteScore} />}</div>
        <Tutorial s={s} />
        <Toasts />
      </div>
      {r && !sheet && !s.alertQueue.length && (
        <div class="toasts" style={{ top: 'auto', bottom: 'calc(var(--dock-h) + 12px)', pointerEvents: 'auto' }}>
          <div class="toast" style={{ animation: 'none' }} onClick={() => setInfo(null)}>
            <b>{r.name}</b> · pop {r.pop} · conv ×{r.conv} · {REGION_BLURB[r.id]}<br />
            🐻 {Math.round(r.bear * 100)}% · 🌲 {Math.round(r.tree * 100)}% · {Math.round(r.signups)} signups
          </div>
        </div>
      )}
      {sheet && (
        <div class="sheet" role="dialog" aria-label={sheet}>
          {sheet === 'crew' && <CrewSheet s={s} />}
          {sheet === 'posts' && <PostsSheet s={s} close={() => setSheet(null)} />}
          {sheet === 'tech' && <TechSheet s={s} />}
          {sheet === 'sponsors' && <SponsorsSheet s={s} />}
        </div>
      )}
      <AlertToast s={s} />
      <TreeMoveCard s={s} />
      <div class="dock" style={{ height: 'calc(var(--dock-h) + var(--safe-b))' }}>
        <button class={`btn ${sheet === 'crew' ? 'active' : ''}`} onClick={() => toggle('crew')}><span class="ico">👥</span>Crew{s.members.some((m) => !m.task) && <span class="badge">!</span>}</button>
        <button class={`btn ${sheet === 'posts' ? 'active' : ''}`} onClick={() => toggle('posts')}><span class="ico">📣</span>Posts <span class="badge" style={{ background: chargesLeft(s) ? 'var(--bear)' : '#444' }}>{chargesLeft(s)}</span></button>
        <button class={`btn ${sheet === 'tech' ? 'active' : ''}`} onClick={() => toggle('tech')}><span class="ico">🔬</span>Tech</button>
        <button class={`btn ${sheet === 'sponsors' ? 'active' : ''}`} onClick={() => toggle('sponsors')}><span class="ico">💼</span>Sponsors</button>
        <button class="btn btn-gold" onClick={() => { setSheet(null); store.act((st) => endLiveDay(st, true)); }}><span class="ico">🌙</span>End Day</button>
      </div>
    </>
  );
}
