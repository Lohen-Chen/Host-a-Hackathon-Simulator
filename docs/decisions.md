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

## UI round (Changes.pdf)

- **Squares map.** Regions are blocks of squares, one per 50 students, filled from the center: blue for Bear, red for Tree, gray for undecided. You can read who is winning a region at a glance, like Plague Inc's red spread. A world bar shows the overall split.
- **Automated posts.** The Posts sheet and card hand are gone. 📱 bubbles appear where a post would help; tapping one picks the best card for that region. Results show as a tier banner and comments on the map, and as a line in the news feed. We kept the tap so the player still chooses where and when to post.
- **Evolve is a real tree.** Each branch grows from one root node, drawn left to right with links. Three new nodes: Influencers (more 📱 bubbles, wider spill), Mentor Program (project quality) and Reminder Emails (show rate).
- **Landscape layout.** Phones in landscape and desktops put the map on the left and objective, world bar, Confirm and the news feed on the right. Portrait keeps the stacked layout and uses spare height under the map for a short news feed. Hints and region info sit in the layout flow instead of floating over the map, and map comments stack instead of overlapping.
- **Leland screenshot joke replaced** with a Tree reply-all blunder. The rubber-band alert stays.
- **Tree is red** (`--tree-hi`) so the map reads as blue against red.

## Changes2 round

- **Tech tree: Hype, Organization, Talent.** Conversion is gone. Hype is how quickly word spreads, Organization is how well the event is run (the old crew nodes), and Talent is how good the hackers are (project quality, sponsor mood). Meme Lord, Clapback Team and Billboard are out. New: SF Bus Ad, Advertise at a Hackathon, a Content Calendar → UGC Creators → Eric Ou → Rick Lee of Bluely chain, Poker Tournament, Resume Book, It's "High Signal" bro, LeetCode Gate, Beginner Workshops, Olympiad Outreach and Run of Show. Discord moved to Hype.
- **Club Prestige is tiered.** We read "I: 3; II: 5; III: 7" as TP costs. The tiers give 5, 7 and 9 candidates a morning (3 without), and Nepo List needs all three.
- **Swag and travel cost money.** They now add $2 each to confirming a hacker and the base dropped to $7, so they're a trade: more interest and a better show rate for a higher cost per hacker. Poker gives hype and mood, not cash, so money still only comes from the budget and sponsors.
- **Tree University performance bar.** Tree's hype (0–100) shown as a red bar, with today's change. It is the number that drives Tree's spread, turnout and judging, like Plague Inc's cure bar.
- **Dots instead of squares** on the map.
- **News feed at the top.** The ticker runs across the top in every layout; tapping it opens the full feed as a side menu. About 20% fewer ticker items (one every 6.25 s instead of 5 s).
- **New satire targets.** Tree University stays Leland Sr.'s (he is the only person in its moves, taunts and the sponsor-poaching event). World news and decisions satirize parody moguls (Alex Carp, Petros Thiel, Mario A. Model) and private equity firms (Blackstump Capital and friends). New world news: the snack bar drones, flying cars, 21 (2008), the permanent underclass, the Pope and Mario A. Model on AI sentience, AI-native crabs, Lord of the Rings names, an AI-native laundromat and private equity buying the dining hall. New sponsor: Short Ocean, an AI-native holding company.
- **Gapless music.** Music plays from decoded WebAudio buffers that loop sample-exactly and skip the MP3 encoder padding, instead of an `<audio loop>` element that stuttered at the seam.
- **Tips pause the game.** On Day 1 each of Beary's tips stops the clock until you tap "Got it." Tips appear when they're relevant (the post tip when the first 📱 bubble shows up, the Confirm tip once you can confirm).

## Follow-up round

- **Tips are centered cards**, like a news event, and pause the world until "Got it."
- **Symmetrical dot blocks.** Each region is a full rectangle of dots (e.g. UC 6×6, B1G 8×5), so a dot is about 50 students but varies slightly by region (47.5 to 52). Dots fill in rings from the center.
- **Decision events are about tech leaders and AI.** Cut the generic ones (typo flyer, mom's share, lost receipts, fire marshal, pizza strike, smelly suit, boba, payroll hoodie, misquote, Tammy's email, flyer merge conflict, club dog) and ten food-gag headlines (nacho cheese is gone from the word bank). New decisions: Petros Thiel's doom tweet (Repost / Post a story condemning it), Alex Carp's "lethality" and his speaker rider, Mario A. Model's manifesto, an AI CEO replacing junior engineers, "AGI achieved internally," a private equity buyout offer and a $100k drop-out offer.
- **The reply-all event is gone.** The comeback slot it used (when Bear is far behind, and Tree's final-day stumble) is now Leland Sr. letting an AI agent run Tree Hacks.
- **"Retweet," not "quote-tweet."** Decision choices that share a post say "Retweet it."

## UI cleanup round

- **One Tree performance bar.** Three bars felt cluttered on phones. Tree still has 📣 Hype, 🗂 Organization and 🧠 Talent under the hood (Organization moves its amenities, promises and sponsor mood; Talent moves its project quality), and the one red bar shows their average, with today's change. Hover it for the breakdown. Each stat grows by 1 a day; Tree's moves and events nudge them (Puppy Campaign and the Keynote add Talent, Sponsor Poaching and the Final Surge add Organization, the stumble cuts Organization, the 21 (2008) story cuts Talent). Old saves get Organization 50 and Talent 55.
- **The news bar is the button.** The "All news" button is gone; tap anywhere on the news bar for the full feed.
- **Bubbles win over regions.** A tap on or just next to a bubble (12 px) pops the bubble and never also opens the region under it.
- **The venue auction is the night of Day 4**, after Balantir's scripted call, so the Balantir decision (and its money) comes first. The sim bot keeps its auction reserve until then; Balanced@70 still beats Tree 57%.
- Smaller fixes: the goal strip fits on one line on phones ("🎯 Get more hackers than Tree · 🌲 holds 7/8 regions"), and BREAKING headlines no longer say "BREAKING BREAKING:".
- **Full screen on phones.** A "⛶ Full screen" button on the title screen and in the pause menu. Android and iPad browsers go full screen. iPhone Safari has no Fullscreen API for web pages, so on iPhone the button explains how to Add to Home Screen, and the game is set up to run from there with no address bar (web-app meta tags, a 180 px Home Screen icon, safe-area padding for the notch). The installed app on Android opens full screen in any orientation. The button hides when the game already runs from the Home Screen.

## Prioritize round

- **The Blue Screen is gone**: the decision, the 🟦 map bubble, its hackathon-day beat, the IT Hero award and the art.
- **You can't evolve the whole tree.** Plague Inc's rule: every 2 nodes you evolve make every other node cost +1 TP (rumor unlocks are free and don't count). The Evolve screen shows the current markup. A good player now evolves about 15 of 36 nodes (it was about 23), so picking a direction matters.
- Balance after both changes (300 runs each): Balanced@70 beats Tree 58%, Perfect 75%, Balanced@0 38%, Random 9%. Skipping bubbles and tech now costs more than it did.

## Hackathon Day round

- **Three new nodes.** Waitlist Theater (Hype, after Website): +6% interest, but on Day 6 5% of the hackers you haven't confirmed leave. Hardware Lab (Talent, after Mentor Program): artistic +8, quality +4, Arts Majors +1 skill. Team Matching Mixer (Talent, after Beginner Workshops): mood +4, quality +3.
- **Hackathon Day has three live decisions**: the WiFi dying at 3 AM (hotspot army, send a crew member, or call it an "offline track"), which demo opens the expo, and Leland Sr. livestreaming into the closing ceremony. What you evolved adds options (Mentor Program and Hardware Lab add demo choices; Run of Show guarantees the WiFi fix). The day is now scored after the decisions; Skip takes each decision's default.
- **The map fills in at check-in.** For the first three beats the map shows who has walked in: dim blue for interested, bright blue for arrived.
- **Beats call back to your week**: lines for LeetCode Gate, Waitlist, Swag, Travel, Olympiad, Mixer, Hardware Lab, Poker, Workshops and AI Credits; a crew moment for two of your members by trait; and a "Meanwhile at Tree Hacks" beat driven by Tree's most extreme stat.
- **Election-night results.** Turnout counters count up side by side, then each judging category is revealed with Bear and Tree next to each other. Tap to skip.
- **Build summary.** Results show your branch split (by TP of base cost) and your Hype, Organization and Talent bars next to Tree's. The share card shows the split too.
- Balance unchanged: Balanced@70 58%, Perfect 73%, Balanced@0 37%, Random 10%.
