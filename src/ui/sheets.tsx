// Sheets: Crew and Sponsors (side/bottom panels, clock keeps running) and the Evolve screen (pauses).
import { useState } from 'preact/hooks';
import { MISMATCH_TOOLTIPS, ROLE_INFO, TASK_INFO, TRAITS } from '../content/members';
import { PROMISES } from '../content/promises';
import { SPONSOR_BY_ID, TIER_INFO } from '../content/sponsors';
import { BRANCHES, TECH } from '../content/techTree';
import {
  assign, bar, buyTech, canAssign, effectiveSkill, equityCut, inviteChance, isMatch, postsPerDay,
  techState, type GameState, type Member, type Task, type TechBranch, type TechId,
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
      <div class="sheet-head"><h3>👥 Crew ({s.members.length})</h3><span class="chip" title="1 + one per Social Media member on Social">📱 {postsPerDay(s)} posts/day</span>
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

// ── Evolve: each branch is a real tree (prereq = parent), laid out left → right by depth. ──
const COLW = 128;
const ROWH = 52;
const NODEW = 112;
const NODEH = 40;

interface Placed { id: TechId; x: number; y: number; parent?: TechId }
interface Band { branch: TechBranch; nodes: Placed[]; w: number; h: number }

function layoutBranch(branch: TechBranch): Band {
  const nodes = TECH.filter((t) => t.branch === branch);
  const placed: Placed[] = [];
  let leaf = 0;
  let maxDepth = 0;
  // Tidy tree: leaves take consecutive rows, parents sit centered on their children.
  const walk = (id: TechId, depth: number, parent?: TechId): number => {
    maxDepth = Math.max(maxDepth, depth);
    const ys = nodes.filter((t) => t.prereq === id).map((c) => walk(c.id, depth + 1, id));
    const y = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : leaf++ * ROWH;
    placed.push({ id, x: depth * COLW, y, parent });
    return y;
  };
  for (const root of nodes.filter((t) => !t.prereq || !nodes.some((n) => n.id === t.prereq))) walk(root.id, 0);
  return { branch, nodes: placed, w: maxDepth * COLW + NODEW + 8, h: Math.max(0, leaf - 1) * ROWH + NODEH + 8 };
}

const BANDS: Band[] = BRANCHES.map((b) => layoutBranch(b.id));

/** Plague Inc-style evolution screen: three bars, then each branch as a connected tree. Pauses the world. */
export function TechSheet({ s, close }: { s: GameState; close?: () => void }) {
  const [sel, setSel] = useState<TechId | null>(null);
  const n = sel ? TECH.find((t) => t.id === sel) : null;
  const st = n ? techState(s, n.id) : null;
  return (
    <div class="evo-screen" role="dialog" aria-label="Evolve">
      <div class="evo-top">
        <h3>🧬 Evolve</h3>
        {s.phase === 'live' && <span class="chip">⏸ World paused</span>}
        <span class="chip gold">🔬 {s.techPoints} TP</span>
        <span class="grow" />
        {close && <button class="icon-btn" aria-label="Close" onClick={close}>✕</button>}
      </div>
      <div class="bars">
        {BRANCHES.map((b) => (
          <div key={b.id} class={`bar-row bar-${b.id}`} title={b.blurb}>
            <span class="bar-label">{b.icon} {b.name}</span>
            <span class="bar-track"><span class="bar-fill" style={{ width: `${bar(s, b.id)}%` }} /></span>
            <span class="bar-val">{bar(s, b.id)}</span>
          </div>
        ))}
      </div>
      <div class="evo-body">
        <div class="evo-web">
          {BANDS.map((band) => {
            const info = BRANCHES.find((b) => b.id === band.branch)!;
            const pos = new Map(band.nodes.map((p) => [p.id, p]));
            return (
              <section key={band.branch} class={`evo-band band-${band.branch}`}>
                <div class="evo-band-head"><b>{info.icon} {info.name}</b> <span class="tiny dim">{info.blurb}</span></div>
                <div class="evo-canvas" style={{ width: `${band.w}px`, height: `${band.h}px` }}>
                  <svg class="evo-links" width={band.w} height={band.h} aria-hidden="true">
                    {band.nodes.filter((p) => p.parent).map((p) => {
                      const a = pos.get(p.parent!)!;
                      const x1 = a.x + NODEW + 4;
                      const y1 = a.y + NODEH / 2 + 4;
                      const x2 = p.x + 4;
                      const y2 = p.y + NODEH / 2 + 4;
                      const mid = (x1 + x2) / 2;
                      const owned = s.unlockedTech.includes(p.id);
                      const open = s.unlockedTech.includes(p.parent!);
                      return <path key={p.id} class={`evo-link ${owned ? 'owned' : open ? 'open' : 'locked'}`} d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`} />;
                    })}
                  </svg>
                  {band.nodes.map((p) => {
                    const t = TECH.find((x) => x.id === p.id)!;
                    const ts = techState(s, t.id);
                    return (
                      <button key={t.id} class={`evo-node ${ts} ${sel === t.id ? 'sel' : ''}`} style={{ left: `${p.x + 4}px`, top: `${p.y + 4}px`, width: `${NODEW}px`, height: `${NODEH}px` }}
                        onClick={() => setSel(sel === t.id ? null : t.id)} aria-label={`${t.name}, ${ts}`}>
                        <span class="evo-name">{t.name}</span>
                        <span class="evo-cost">{ts === 'owned' ? '✓ evolved' : ts === 'locked' ? '🔒' : `${t.cost} TP`}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <div class="evo-detail card">
          {n && st ? (
            <>
              <div class="row"><b class="grow">{n.name}</b>{Object.entries(n.bars).map(([k, v]) => <span key={k} class={`chip bar-chip bar-${k}`}>+{v} {k}</span>)}</div>
              <div class="small">{n.effect}</div>
              <div class="tiny dim">{n.desc ?? flavor(s, `techjoke|${n.joke}`, `tech:${n.id}`)}</div>
              {st !== 'owned' && (
                <button class="btn btn-gold" disabled={st !== 'available'} onClick={() => store.act((x) => buyTech(x, n.id))}>
                  {st === 'locked' ? `Evolve ${TECH.find((t) => t.id === n.prereq)?.name} first` : st === 'poor' ? `Need ${n.cost} TP` : `🧬 Evolve (${n.cost} TP)`}
                </button>
              )}
            </>
          ) : (
            <div class="tiny dim">Tap a node to see what it does. Each branch grows from its first node. Earn TP from 💡 bubbles and Organizers on Research; rumors can unlock nodes for free.</div>
          )}
        </div>
      </div>
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
