// Service worker registration + the "Offline ready ✓" signal.
declare const __SINGLE_FILE__: boolean;

let ready = false;
const listeners = new Set<() => void>();

export const offlineReady = () => ready;
export function onOfflineReady(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function markReady() { ready = true; for (const l of listeners) l(); }

export function registerSW() {
  // The single-file build (dist-single/index.html) is already fully offline.
  if (__SINGLE_FILE__ || location.protocol === 'file:') { markReady(); return; }
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data === 'precached') markReady(); });
  navigator.serviceWorker.register('./sw.js').then(async (reg) => {
    await navigator.serviceWorker.ready;
    // Already controlling + caches present → ready; otherwise the SW posts 'precached'.
    const keys = await caches.keys().catch(() => [] as string[]);
    if (keys.some((k) => k.startsWith('hahs-')) && reg.active) markReady();
    reg.active?.postMessage('status');
  }).catch(() => { /* offline-first is best effort; the game still runs */ });
}
