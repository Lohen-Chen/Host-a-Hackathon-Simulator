# Decisions

Choices made where the spec left room, or where the human answered a question.

## From the human

- **Content:** jokes.txt and wordbank.txt were written from scratch for this build.
- **Assets:** SFX and drawings are placeholders; the music tracks were supplied by the owner (menu loop on the title screen, game loop everywhere else). Sounds are synthesized with WebAudio, and the art is procedural SVG. Both are meant to be replaced.
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

## Plague Inc rework (Changes.md)

All of Changes.md was implemented, with five adjustments agreed up front:

1. **Popups pause the world but are capped at about 2 a day** (3 in Full). World news, rumors, Tree moves and decisions use the newspaper popup. Flavor stays on the ticker so the game doesn't stop every few seconds.
2. **Tree moves are news, not quick-time events.** They land as a pausing popup. A new **Clapback Team** hype node softens them (×0.6) so there is still a way to respond.
3. **Income is sponsor-only**, but the starting budget covers a small crowd, so a player who whiffs every sponsor can still run a hackathon.
4. **Confirming is one button.** It confirms a batch of 250. Conversion tech lowers the price per head, and about 10% of unconfirmed signups walk in anyway, so forgetting to confirm hurts but isn't a zero.
5. **Tree University leaves the map.** Its eight regions became Twitter, Frat Row, Local Highschool, International students, B1G, SEC, UC and ACC, with 10,000 students across them. Bear starts in UC and Tree starts in ACC.

Other choices:
- The bidding (venue auction) and courting minigames stay unchanged.
- The AI-credits news fires when the player first unlocks AI Credits, either from the tech tree or as a premium sponsor perk. It brings in business majors (more signups, lower project quality).
- Save version bumped to 2. Old saves are discarded rather than migrated.

## Better flow round

- **Burnout instead of random quitting.** With no team cap, the bigger the crew, the likelier someone burns out (7% per member over 3, up to 60% a night). A burned-out member who works the next day quits that night; a rest day (no task) brings them back. It's a visible choice, not a coin flip.
- **No team cap, rising hire cost.** Hires cost $300, plus $150 for each member beyond 4. That keeps an unlimited crew from turning into unlimited tech points and soaks up money.
- **Balantir is a scripted Day 4 call** with a catch: $30,000, reputation −8, and the hackathon-day protest. Declining gives +4 reputation. It never shows up as a random invite.
- **Fewer decisions.** Random decision events only happen on even days, and never on a day that already has a scripted one. The screenshared WiFi password event is gone.
- **Less money.** Sponsor invite chance is down (base 0.3 → 0.2, +0.02 per coordinator skill instead of 0.03).
- **Tech tree pauses the world**, like Plague Inc's evolve screen.
- **Nepo List is back** in Talent: +2 candidates a morning, and better ones.
- **One 10-minute mode.** Judge and Full are gone from the title screen. The sim still supports them internally for tests.
- **Rival CEO renamed** to Leland Sr.
- **Desktop layout.** On wide windows the game is a centered panel, the map fills the middle, and Beary's hints sit at the bottom so they don't cover Twitter/X.
