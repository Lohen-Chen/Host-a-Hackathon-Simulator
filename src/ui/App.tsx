// Screen router: the GameState phase decides what is on screen.
import { useEffect, useState } from 'preact/hooks';
import { Auction } from '../scenes/Auction';
import { Courting } from '../scenes/Courting';
import { HackDay } from '../scenes/HackDay';
import { Results } from '../scenes/Results';
import { Live, Toasts } from './Live';
import { Intro, Morning, Night, PauseMenu, Title } from './screens';
import { store, useStore } from './store';
import { offlineReady, onOfflineReady } from './sw';
import { sfx } from '../audio/sfx';

export function App() {
  const st = useStore();
  const [ready, setReady] = useState(offlineReady());
  useEffect(() => onOfflineReady(() => setReady(true)), []);
  // Browsers only allow audio after a gesture: the first tap anywhere starts the music.
  useEffect(() => {
    const go = () => sfx.unlock();
    window.addEventListener('pointerdown', go, { once: true });
    return () => window.removeEventListener('pointerdown', go);
  }, []);
  const s = st.state;
  sfx.setTrack(!s || s.phase === 'intro' ? 'menu' : 'game');
  let screen;
  if (!s) screen = <Title offlineReady={ready} />;
  else {
    switch (s.phase) {
      case 'intro': screen = <Intro s={s} />; break;
      case 'morning': screen = <Morning s={s} />; break;
      case 'live': screen = <Live s={s} />; break;
      case 'night': screen = <Night s={s} />; break;
      case 'auction': screen = <Auction s={s} />; break;
      case 'hackday': screen = <HackDay s={s} />; break;
      case 'results': screen = <Results s={s} />; break;
    }
  }
  return (
    <div class="app">
      {screen}
      {s && s.phase !== 'live' && <Toasts />}
      {s?.courting && <Courting s={s} />}
      {s && store.paused && <PauseMenu />}
    </div>
  );
}
