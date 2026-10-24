# Host a Hackathon Simulator

A real-time comedy tycoon game. You run the Golden Bear hackathon for one chaotic week and try to get more hackers than Tree University. Hire a crew, fire posts at regions on a live hype map, pop bubbles, and answer timed alerts before they time out ("Someone suggested we rewrite it in Rust"). Court sponsors, win the venue auction, and survive hackathon day.

Built with Vite, TypeScript and Preact. It is designed for phones first, runs offline after the first visit, and the whole build is under 2 MB.

## Play

- **Judge**: about 5 minutes (30 s days)
- **Standard**: about 10 minutes (60 s days)
- **Full**: about 17 minutes (120 s days)

The game saves at day boundaries in `localStorage`. Settings include mute, music and a relaxed mode with longer alert timers.

## Develop

```sh
npm install
npm run dev            # local dev server
npm test               # Vitest: sim core + joke engine validators
npm run sim            # headless balance bots, 2,000 runs per bot
npm run jokes:preview  # prints 50 rendered jokes to eyeball
npm run content:check  # wordbank/template report and worst-case length check
npm run build          # typecheck, build to dist/, generate the service worker
npm run build:zip      # also builds the single-file offline HTML and dist.zip
```

`dist-single/index.html` is the entire game inlined into one file. It works from `file://` with no server.

## Layout

```
src/core     pure simulation: seeded RNG, no DOM, no Math.random
src/jokes    mad-lib engine (parser, inflector, validators)
src/content  jokes.txt, wordbank.txt and structured data (sponsors, alerts, tech tree…)
src/ui       Preact UI, store and real-time loop
src/scenes   courting, auction, hackathon day, results
src/audio    WebAudio placeholder SFX and chiptune
scripts      balance sim, content tools, service worker and zip builders
docs         decisions.md, balance.md, CREDITS.md
```

Each run is reproducible from its seed. UI-only flavor text uses its own randomness, so rendering never consumes the game's RNG.

## Writing jokes

Templates live in `src/content/jokes.txt` under `[category|subtag needs=...]` headers. Slots look like `{a:noun}`, `{Verb}`, `{verb:past}`, `{noun:pl}`, `{x#1}` for a repeated pick, plus state slots such as `{sponsor}`, `{rival}` and `{venue}`. Word lists are in `src/content/wordbank.txt`. `npm test` renders every template and fails on broken articles, unresolved slots, lines over 100 characters or blocklisted words.

## Deploy

Pushes to `main` run the tests, build, and deploy to GitHub Pages through `.github/workflows/deploy.yml`. To enable it, open the repository's Settings → Pages and set **Source** to **GitHub Actions**. See `docs/decisions.md` for why Pages was chosen over Vercel.
