# Decisions

Choices made where the spec left room, or where the human answered a question.

## From the human

- **Content:** jokes.txt and wordbank.txt were written from scratch for this build.
- **Assets:** SFX, music and drawings are placeholders. Sounds are synthesized with WebAudio, and the art is procedural SVG. Both are meant to be replaced.
- **Scope:** built through M4. QR code and other M5 polish are not included. The optional AI feature stretch is skipped.
- **"Bay Area FurCon"** stays as the venue auction's rival bidder.
- **Playtesting** with real people was skipped. Balance relies on the headless sim.

## Hosting: GitHub Pages over Vercel

Both host a static Vite build for free. Pages wins here:

- The repository is already on GitHub, so there is no second account to link and no new permissions to grant.
- The output is fully static with a relative `base: './'`, which suits Pages's project-subpath URLs and also lets the same build run from `file://`.
- Deploying is one workflow file (`deploy.yml`), and it runs the tests before publishing.

Vercel's main advantage is a preview URL for every PR. That doesn't justify the setup for a single-page game. If PR previews become important, connecting Vercel later needs no code changes.

## Engineering

- **Pure core.** `src/core` never touches the DOM or `Math.random`. All randomness goes through a mulberry32 state stored on `GameState.rngState`, so saves and seeds replay exactly. UI flavor text uses `src/ui/flavor.ts` (`Math.random`) so rendering can't change outcomes.
- **Fixed slices.** `advance(s, dt)` integrates in 0.25 s slices. A day is 20 steps no matter the mode, so the sim bots and the real game run the same rules.
- **Effects queue.** The core pushes `fx` (toasts, sfx, confetti) onto state; the UI store drains them. This keeps the core testable headless.
- **Saves happen at day boundaries only.** A mid-day save would need to restore bubbles, alerts and timers. Morning and night saves are simpler and lose at most one day.
- **Service worker** is generated after the build from the actual output files (cache-first, precache everything). The build fails if the precache exceeds 2 MB. It matches with `ignoreVary` because static hosts send `Vary: Origin` and module script requests carry an Origin header.
- **Single-file fallback** (`vite-plugin-singlefile`) is shipped inside `dist.zip` for judges who can't rely on a network.
- **Specialty auto-assign.** New crew start on their role's task, so the opening isn't an empty chore. Designers default to venue scouting until the Website node is researched.
- **Font:** system monospace stands in for a pixel font, to stay under budget and avoid licensing.
