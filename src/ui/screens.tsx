// Title, intro, morning, night recap and pause screens.
import { useEffect, useState } from 'preact/hooks';
import { MODES, OBJECTIVE, TITLE, beginGame, burnoutChance, candidateCount, hire, hireCost, jokeEngine, startLiveDay, nextDay, type GameState, type Mode } from '../core';
import { ROLE_INFO, TASK_INFO, TRAITS } from '../content/members';
import { sfx } from '../audio/sfx';
import { Avatar, BearMascot, TreeMascot } from './art';
import { CrewSheet } from './sheets';
import { store } from './store';
import { ConfirmButton, MuteButton, Ticker, TopBar } from './Live';
import { flavor } from './flavor';
import { FullscreenButton } from './fullscreen';

function loadingLine(): string {
  const e = jokeEngine();
  return e?.pick('loading', { rng: Math.random }) ?? 'Loading… (the venue WiFi would still be "connecting")';
}

export function Title({ offlineReady }: { offlineReady: boolean }) {
  const [line, setLine] = useState(loadingLine);
  const [hasSave] = useState(() => store.hasSave());
  useEffect(() => { const t = setInterval(() => setLine(loadingLine()), 3500); return () => clearInterval(t); }, []);
  const params = new URLSearchParams(location.search);
  const seedParam = params.get('seed');
  const start = (mode: Mode) => {
    sfx.unlock();
    store.newGame(mode, seedParam ? Number(seedParam) : undefined);
  };
  return (
    <div class="title-screen">
      <div class="title-vs"><BearMascot size={72} /><span>VS</span><TreeMascot size={72} /></div>
      <h1 class="title-logo">{TITLE}</h1>
      <div class="small">You are the president of a club at Bear University. Tree University is hosting a hackathon the same weekend. 🎯 {OBJECTIVE}</div>
      <div class="mode-btns">
        {hasSave && <button class="btn btn-blue btn-big" onClick={() => { sfx.unlock(); store.continueGame(); }}>▶ Continue</button>}
        <button class="btn btn-big btn-gold" onClick={() => start('standard')}>▶ Play · {MODES.standard.label}</button>
      </div>
      <div class="toggles">
        <button class="tab" onClick={() => store.setSettings({ music: !store.settings.music })}>🎵 Music: {store.settings.music ? 'on' : 'off'}</button>
        <MuteButton />
        <FullscreenButton className="tab" />
      </div>
      <div class="loading-line">{line}</div>
      {offlineReady ? <span class="chip chip-good">Offline ready ✓</span> : <span class="chip">Caching for offline…</span>}
      <div class="footer-note">Best experienced offline. We tested the venue WiFi. We're sorry.</div>
      {seedParam && <div class="tiny dim">Seed {seedParam}</div>}
    </div>
  );
}

const INTRO = [
  { icon: <BearMascot size={64} />, text: 'You are the president of a club at Bear University. You will host the greatest hackathon of all time.' },
  { icon: <TreeMascot size={64} />, text: 'Tree University is hosting one the SAME weekend. Their president, Leland Sr., is on his phone. He says "synergy."' },
  { icon: <span style={{ fontSize: '54px' }}>🗺️</span>, text: 'Bear Hacks spreads across the country like a virus. 10,000 students. Tap 📱 bubbles to post in regions, tap 💡 bubbles for tech points, evolve your Hype, Organization and Talent.' },
  { icon: <span style={{ fontSize: '54px' }}>✅</span>, text: 'Interest is free. Attendance is not. Spend your budget (and sponsor money) to confirm hackers. Seven days. Go.' },
];

export function Intro({ s }: { s: GameState }) {
  const [i, setI] = useState(0);
  const next = () => (i < INTRO.length - 1 ? setI(i + 1) : store.act((st) => beginGame(st)));
  useEffect(() => { const t = setTimeout(next, 6000); return () => clearTimeout(t); }, [i]);
  void s;
  return (
    <div class="scene center" onClick={next} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div class="beat" key={i}>
        <div>{INTRO[i].icon}</div>
        <p style={{ maxWidth: '360px', fontSize: '16px' }}>{INTRO[i].text}</p>
      </div>
      <div class="row"><button class="btn btn-gold" onClick={(e) => { e.stopPropagation(); next(); }}>{i < INTRO.length - 1 ? 'Next' : "Let's go"}</button>
        <button class="btn btn-ghost" onClick={(e) => { e.stopPropagation(); store.act((st) => beginGame(st)); }}>Skip</button></div>
    </div>
  );
}

export function Morning({ s }: { s: GameState }) {
  const cost = hireCost(s);
  const risk = Math.round(burnoutChance(s) * 100);
  const tease = s.ticker.filter((t) => t.cat === 'TREE TIMES').slice(-1)[0];
  return (
    <>
      <TopBar s={s} />
      <Ticker items={s.ticker} />
      <div class="scene">
        <h2>☀️ Day {s.day} · Morning</h2>
        {tease && <div class="speech"><b>🌲 TREE TIMES:</b> {tease.text}</div>}
        <div class="row"><h3 class="grow">Candidates ({s.candidates.length}/{candidateCount(s)})</h3><span class="small dim">next hire ${cost} · crew {s.members.length} · burnout risk {risk}%/night</span></div>
        <div class="carousel">
          {s.candidates.map((c, i) => (
            <div key={c.id} class="card cand col">
              <div class="row"><Avatar seed={c.avatarSeed} size={44} /><div><b>{c.name}</b><div class="tiny">{ROLE_INFO[c.role].icon} {ROLE_INFO[c.role].name} · skill {c.baseSkill}</div></div></div>
              <div class="tiny"><b>{TRAITS[c.trait].name}</b>: {TRAITS[c.trait].desc}</div>
              <div class="tiny dim">{c.bio}</div>
              <button class="btn btn-blue" disabled={s.budget < cost} onClick={() => store.act((st) => hire(st, i))}>Hire (${cost})</button>
            </div>
          ))}
          {s.candidates.length === 0 && <div class="dim small">Nobody else applied. Unlock Club Prestige or put a Recruiter on Recruit.</div>}
        </div>
        <ConfirmButton s={s} inline />
        <CrewSheet s={s} />
      </div>
 <div class="dock" style={{ gridTemplateColumns: '1fr' }}>
        <button class="btn btn-gold btn-big" style={{ display: 'block' }} onClick={() => { sfx.unlock(); store.act((st) => startLiveDay(st)); }}>▶ Start Day {s.day}</button>
      </div>
    </>
  );
}

const LINE_MS = 380;
const CARD_MS = 700;

/** The end-of-day tally: lines count up one at a time with a tick, the best stat gets stamped, then crew level-ups. */
export function Night({ s }: { s: GameState }) {
  const ups = s.levelUps ?? [];
  const stamp = s.recapStamp;
  // A beat per recap line, then the stamp, then one per level-up card.
  const beats: { at: number; sound: string }[] = [];
  for (let i = 1; i < s.recap.length; i++) beats.push({ at: i * LINE_MS, sound: 'tick' });
  let at = s.recap.length * LINE_MS;
  if (stamp) beats.push({ at: (at += 150), sound: 'stamp' });
  for (let i = 0; i < ups.length; i++) beats.push({ at: (at += i ? CARD_MS : 400), sound: 'levelup' });
  const [shown, setShown] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const done = shown >= beats.length;
  useEffect(() => { store.save(); sfx.play('tick'); }, [s.day]);
  useEffect(() => {
    if (done) { const a = setTimeout(() => store.act((st) => nextDay(st)), 4500); return () => clearTimeout(a); }
    const timer = setTimeout(() => { sfx.play(beats[shown].sound); setShown(shown + 1); }, beats[shown].at - (beats[shown - 1]?.at ?? 0));
    return () => clearTimeout(timer);
  }, [shown, done, s.day]);
  const lines = Math.min(s.recap.length, shown + 1);
  const stamped = !!stamp && shown >= s.recap.length;
  const cards = Math.max(0, shown - (s.recap.length - 1) - (stamp ? 1 : 0));
  return (
    <div class="scene" style={{ justifyContent: 'center' }} onClick={() => (done ? store.act((st) => nextDay(st)) : (setSkipped(true), setShown(beats.length)))}>
      <div class="card beat">
        <h2>🌙 Night {s.day}</h2>
        <ul class="recap small" style={{ textAlign: 'left', paddingLeft: '18px' }}>
          {s.recap.slice(0, lines).map((l, i) => (
            <li key={i} class="tally-line">
              <CountUp line={l} instant={skipped} />
              {stamped && stamp.line === i && <span class="stamp">{stamp.text}</span>}
            </li>
          ))}
        </ul>
        {ups.slice(0, cards).map((u) => (
          <div key={u.memberId} class="levelup-card row">
            <Avatar seed={u.avatarSeed} size={34} />
            <div class="grow small"><b>{u.name}</b> ({ROLE_INFO[u.role].name}) got better at {TASK_INFO[u.task].name} <b class="lv">(+1)</b><div class="tiny dim">Skill {u.from} → {u.to}. Practice makes slightly less chaotic.</div></div>
          </div>
        ))}
        <div class="tiny dim">{!done ? 'Tap to skip' : s.day >= 7 ? 'Tap to start HACKATHON DAY.' : 'Tap to continue.'}</div>
      </div>
    </div>
  );
}

/** A recap line whose first number counts up from zero. */
function CountUp({ line, instant }: { line: string; instant?: boolean }) {
  const m = /\d[\d,]*/.exec(line);
  const target = m ? Number(m[0].replace(/,/g, '')) : 0;
  const [p, setP] = useState(instant || !m ? 1 : 0);
  useEffect(() => {
    if (p >= 1) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => { const q = Math.min(1, (performance.now() - t0) / 340); setP(q); if (q < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!m) return <>{line}</>;
  const v = Math.round(target * (1 - (1 - p) ** 3));
  return <>{line.slice(0, m.index)}<b class="tally-num">{v.toLocaleString('en-US')}</b>{line.slice(m.index + m[0].length)}</>;
}

export function PauseMenu() {
  return (
    <div class="modal-back">
      <div class="card modal col">
        <h2>⏸ Paused</h2>
        <div class="small dim">The clock is stopped. Tree University is also, presumably, on a break.</div>
        <button class="btn btn-gold" onClick={() => { store.paused = false; store.emit(); }}>▶ Resume</button>
        <button class="btn" onClick={() => store.setSettings({ music: !store.settings.music })}>🎵 Music: {store.settings.music ? 'on' : 'off'}</button>
        <FullscreenButton />
        <button class="btn btn-red" onClick={() => { store.paused = false; store.save(); store.quit(); }}>Quit to title</button>
        <div class="tiny dim">Seed {store.state?.seed} · {store.state ? flavor(store.state, 'loading', 'pause') : ''}</div>
      </div>
    </div>
  );
}
