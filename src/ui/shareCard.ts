// Canvas is used only here: render the results share card as a PNG.
import { BRANCHES } from '../content/techTree';
import { TITLE, buildSplit, isTreeControlled, type GameState } from '../core';

export function drawShareCard(s: GameState): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = s.results!;
  g.fillStyle = '#0f1724';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#13213a';
  for (let y = 0; y < H; y += 36) g.fillRect(0, y, W, 2);
  const font = (px: number, w = 800) => `${w} ${px}px ui-monospace, Menlo, Consolas, monospace`;
  g.textAlign = 'center';
  g.fillStyle = '#fdb515';
  g.font = font(64);
  g.fillText(TITLE, W / 2, 110);
  g.fillStyle = '#a9b6cc';
  g.font = font(30, 500);
  g.fillText(r.win ? 'Bear University got more hackers than Tree University' : 'Tree University got more hackers. This time.', W / 2, 165);

  g.font = font(220, 900);
  g.fillStyle = '#fdb515';
  g.fillText(r.bear.grade, W / 2, 400);

  g.font = font(54, 900);
  g.fillStyle = '#4f9cf9';
  g.fillText(`🐻 BEAR ${r.bear.total}`, W * 0.27, 490);
  g.fillStyle = '#ffffff';
  g.fillText('vs', W / 2, 490);
  g.fillStyle = '#3ddc84';
  g.fillText(`TREE ${r.tree.total} 🌲`, W * 0.73, 490);
  g.font = font(32, 600);
  g.fillStyle = '#a9b6cc';
  g.fillText(`${r.attendees} hackers vs ${r.treeAttendees}`, W / 2, 545);

  // Map thumbnail
  const mx = 140;
  const my = 590;
  const mw = 800;
  const mh = 560;
  const sx = mw / 360;
  const sy = mh / 300;
  g.fillStyle = '#141e30';
  g.fillRect(mx, my, mw, mh);
  g.strokeStyle = '#3a4d70';
  g.lineWidth = 6;
  for (const a of s.regions) for (const n of a.neighbors) {
    if (a.id > n) continue;
    const b = s.regions.find((x) => x.id === n)!;
    g.beginPath();
    g.moveTo(mx + a.x * sx, my + a.y * sy);
    g.lineTo(mx + b.x * sx, my + b.y * sy);
    g.stroke();
  }
  for (const reg of s.regions) {
    const cx = mx + reg.x * sx;
    const cy = my + reg.y * sy;
    const rad = (15 + Math.sqrt(reg.pop) * 0.9) * sx;
    g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fillStyle = '#0b1220'; g.fill();
    g.beginPath(); g.arc(cx, cy, rad - 4, 0, Math.PI * 2); g.fillStyle = `rgba(79,156,249,${Math.min(0.92, reg.bear)})`; g.fill();
    g.beginPath(); g.arc(cx, cy, rad - 2, 0, Math.PI * 2); g.strokeStyle = `rgba(61,220,132,${Math.min(1, reg.tree * 1.1)})`; g.lineWidth = 4 + reg.tree * 14; g.stroke();
    g.fillStyle = '#fff';
    g.font = font(24, 700);
    g.fillText(reg.name.replace('Local ', '').replace('Engineering', 'Eng'), cx, cy + 8);
    if (isTreeControlled(reg)) { g.font = font(26); g.fillText('🌲', cx, cy + 40); }
  }

  // Your build: where the tech points went.
  const split = buildSplit(s);
  g.fillStyle = '#ffffff';
  g.font = font(30, 700);
  g.fillText(`🧬 Build: ${BRANCHES.map((b) => `${split[b.id]}% ${b.name}`).join(' · ')}`, W / 2, 1200);
  g.fillStyle = '#fdb515';
  g.font = font(32, 800);
  g.fillText(`🏆 ${r.awards[0] ?? ''}`.slice(0, 52), W / 2, 1255);
  g.fillStyle = '#a9b6cc';
  g.font = font(26, 500);
  g.fillText('Best experienced offline. We tested the venue WiFi.', W / 2, 1310);
  return c;
}

export async function shareOrDownload(s: GameState) {
  const c = drawShareCard(s);
  const blob: Blob | null = await new Promise((res) => c.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'host-a-hackathon-simulator.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: TITLE }); return; } catch { /* fall through to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
