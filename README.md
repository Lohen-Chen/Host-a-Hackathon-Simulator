# Host a Hackathon Simulator

A real-time comedy tycoon game in the spirit of Plague Inc. You run Bear Hacks for one chaotic week and try to get more hackers than Tree University. Hype spreads across a map of 10,000 students in eight regions (Twitter, Frat Row, Local Highschool, International students, B1G, SEC, UC and ACC). Pop bubbles for tech points and spend them in the Evolve menu on three bars: Hype, Talent and Conversion. Rumors can mutate your tech tree for free ("rumor started of free pizza party").

Interest is free, but attendance is not. Tap **Confirm** to pay for hackers in batches; your money comes only from the starting budget and sponsors. World news, rumors and Tree University's moves arrive as newspaper popups that pause the world, about twice a day. Court sponsors, win the venue auction, and survive hackathon day.

Built with Vite, TypeScript and Preact. It is designed for phones first, runs offline after the first visit, and the whole build is under 2 MB.

## Play

- **Judge**: about 5 minutes (30 s days)
- **Standard**: about 10 minutes (60 s days)
- **Full**: about 17 minutes (120 s days)

The game saves at day boundaries in `localStorage`. Settings include mute and music.

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
