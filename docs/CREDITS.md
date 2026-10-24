# Credits

Every asset in this build was made for the project. Nothing third-party ships in the bundle beyond the npm libraries below.

| Asset | Source | License |
| --- | --- | --- |
| Jokes and word bank (`src/content/*.txt`) | Written for this project | Same as the repository |
| Sponsors, alerts, posts, tech tree text | Written for this project; every sponsor is a parody name | Same as the repository |
| Sound effects and music | Synthesized at runtime with WebAudio (`src/audio/sfx.ts`). Placeholders, no audio files | Same as the repository |
| Bear, Tree, avatars, icon | Procedural SVG drawn in code (`src/ui/art.tsx`, `public/icon.svg`). Placeholders | Same as the repository |
| Font | The device's system monospace font. No font files are shipped | n/a |

No real logos, brand marks or real people appear in the game.

## Libraries

- [Preact](https://preactjs.com/) (MIT)
- [Vite](https://vitejs.dev/) and [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) (MIT), build only
- [fflate](https://github.com/101arrowz/fflate) (MIT), build only, used to write `dist.zip`
- [Vitest](https://vitest.dev/) and [tsx](https://github.com/privatenumber/tsx) (MIT), development only
