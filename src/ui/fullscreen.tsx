// Full screen on phones. Android and iPad browsers have the Fullscreen API; iPhone Safari does not,
// so there the only way to lose the address bar is to run from the Home Screen (standalone).
import { useEffect, useState } from 'preact/hooks';

type Doc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type El = HTMLElement & { webkitRequestFullscreen?: () => void };

const doc = () => document as Doc;

/** Already running full screen from the Home Screen (or as an installed app). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  // display-mode: fullscreen also matches while the Fullscreen API is on, which is not the installed app.
  return nav.standalone === true || matchMedia('(display-mode: standalone)').matches || (matchMedia('(display-mode: fullscreen)').matches && !isFull());
}

function canFullscreen(): boolean {
  return Boolean(doc().fullscreenEnabled || doc().webkitFullscreenEnabled);
}

function isFull(): boolean {
  return Boolean(doc().fullscreenElement || doc().webkitFullscreenElement);
}

function toggle() {
  if (isFull()) {
    if (doc().exitFullscreen) void doc().exitFullscreen().catch(() => {});
    else doc().webkitExitFullscreen?.();
    return;
  }
  const el = document.documentElement as El;
  if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  else el.webkitRequestFullscreen?.();
}

/** "⛶ Full screen" where the browser allows it; on iPhone, how to add the game to the Home Screen. */
export function FullscreenButton({ className = 'btn' }: { className?: string }) {
  const [full, setFull] = useState(isFull);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const on = () => setFull(isFull());
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);
  if (isStandalone()) return null;
  const native = canFullscreen();
  return (
    <>
      <button class={className} onClick={() => (native ? toggle() : setHelp(true))}>{full ? '⛶ Exit full screen' : '⛶ Full screen'}</button>
      {help && (
        <div class="modal-back" onClick={() => setHelp(false)}>
          <div class="card modal col" onClick={(e) => e.stopPropagation()}>
            <h2>⛶ Full screen on iPhone</h2>
            <div class="small">iPhone Safari doesn't let websites go full screen, so the address bar stays. To play without it, add the game to your Home Screen:</div>
            <ol class="small fs-steps">
              <li>Tap <b>Share</b> <span aria-hidden="true">(the square with the ↑ arrow)</span>.</li>
              <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
              <li>Open <b>Hackathon Sim</b> from your Home Screen. It runs full screen and works offline. (It starts with its own save, separate from Safari's.)</li>
            </ol>
            <button class="btn btn-gold" onClick={() => setHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
