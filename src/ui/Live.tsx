// LIVE_DAY: the real-time home view (Section 9 layout).
import { useEffect, useRef, useState } from 'preact/hooks';
import { REGION_BLURB } from '../content/regions';
import {
  OBJECTIVE, canConfirm, confirmBatch, confirmCost, confirmHackers, dismissPopup, endLiveDay, resolveAlert,
  treeRegionCount, unconfirmed, type GameState, type RegionId, type TickerItem,
} from '../core';
import { BearMascot } from './art';
import { HypeMap } from './HypeMap';
import { CrewSheet, SponsorsSheet, TechSheet } from './sheets';
import { store } from './store';

type SheetId = 'crew' | 'tech' | 'sponsors' | 'news' | null;

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
      <span class="stat vs" title="Interested · confirmed vs Tree"><span class="b">🙋 {num(s.signups)} · ✅ {num(s.confirmed)}</span><span class="vs-sep">vs</span><span class="t">🌲 {num(s.treeSignups)}</span></span>
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

/** Compact hacker counts: 950, 1.2k, 10k. */
export function num(v: number) {
  const a = Math.round(v);
  return a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(a);
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

/** The news feed at the top. With onOpen, tapping it opens the full feed as a side menu. */
export function Ticker({ items, onOpen }: { items: TickerItem[]; onOpen?: () => void }) {
  const last = items[items.length - 1];
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement) return;
    setShift(Math.min(0, el.parentElement.clientWidth - el.scrollWidth - 16));
  }, [last?.id]);
  const cat = last?.cat.split(' ')[0];
  const body = last && (
    <div class="ticker-track">
      <div key={last.id} ref={ref} class={`ticker-item ${shift < 0 ? 'ticker-scroll' : ''}`} style={{ '--shift': `${shift}px`, '--dur': `${Math.max(4, -shift / 30 + 3)}s` } as Record<string, string>}>
        <span class={`ticker-cat cat-${cat}`}>{last.cat}</span><span>{last.text}</span>
      </div>
    </div>
  );
  if (!onOpen) return <div class="ticker" aria-live="polite">{body}</div>;
  return (
    <button class="ticker ticker-btn" aria-live="polite" aria-label="Open the news feed" onClick={onOpen}>
      {body}<span class="ticker-more">📰 All news ›</span>
    </button>
  );
}

/** Decision events pause the world (Plague Inc style): no countdown, take your time. */
function AlertModal({ s }: { s: GameState }) {
  const a = s.alertQueue[0];
  if (!a || s.courting) return null;
  return (
    <div class="modal-back news-back">
      <div class="news-card" role="alertdialog" aria-label={a.title}>
        <div class="news-kicker">⏸ World paused · Decision</div>
        <h3>{a.title}</h3>
        <p>{a.body}</p>
        <div class="choices">
          {a.choices.map((c, i) => (
            <button key={i} class="btn" disabled={c.disabled} onClick={() => store.act((st) => resolveAlert(st, i))}>
              {c.label}{c.cost ? ` ($${c.cost.toLocaleString('en-US')})` : ''}{c.hint ? <span class="tiny"> · {c.hint}</span> : null}
            </button>
          ))}
        </div>
        {s.alertQueue.length > 1 && <div class="tiny dim">+{s.alertQueue.length - 1} more waiting</div>}
      </div>
    </div>
  );
}

const KICKER = { news: '📰 World news', tree: '🌲 Tree University', rumor: '🗣️ Rumor · tech mutation', milestone: '🐻 Bear Hacks' } as const;

/** News, Tree moves and rumors: a newspaper popup that pauses the world until you tap OK. */
function PopupModal({ s }: { s: GameState }) {
  const p = s.popups[0];
  if (!p || s.alertQueue.length || s.courting) return null;
  return (
    <div class="modal-back news-back" onClick={() => store.act((st) => dismissPopup(st))}>
      <div class={`news-card kind-${p.kind}`} role="alertdialog" aria-label={p.title}>
        <div class="news-kicker">{KICKER[p.kind]}</div>
        <h3><span class="news-icon">{p.icon}</span>{p.title}</h3>
        <p>{p.body}</p>
        {p.effect && <div class="news-effect">{p.effect}</div>}
        <button class="btn btn-gold" onClick={(e) => { e.stopPropagation(); store.act((st) => dismissPopup(st)); }}>OK</button>
      </div>
    </div>
  );
}

/** Money turns interest into confirmed attendees. */
export function ConfirmButton({ s, inline }: { s: GameState; inline?: boolean }) {
  const n = confirmBatch(s);
  const left = unconfirmed(s);
  const label = left <= 0 ? 'Everyone interested is confirmed' : n <= 0 ? `Need $${confirmCost(s)}/hacker` : `✅ Confirm ${num(n)} · $${(n * confirmCost(s)).toLocaleString('en-US')}`;
  return (
    <button class={`btn btn-blue confirm-btn ${inline ? 'inline' : ''}`} disabled={!canConfirm(s)} onClick={() => store.act((st) => confirmHackers(st))}
      title={`${num(left)} interested but unconfirmed · $${confirmCost(s)} each covers food, swag and travel`}>
      {label}<span class="tiny">{num(left)} waiting · ${confirmCost(s)}/hacker</span>
    </button>
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
  'Tap the 💡 bubbles before they pop! They are tech points (TP). Spend them in 🧬 Evolve.',
  'Tap 📱 bubbles to post there. Your social team picks the post; results land in the news.',
  'Interest is free, attendance is not: tap ✅ Confirm to pay for hackers (food, swag, travel).',
  'News and decisions pause the world. Tap the news feed at the top to read everything. Good luck!',
];

/** When each Day 1 tip shows up: at the start, on the first 📱 bubble, once Confirm works, then 20 s in. */
const HINT_READY: ((s: GameState) => boolean)[] = [
  () => true,
  (s) => s.bubbles.some((b) => b.type === 'post'),
  (s) => canConfirm(s),
  (s) => s.t > 20,
];

/** A tip pauses the world until the player taps it away. */
function tipShowing(s: GameState): boolean {
  if (s.phase !== 'live' || s.day !== 1 || s.tutorialStep >= HINTS.length) return false;
  if (s.alertQueue.length || s.popups.length || s.courting) return false;
  return HINT_READY[s.tutorialStep](s);
}

function Tutorial({ s }: { s: GameState }) {
  if (!tipShowing(s)) return null;
  return (
    <div class="hint" role="note">
      <BearMascot size={32} />
      <div class="grow"><span class="hint-paused">⏸ Paused</span> <b>Beary:</b> {HINTS[s.tutorialStep]}</div>
      <button class="btn btn-gold hint-ok" onClick={() => store.act((st) => { st.tutorialStep++; })}>Got it</button>
    </div>
  );
}

/** Plague Inc's bottom bar: how the 10,000 students split between Bear, Tree and undecided. */
export function WorldBar({ s }: { s: GameState }) {
  const total = s.regions.reduce((a, r) => a + r.pop, 0);
  const bear = s.regions.reduce((a, r) => a + r.signups, 0);
  const tree = s.regions.reduce((a, r) => a + r.treeSignups, 0);
  const pb = (bear / total) * 100;
  const pt = (tree / total) * 100;
  return (
    <div class="world">
      <div class="world-bar" aria-hidden="true"><span class="wb-b" style={{ width: `${pb}%` }} /><span class="wb-n" /><span class="wb-t" style={{ width: `${pt}%` }} /></div>
      <div class="world-legend tiny">
        <span><i class="sw sw-b" />Bear {num(bear)}</span>
        <span><i class="sw sw-n" />Undecided {num(Math.max(0, total - bear - tree))}</span>
        <span><i class="sw sw-t" />Tree {num(tree)}</span>
      </div>
    </div>
  );
}

/** Plague Inc's cure bar, but it's Tree University: its hype drives its spread, turnout and judging. */
export function TreeBar({ s }: { s: GameState }) {
  const v = Math.round(s.treeHype);
  const d = Math.round(s.treeHype - Number(s.flags.treeHypeStart ?? s.treeHype));
  return (
    <div class="tree-perf" title="Tree University's performance: how fast it spreads, how many of its signups show up, and how judges rate it.">
      <div class="tree-perf-head tiny"><span>🌲 Tree University performance</span><b>{v}%{d ? <span class={d > 0 ? 'bad' : 'good'}> {d > 0 ? '▲' : '▼'}{Math.abs(d)}</span> : null}</b></div>
      <div class="tree-perf-bar" aria-hidden="true"><span style={{ width: `${v}%` }} /></div>
    </div>
  );
}

const FEED_ICON: Record<string, string> = { 'BEAR BEAT': '🐻', 'TREE TIMES': '🌲', 'SPONSOR WIRE': '💼', CAMPUS: '🏫', BREAKING: '🚨', POSTS: '📱' };

/** Landscape news feed: the newest ticker items, newest first. Post results land here. */
function NewsFeed({ s, limit = 40 }: { s: GameState; limit?: number }) {
  const items = s.ticker.slice(-limit).reverse();
  return (
    <div class="feed">
      <div class="sheet-head"><h3>📰 News feed</h3></div>
      {items.map((t, i) => (
        <div key={t.id} class={`feed-item cat-${t.cat.split(' ')[0]} ${i === 0 ? 'new' : ''}`}><span class="feed-ico">{FEED_ICON[t.cat] ?? '•'}</span><span>{t.text}</span></div>
      ))}
    </div>
  );
}

function RegionInfo({ s, id, close }: { s: GameState; id: RegionId; close: () => void }) {
  const r = s.regions.find((x) => x.id === id)!;
  return (
    <button class="region-info" onClick={close} aria-label="Close region info">
      <div class="row"><b class="grow">{r.name}</b><span class="tiny dim">✕</span></div>
      <div class="tiny dim">{REGION_BLURB[r.id]}</div>
      <div class="tiny">{r.pop.toLocaleString('en-US')} students · conversion ×{r.conv}</div>
      <div class="tiny"><span class="b">🐻 {Math.round(r.bear * 100)}% aware · {num(r.signups)} interested</span></div>
      <div class="tiny"><span class="t">🌲 {Math.round(r.tree * 100)}% aware · {num(r.treeSignups)} with Tree</span></div>
    </button>
  );
}

export function Live({ s }: { s: GameState }) {
  const [sheet, setSheet] = useState<SheetId>(null);
  const [info, setInfo] = useState<RegionId | null>(null);
  const onRegion = (id: RegionId) => setInfo(info === id ? null : id);
  const toggle = (id: SheetId) => setSheet(sheet === id ? null : id);
  // Like Plague Inc, the world stops while you evolve, and while a tip is on screen.
  const tip = tipShowing(s);
  useEffect(() => {
    store.uiModal = sheet === 'tech' ? 'tech' : tip ? 'tip' : null;
    store.emit();
    return () => { store.uiModal = null; };
  }, [sheet, tip]);
  return (
    <>
      <TopBar s={s} />
      <Ticker items={s.ticker} onOpen={() => toggle('news')} />
      <div class="live-body">
        <div class="live-main">
          <div class="portrait-only"><Objective s={s} /></div>
          <Tutorial s={s} />
          <div class="map-wrap">
            <HypeMap s={s} onRegion={onRegion} selected={info} />
            <Toasts />
          </div>
          <div class="strip portrait-only">
            {info ? <RegionInfo s={s} id={info} close={() => setInfo(null)} /> : <div class="bars-col"><WorldBar s={s} /><TreeBar s={s} /></div>}
            <ConfirmButton s={s} inline />
          </div>
        </div>
        <aside class="live-side landscape-only">
          <Objective s={s} />
          <WorldBar s={s} />
          <TreeBar s={s} />
          {info && <RegionInfo s={s} id={info} close={() => setInfo(null)} />}
          <ConfirmButton s={s} inline />
        </aside>
        {sheet && sheet !== 'tech' && (
          <div class={`sheet ${sheet === 'news' ? 'side' : ''}`} role="dialog" aria-label={sheet}>
            <button class="icon-btn sheet-close" aria-label="Close" onClick={() => setSheet(null)}>✕</button>
            {sheet === 'crew' && <CrewSheet s={s} />}
            {sheet === 'sponsors' && <SponsorsSheet s={s} />}
            {sheet === 'news' && <NewsFeed s={s} />}
          </div>
        )}
        {sheet === 'tech' && <TechSheet s={s} close={() => setSheet(null)} />}
      </div>
      <AlertModal s={s} />
      <PopupModal s={s} />
      <div class="dock live-dock">
        <button class={`btn ${sheet === 'crew' ? 'active' : ''}`} onClick={() => toggle('crew')}><span class="ico">👥</span>Crew{s.members.some((m) => !m.task || m.burnout) && <span class="badge">!</span>}</button>
        <button class={`btn ${sheet === 'tech' ? 'active' : ''}`} onClick={() => toggle('tech')}><span class="ico">🧬</span>Evolve{s.techPoints >= 3 && <span class="badge" style={{ background: 'var(--gold)', color: '#000' }}>{s.techPoints}</span>}</button>
        <button class={`btn ${sheet === 'sponsors' ? 'active' : ''}`} onClick={() => toggle('sponsors')}><span class="ico">💼</span>Sponsors</button>
        <button class="btn btn-gold" onClick={() => { setSheet(null); store.act((st) => endLiveDay(st, true)); }}><span class="ico">🌙</span>End Day</button>
      </div>
    </>
  );
}
