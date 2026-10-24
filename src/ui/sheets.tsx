// Bottom sheets: Crew · Posts · Tech · Sponsors. None of them pause the clock.
import { useState } from 'preact/hooks';
import { MISMATCH_TOOLTIPS, ROLE_INFO, TASK_INFO, TRAITS } from '../content/members';
import { POST_BY_ID } from '../content/posts';
import { PROMISES } from '../content/promises';
import { SPONSOR_BY_ID, TIER_INFO } from '../content/sponsors';
import { BRANCHES, TECH } from '../content/techTree';
import {
  armPost, assign, bar, buyTech, canAssign, canFire, chargesLeft, effectiveSkill, equityCut, inviteChance, isMatch,
  maxCharges, reroll, techState, viralChance, type GameState, type Member, type Task, type TechBranch, type TechId,
} from '../core';
import { Avatar } from './art';
import { store } from './store';
import { WebsitePreview } from './WebsitePreview';
import { flavor } from './flavor';

const TASKS: Task[] = ['research', 'social', 'website', 'venue', 'sponsors', 'recruit'];

export function MemberRow({ m, s, selected, onClick }: { m: Member; s: GameState; selected?: boolean; onClick?: () => void }) {
  const eff = m.task ? effectiveSkill(s, m) : 0;
  const status = m.benchedDays > 0 ? '💤 out today' : m.idleSteps > 0 ? '⏳ ramping' : m.task ? `${TASK_INFO[m.task].icon} ${TASK_INFO[m.task].name} · ${eff.toFixed(1)}` : 'idle (tap to assign)';
  return (
    <button class={`member ${selected ? 'sel' : ''}`} onClick={onClick}>
      <Avatar seed={m.avatarSeed} size={40} />
      <div class="meta">
        <div class="name">{m.name}</div>
        <div class="tiny dim">{ROLE_INFO[m.role].icon} {ROLE_INFO[m.role].name} · skill {m.baseSkill}{m.dailyMod ? ` (${m.dailyMod > 0 ? '+' : ''}${m.dailyMod})` : ''} · {TRAITS[m.trait].name}</div>
        <div class="tiny">{status}</div>
        {m.burnout && <div class="tiny burnout">🔥 Burned out: {m.task ? (m.burnoutWorked ? 'worked today, quits tonight' : 'unassign for a rest day or they quit') : 'resting today 😌'}</div>}
      </div>
    </button>
  );
}

export function CrewSheet({ s }: { s: GameState }) {
  const [sel, setSel] = useState<number | null>(null);
  const [showSite, setShowSite] = useState(false);
  const m = s.members.find((x) => x.id === sel);
  return (
    <div class="col">
      <div class="sheet-head"><h3>👥 Crew ({s.members.length})</h3>
        <button class="tab" onClick={() => setShowSite(!showSite)}>🌐 Website {Math.round(s.websiteScore)}</button></div>
      {showSite && <div class="row"><WebsitePreview score={s.websiteScore} /><div class="small dim">The website evolves with its score: GeoCities → template → parallax bear. {s.unlockedTech.includes('website') ? 'Assign a Designer to Website.' : 'Unlock the Website node in Tech.'}</div></div>}
      {s.members.map((x) => <MemberRow key={x.id} m={x} s={s} selected={x.id === sel} onClick={() => setSel(x.id === sel ? null : x.id)} />)}
      {m && (
        <div class="card">
          <div class="small"><b>{m.name}</b>: {m.bio}</div>
          <div class="tiny dim">{TRAITS[m.trait].desc} {TRAITS[m.trait].joke}</div>
          <div class="task-grid">
            {TASKS.map((t) => {
              const ok = canAssign(s, t);
              const match = isMatch(m, t);
              return (
                <button key={t} class={`task-tile ${match ? 'match' : ''} ${m.task === t ? 'cur' : ''}`} disabled={!ok}
                  title={match ? TASK_INFO[t].blurb : MISMATCH_TOOLTIPS[m.id % MISMATCH_TOOLTIPS.length]}
                  onClick={() => store.act((st) => { assign(st, m.id, m.task === t ? null : t); if (st.tutorialStep === 2) st.tutorialStep = 3; })}>
                  <div>{TASK_INFO[t].icon} {TASK_INFO[t].name}</div>
                  <div class="tiny">{!ok ? 'needs Website' : match ? 'specialty' : '×0.3'}</div>
                </button>
              );
            })}
          </div>
          {m.task && !isMatch(m, m.task) && <div class="tiny bad">{MISMATCH_TOOLTIPS[m.id % MISMATCH_TOOLTIPS.length]}</div>}
        </div>
      )}
      {!m && <div class="tiny dim">Tap a member, then tap a task. Output is continuous; reassign any time (1-step ramp-up).</div>}
    </div>
  );
}

export function PostsSheet({ s, close }: { s: GameState; close: () => void }) {
  const left = chargesLeft(s);
  return (
    <div class="col">
      <div class="sheet-head"><h3>📣 Posts</h3><span class="chip">Charges {left}/{maxCharges(s)}</span>
        <button class="tab" disabled={s.rerollsLeft <= 0} onClick={() => store.act((st) => reroll(st))}>🔄 Reroll ({s.rerollsLeft})</button></div>
      {s.hand.length === 0 && <div class="small dim">Hand empty. New cards tomorrow morning.</div>}
      {s.hand.map((id, i) => {
        const c = POST_BY_ID[id];
        const ok = canFire(s, i);
        const fav = c.favored === 'all' ? 'everywhere' : c.favored.map((r) => s.regions.find((x) => x.id === r)?.name).join(', ');
        return (
          <button key={id + i} class="post-card" disabled={!ok} onClick={() => { store.act((st) => armPost(st, i)); close(); }}>
            <span class="ico">{c.icon}</span>
            <div class="grow">
              <div><b>{c.name}</b> {c.cost ? <span class="gold">${c.cost}</span> : <span class="dim">free</span>} {c.party && <span class="chip">🎉 party</span>}</div>
              <div class="tiny dim">{id === 'linkedin' ? flavor(s, 'linkedin', `li:${s.day}:${i}`, c.blurb) : c.blurb}</div>
              <div class="tiny">Loves: {fav} · viral {Math.round(viralChance(s, c) * 100)}%{c.risk ? ` · ratio risk ${Math.round(Math.max(0, c.risk) * 100)}%` : ''}</div>
            </div>
          </button>
        );
      })}
      <div class="tiny dim">Tap a card to arm it, then tap a region on the map. Each Social member on the Social task adds a charge (max 3). Frat Row loves 🎉 party posts (×2, spilling to every neighbor) and leaves everything else on read (×0.5).</div>
    </div>
  );
}

/** Plague Inc-style evolution menu: three bars on top, branch tabs, a grid of nodes, detail + Evolve. */
export function TechSheet({ s }: { s: GameState }) {
  const [tab, setTab] = useState<TechBranch>('hype');
  const [sel, setSel] = useState<TechId | null>(null);
  const nodes = TECH.filter((t) => t.branch === tab);
  const n = sel ? TECH.find((t) => t.id === sel) : null;
  const st = n ? techState(s, n.id) : null;
  return (
    <div class="col">
      <div class="sheet-head"><h3>🧬 Evolve</h3>{s.phase === 'live' && <span class="chip">⏸ World paused</span>}<span class="chip gold">🔬 {s.techPoints} TP</span></div>
      <div class="bars">
        {BRANCHES.map((b) => (
          <div key={b.id} class={`bar-row bar-${b.id}`} title={b.blurb}>
            <span class="bar-label">{b.icon} {b.name}</span>
            <span class="bar-track"><span class="bar-fill" style={{ width: `${bar(s, b.id)}%` }} /></span>
            <span class="bar-val">{bar(s, b.id)}</span>
          </div>
        ))}
      </div>
      <div class="tabs evo-tabs">{BRANCHES.map((b) => <button key={b.id} class={`tab ${tab === b.id ? 'active' : ''}`} onClick={() => { setTab(b.id); setSel(null); }}>{b.icon} {b.name}</button>)}</div>
      <div class="tiny dim">{BRANCHES.find((b) => b.id === tab)!.blurb}</div>
      <div class="evo-grid">
        {nodes.map((t) => {
          const ts = techState(s, t.id);
          return (
            <button key={t.id} class={`evo-node ${ts} ${sel === t.id ? 'sel' : ''}`} onClick={() => setSel(sel === t.id ? null : t.id)} aria-label={`${t.name}, ${ts}`}>
              <span class="evo-name">{t.name}</span>
              <span class="evo-cost">{ts === 'owned' ? '✓' : ts === 'locked' ? '🔒' : `${t.cost} TP`}</span>
            </button>
          );
        })}
      </div>
      {n && st && (
        <div class="card evo-detail">
          <div class="row"><b class="grow">{n.name}</b>{Object.entries(n.bars).map(([k, v]) => <span key={k} class={`chip bar-chip bar-${k}`}>+{v} {k}</span>)}</div>
          <div class="small">{n.effect}{n.prereq ? ` (needs ${TECH.find((t) => t.id === n.prereq)?.name})` : ''}</div>
          <div class="tiny dim">{n.desc ?? flavor(s, `techjoke|${n.joke}`, `tech:${n.id}`)}</div>
          {st !== 'owned' && (
            <button class="btn btn-gold" disabled={st !== 'available'} onClick={() => store.act((x) => buyTech(x, n.id))}>
              {st === 'locked' ? 'Locked' : st === 'poor' ? `Need ${n.cost} TP` : `🧬 Evolve (${n.cost} TP)`}
            </button>
          )}
        </div>
      )}
      <div class="tiny dim">Earn TP from 💡 bubbles and Organizers on Research. Rumors can unlock nodes for free. Every node also grows your interested pool a little.</div>
    </div>
  );
}

export function SponsorsSheet({ s }: { s: GameState }) {
  const eq = Number(s.flags.equitySold ?? 0);
  return (
    <div class="col">
      <div class="sheet-head"><h3>💼 Sponsors</h3><span class="chip">Invite chance {Math.round(inviteChance(s) * 100)}%/roll</span></div>
      <div class="chip" style={{ alignSelf: 'flex-start' }}>📊 Cap Table: You {100 - eq}% · Your club 0% · {eq ? `YSee/advisors ${eq}% · ` : ''}The hoodie 7%{equityCut(s) ? ` · sponsor payments −${equityCut(s)}%` : ''}</div>
      {s.sponsors.length === 0 && <div class="small dim">No sponsors yet. Sponsors are your only income after the starting budget. Put a Coordinator on Sponsors and post on LinkedIn.</div>}
      {s.sponsors.map((x) => {
        const d = SPONSOR_BY_ID[x.id];
        const ps = s.promises.filter((p) => p.sponsorId === x.id);
        return (
          <div key={x.id} class="card">
            <div class="row"><b class="grow">{d.name}</b><span class="chip">{TIER_INFO[d.tier].name}</span></div>
            <div class="tiny">{x.money ? `$${x.money.toLocaleString('en-US')}` : 'in-kind'} · {x.premium ? `perk: ${d.perk}` : 'basic deal (no perk)'} · mood {Math.round(x.mood)}</div>
            {ps.map((p) => <div key={p.uid} class="tiny dim">🤞 Promise: {PROMISES[p.kind].text}</div>)}
          </div>
        );
      })}
    </div>
  );
}
