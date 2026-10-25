// Title, intro, morning, night recap and pause screens.
import { useEffect, useState } from 'preact/hooks';
import { MODES, OBJECTIVE, TITLE, beginGame, burnoutChance, candidateCount, hire, hireCost, jokeEngine, startLiveDay, nextDay, type GameState, type Mode } from '../core';
import { ROLE_INFO, TRAITS } from '../content/members';
import { sfx } from '../audio/sfx';
import { Avatar, BearMascot, TreeMascot } from './art';
import { CrewSheet } from './sheets';
import { store } from './store';
import { ConfirmButton, MuteButton, Ticker, TopBar } from './Live';
import { flavor } from './flavor';

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
  { icon: <TreeMascot size={64} />, text: 'Tree University is hosting one the SAME weekend. Their CEO, Leland Sr., is on his phone. He says "synergy."' },
  { icon: <span style={{ fontSize: '54px' }}>🗺️</span>, text: 'Bear Hacks spreads across the country like a virus. 10,000 students. Tap 📱 bubbles to post in regions, tap 💡 bubbles for tech points, evolve your Hype, Talent and Conversion.' },
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

export function Night({ s }: { s: GameState }) {
  useEffect(() => { store.save(); const t = setTimeout(() => store.act((st) => nextDay(st)), 4500); return () => clearTimeout(t); }, [s.day]);
  return (
    <div class="scene" style={{ justifyContent: 'center' }} onClick={() => store.act((st) => nextDay(st))}>
      <div class="card beat">
        <h2>🌙 Night {s.day}</h2>
        <ul class="recap small" style={{ textAlign: 'left', paddingLeft: '18px' }}>{s.recap.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <div class="tiny dim">{s.day >= 7 ? 'Tap to start HACKATHON DAY.' : 'Tap to continue.'}</div>
      </div>
    </div>
  );
}

export function PauseMenu() {
  return (
    <div class="modal-back">
      <div class="card modal col">
        <h2>⏸ Paused</h2>
        <div class="small dim">The clock is stopped. Tree University is also, presumably, on a break.</div>
        <button class="btn btn-gold" onClick={() => { store.paused = false; store.emit(); }}>▶ Resume</button>
        <button class="btn" onClick={() => store.setSettings({ music: !store.settings.music })}>🎵 Music: {store.settings.music ? 'on' : 'off'}</button>
        <button class="btn btn-red" onClick={() => { store.paused = false; store.save(); store.quit(); }}>Quit to title</button>
        <div class="tiny dim">Seed {store.state?.seed} · {store.state ? flavor(store.state, 'loading', 'pause') : ''}</div>
      </div>
    </div>
  );
}
