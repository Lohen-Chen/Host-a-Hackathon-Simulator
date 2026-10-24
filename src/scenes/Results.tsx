// Results: BEAR vs TREE, grade, category bars with roasts, awards, final map.
import { useEffect, useState } from 'preact/hooks';
import { VENUE_BY_ID } from '../content/venues';
import { treeRegionCount, type GameState } from '../core';
import { BearMascot, TreeMascot } from '../ui/art';
import { MapSvg } from '../ui/HypeMap';
import { shareOrDownload } from '../ui/shareCard';
import { store } from '../ui/store';

export function Results({ s }: { s: GameState }) {
  const r = s.results!;
  const [showTree, setShowTree] = useState(false);
  useEffect(() => { store.save(); }, []);
  const card = showTree ? r.tree : r.bear;
  return (
    <div class="scene">
      <h2 class="center">{r.headline}</h2>
      <div class="versus card">
        <div><BearMascot size={56} mood={r.win ? 'smug' : 'sad'} /><div class="num" style={{ color: 'var(--bear-hi)' }}>{r.bear.total}</div><div class="small">{r.attendees} hackers</div></div>
        <div class="grade">{r.bear.grade}</div>
        <div><TreeMascot size={56} /><div class="num" style={{ color: 'var(--tree-hi)' }}>{r.tree.total}</div><div class="small">{r.treeAttendees} hackers</div></div>
      </div>
      <div class="small center dim">Venue: {VENUE_BY_ID[s.venue ?? 'lawn'].name} · Tree controlled {treeRegionCount(s)}/8 regions · seed {s.seed}</div>
      <div class="card" style={{ padding: '6px' }}><MapSvg s={s} /></div>
      <div class="tabs"><button class={`tab ${!showTree ? 'active' : ''}`} onClick={() => setShowTree(false)}>🐻 Bear scorecard</button><button class={`tab ${showTree ? 'active' : ''}`} onClick={() => setShowTree(true)}>🌲 Tree scorecard</button></div>
      <div class="card col">
        {card.categories.map((c) => (
          <div key={c.id} class="score-row">
            <span class="small"><b>{c.name}</b> <span class="dim">({Math.round(c.weight * 100)}%)</span></span><b>{c.value}</b>
            <div class="bar"><div class="b" style={{ width: `${c.value}%`, background: showTree ? 'var(--tree-hi)' : undefined }} /></div>
            <span class="tiny dim" style={{ gridColumn: '1 / -1' }}>{c.line}</span>
          </div>
        ))}
      </div>
      <div class="card col"><h3>🏆 Awards</h3>{r.awards.map((a) => <div key={a} class="small">• {a}</div>)}</div>
      <div class="row wrap">
        <button class="btn btn-gold btn-big grow" onClick={() => { const m = s.mode; store.newGame(m); }}>▶ Play again (new seed)</button>
        <button class="btn btn-blue btn-big grow" onClick={() => void shareOrDownload(s)}>📸 Share card</button>
      </div>
      <button class="btn btn-ghost" onClick={() => store.quit()}>Back to title</button>
    </div>
  );
}
