// Results: election-night reveal (turnout counters, then each judging category Bear vs Tree), then grade,
// build summary, awards and the final map.
import { useEffect, useState } from 'preact/hooks';
import { BRANCHES } from '../content/techTree';
import { VENUE_BY_ID } from '../content/venues';
import { bar, buildSplit, treeRegionCount, type GameState } from '../core';
import { BearMascot, TreeMascot } from '../ui/art';
import { MapSvg } from '../ui/HypeMap';
import { shareOrDownload } from '../ui/shareCard';
import { store } from '../ui/store';

const COUNT_MS = 2600;
const CATEGORY_MS = 650;

export function Results({ s }: { s: GameState }) {
  const r = s.results!;
  const cats = r.bear.categories;
  // 0..1 while the turnout counters run, then 1 + the number of categories revealed; past the last = done.
  const [step, setStep] = useState(0);
  const done = step > cats.length;
  useEffect(() => { store.save(); }, []);
  useEffect(() => {
    if (done) return;
    if (step < 1) {
      const t0 = performance.now() - step * COUNT_MS;
      let raf = 0;
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / COUNT_MS);
        setStep(p);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => setStep(Math.floor(step) + 1), CATEGORY_MS);
    return () => clearTimeout(t);
  }, [step >= 1 ? Math.floor(step) : -1, done]);

  const count = Math.min(1, step);
  const ease = 1 - (1 - count) ** 3;
  const shown = done ? cats.length : step >= 1 ? Math.floor(step) : 0;
  const bearCount = Math.round(r.attendees * ease);
  const treeCount = Math.round(r.treeAttendees * ease);
  const split = buildSplit(s);
  const treeStat = { hype: s.treeHype, org: s.treeOrg, talent: s.treeTalent };

  return (
    <div class="scene" onClick={() => !done && setStep(cats.length + 1)}>
      <h2 class="center">{done ? r.headline : count < 1 ? '🗳️ Doors are open. Counting heads…' : '⚖️ The judges are scoring…'}</h2>
      <div class="versus card">
        <div><BearMascot size={56} mood={done ? (r.win ? 'smug' : 'sad') : 'happy'} /><div class="num" style={{ color: 'var(--bear-hi)' }}>{bearCount.toLocaleString('en-US')}</div><div class="small">Bear hackers</div></div>
        <div class="grade">{done ? r.bear.grade : 'vs'}</div>
        <div><TreeMascot size={56} /><div class="num" style={{ color: 'var(--tree-hi)' }}>{treeCount.toLocaleString('en-US')}</div><div class="small">Tree hackers</div></div>
      </div>
      {done && <div class="versus small"><div>Score <b style={{ color: 'var(--bear-hi)' }}>{r.bear.total}</b></div><div /><div>Score <b style={{ color: 'var(--tree-hi)' }}>{r.tree.total}</b></div></div>}
      <div class="card col">
        {cats.slice(0, shown).map((c, i) => {
          const tv = r.tree.categories[i].value;
          return (
            <div key={c.id} class="score-row vs-row">
              <span class="small"><b>{c.name}</b> <span class="dim">({Math.round(c.weight * 100)}%)</span></span>
              <span class="small"><b style={{ color: 'var(--bear-hi)' }}>{c.value}</b> <span class="dim">vs</span> <b style={{ color: 'var(--tree-hi)' }}>{tv}</b> {c.value > tv ? '🐻' : c.value < tv ? '🌲' : '🤝'}</span>
              <div class="bar"><div class="b" style={{ width: `${c.value}%` }} /></div>
              <div class="bar"><div class="b" style={{ width: `${tv}%`, background: 'var(--tree-hi)' }} /></div>
              <span class="tiny dim" style={{ gridColumn: '1 / -1' }}>{c.line}</span>
            </div>
          );
        })}
        {!done && <div class="tiny dim center">Tap to skip</div>}
      </div>
      {done && (
        <>
          <div class="card col">
            <h3>🧬 Your build vs Tree</h3>
            <div class="small">{s.unlockedTech.length} nodes evolved · {BRANCHES.map((b) => `${split[b.id]}% ${b.name}`).join(' · ')}</div>
            {BRANCHES.map((b) => (
              <div key={b.id} class="score-row vs-row">
                <span class="small"><b>{b.icon} {b.name}</b></span>
                <span class="small"><b style={{ color: 'var(--bear-hi)' }}>{bar(s, b.id)}</b> <span class="dim">vs</span> <b style={{ color: 'var(--tree-hi)' }}>{Math.round(treeStat[b.id])}</b></span>
                <div class="bar"><div class="b" style={{ width: `${bar(s, b.id)}%` }} /></div>
                <div class="bar"><div class="b" style={{ width: `${treeStat[b.id]}%`, background: 'var(--tree-hi)' }} /></div>
              </div>
            ))}
          </div>
          <div class="small center dim">Venue: {VENUE_BY_ID[s.venue ?? 'lawn'].name} · Tree controlled {treeRegionCount(s)}/8 regions · seed {s.seed}</div>
          <div class="card" style={{ padding: '6px' }}><MapSvg s={s} /></div>
          <div class="card col"><h3>🏆 Awards</h3>{r.awards.map((a) => <div key={a} class="small">• {a}</div>)}</div>
          <div class="row wrap">
            <button class="btn btn-gold btn-big grow" onClick={() => { const m = s.mode; store.newGame(m); }}>▶ Play again (new seed)</button>
            <button class="btn btn-blue btn-big grow" onClick={() => void shareOrDownload(s)}>📸 Share card</button>
          </div>
          <button class="btn btn-ghost" onClick={() => store.quit()}>Back to title</button>
        </>
      )}
    </div>
  );
}
