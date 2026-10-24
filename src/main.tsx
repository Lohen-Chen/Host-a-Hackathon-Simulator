import { render } from 'preact';
import jokesTxt from './content/jokes.txt?raw';
import wordbankTxt from './content/wordbank.txt?raw';
import { initJokes } from './core';
import { App } from './ui/App';
import { store } from './ui/store';
import { registerSW } from './ui/sw';
import './ui/styles.css';

const errors = initJokes(jokesTxt, wordbankTxt);
if (errors.length) console.warn('[jokes] content problems:\n' + errors.join('\n'));
store.start();
registerSW();
render(<App />, document.getElementById('app')!);
