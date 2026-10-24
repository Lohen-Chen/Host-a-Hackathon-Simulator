// Loads jokes.txt + wordbank.txt from disk for Node scripts and tests.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initJokes } from '../src/core/jokes';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const JOKES_PATH = resolve(root, 'src/content/jokes.txt');
export const WORDBANK_PATH = resolve(root, 'src/content/wordbank.txt');

export function readContent() {
  return { jokes: readFileSync(JOKES_PATH, 'utf8'), wordbank: readFileSync(WORDBANK_PATH, 'utf8') };
}

export function loadJokesFromDisk(): string[] {
  const { jokes, wordbank } = readContent();
  return initJokes(jokes, wordbank);
}
