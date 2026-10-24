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

export function App() {
  const st = useStore();
  const [ready, setReady] = useState(offlineReady());
  useEffect(() => onOfflineReady(() => setReady(true)), []);
  const s = st.state;
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
