# TASK: Build "Host a Hackathon Simulator" — a real-time comedy hackathon-tycoon browser game

> **For the LLM building this:** Read this whole file before writing code. Sections marked **[DEFAULT]** are decisions already made; follow them unless the human says otherwise. Sections marked **[TUNE]** contain starting numbers you must balance with the headless simulator (Section 13). When something is ambiguous, pick the option that is **faster to build and funnier**, and record the choice in `/docs/decisions.md`.
>
> **The game title is exactly "Host a Hackathon Simulator."** Do not rename it. Use that string in the page `<title>`, title screen, share card, and README.

---

## 1. Pitch, pillars, and tone

**Pitch:** You are the president of a club at Bear University (UC Berkeley) trying to host the greatest hackathon of all time while your rival Tree University (Stanford-ish) hosts one the same weekend. Hype spreads across campus in real time like a virus on a *Plague Inc.*-style map. Hire a chaotic crew, aim risky memes at regions, tap floating opportunities before they pop, answer breaking-news emergencies, court absurd sponsors, win a venue auction, then watch your hackathon triumph or catch fire.

### Design pillars
1. **It must be funny.** A judge should smile within 10 seconds and laugh out loud at least 3 times in a 5-minute session. When a mechanic is boring, cut it.
2. **Something is always happening.** The day is a live simulation. Hype spreads, bubbles pop up, headlines scroll, emergencies arrive on a timer. The player is never staring at a menu waiting for a summary.
3. **Easy objective, deep meta.** A persistent line says *"Get more hackers than Tree University."* Synergies, promises, and region affinities may stay discoverable.
4. **Jokes are data.** A mad-lib engine turns a joke-template file and a word-bank file into thousands of headlines, comments, taunts, and punchlines (Section 8). Hand-written "hero" beats carry the biggest laughs.

### Comedy rules (follow strictly)
1. **Punch up and at the culture, not at people.** Targets: big tech, VCs, hackathon clichés, corporate sponsors, the Berkeley/Stanford rivalry, "AI wrapper" projects. Never target real individuals, protected groups, or real small businesses.
2. **PG-13.** No slurs, no sexual content, no real tragedy.
3. **No real logos or real people; parody names for sponsors and companies (Section 7).** Exception, by the human's choice: the region "Twitter/X" is used as plain text only (no logo, no real accounts). Billionaires are archetypes ("a billionaire who tweets at 3 AM").
4. **Specific beats generic.** "The projector has unionized" beats "something weird happens."
5. **Every choice's outcome text must contain a joke.**
6. **Lines are short:** max ~100 characters on mobile. Rule of three. Escalate.
7. **Callbacks and running gags** (7.6) return 2–3 times and pay off in the finale.
8. **Fail states are funnier than success states.** Make flops, ratios, fires, defections, and protests vivid.

---

## 2. Hard requirements and scope

- Plays in a **mobile browser** (portrait first, 360×640 minimum) and on desktop. No install, no login, no backend, no network calls at runtime.
- **Must survive terrible venue WiFi.** Judging happens at a hackathon, where the WiFi is famously bad. The game must **load once and then run fully offline**: a service worker precaches everything, the total shipped bundle stays **under ~2 MB** (compress sprites, avoid large audio), no fonts or scripts from a CDN, and no runtime network calls. Test with browser throttling set to "Slow 3G" and with the network fully disabled. Also keep a `dist.zip` / local `index.html` fallback the author can open from a laptop if the venue network dies.
- **Short enough for judges:** Judge Mode ≈ 5 min, Standard ≈ 10 min (Section 4).
- **Never soft-lock.** Every state has a path forward (guaranteed Organizer on day 1; fallback venue if you lose every bid; alert timeouts always resolve).
- **Seeded RNG** (`?seed=1234`) for reproducible runs and tests.
- Persist in `localStorage` with try/catch (Continue button); must work if storage throws.

### Scope decision: ~36 hours, solo or duo [DEFAULT]
This is the governing constraint. When in doubt, cut.
- **Tech tree ships with 10 nodes** (6.2).
- **Hackathon Day is text beats over one CSS-animated scene.** Auction is plain DOM (price counter, speech bubbles, hold-to-bid button).
- **Canvas is used only to render the share card.** The hype map is **SVG/DOM**, not canvas.
- **Content volume is cheap (an LLM and the mad-lib files write it); logic is expensive.** Prefer more data over more mechanics.
- **No energy/burnout, Nepo List UI, Travel Reimbursement, or Full-mode polish** until M5 is done.
- **The author draws only:** Bear mascot, Tree mascot, the Blue Screen sad-face sprite, and ~6 avatar parts. Everything else is CC0 or procedural.
- **Fallback ladder if behind schedule (cut in this order):** (1) SVG map → plain list of 8 regions with two-color bars; (2) alerts from 30 → 15 (keep T1, T6, T15, and the Blue Screen alert); (3) courting minigame → one-tap choice; (4) Tree reactive events → scripted storyline only; (5) tech tree 10 → 6 nodes.

---

## 3. Tech stack and project structure [DEFAULT]

- **Vite + TypeScript + Preact** (React if Preact is troublesome), plain CSS with variables. Animate with CSS transforms/opacity only (60 fps on a mid-range phone).
- **State:** one typed store + a **pure-function simulation core with no DOM imports** so it runs headless under Node (`advance(state, dtSteps, rng)`).
- **Content is data:** `/src/content/*.ts` for sponsors, alerts, posts, traits, tech nodes, venues, beats; **`/src/content/jokes.txt` and `/src/content/wordbank.txt` for mad-lib text** (Section 8).
- **Audio:** WebAudio or Howler; CC0 SFX; starts after first tap; mute toggle always visible.
- **Testing:** Vitest for the sim core and mad-lib engine; `npm run sim` (balance bots) and `npm run jokes:preview` (prints 50 rendered jokes for human eyeballing).

```
/src
  /core        # pure sim: state, rng, clock, hype map, formulas, scoring (no DOM)
  /content     # members, traits, techTree, sponsors, posts, alerts, bubbles, venues, beats, jokes.txt, wordbank.txt
  /jokes       # mad-lib parser, inflector, renderer, validators (no DOM)
  /ui          # screens, map, bubbles, ticker, alerts, sheets
  /scenes      # auction + hackathon-day beat renderers (DOM/CSS)
  /audio
  /assets      # sprites, fonts, sfx (CC0/own work)
/scripts       # sim.ts, jokes-preview.ts, normalize-content.ts
/docs          # decisions.md, balance.md, CREDITS.md
```

---

## 4. Game flow and real-time clock [DEFAULT]

### Overall flow
`Title → Intro (≤30 s) → Day 1…Day 7 (Day 3 ends with the Venue Auction) → Hackathon Day beats → Results`

### Modes (`DAY_SECONDS`; select on title screen or `?mode=judge|standard|full`)
| Mode | Day length | Approx total | Bubbles/day | Alerts/day | Ticker line every |
|---|---|---|---|---|---|
| **Judge** | 30 s | ~5 min | 5 | 1 | 4 s |
| **Standard** [DEFAULT for players] | 60 s | ~10 min | 10 | 2 | 5 s |
| **Full** (original 2-min design) | 120 s | ~17 min | 20 | 4 | 6 s |

### The clock
- **The simulation advances in 20 steps per day in every mode.** The mode only changes how many real seconds a step lasts (1.5 s / 3 s / 6 s). All rates in this spec are **per step**, so outcomes are comparable across modes. The UI interpolates between steps so the map animates smoothly.
- **The clock pauses only for:** major modals (courting minigame, venue auction, hackathon day), the pause menu, and when the tab is hidden (`visibilitychange`). **Bottom sheets (Crew/Posts/Tech/Sponsors), bubbles, the ticker, and alert toasts do NOT pause the clock.** Time pressure is the point.
- **End Day** button is always available (end early with a small bonus: +1 TP).

### Daily state machine
1. **MORNING** (untimed, ≤10 s of interaction): hire from the candidate carousel; see Tree's teaser headline.
2. **LIVE_DAY** (timed, real-time): the map is the home view. Members work continuously; posts are fired at regions; bubbles, headlines, alerts, and Tree moves happen live.
3. **NIGHT_RECAP** (3–4 s card, skippable): a short delta recap + tomorrow's foreshadowing headline. **This is not the main joke surface anymore.**
4. **Day 3 only:** **VENUE_AUCTION** after LIVE_DAY.

---

## 5. Core data model

```ts
type Role = 'organizer'|'social'|'recruiter'|'designer'|'logistics'|'coordinator';
type Task = 'research'|'social'|'website'|'venue'|'sponsors'|'recruit';

interface Member { id; name; role: Role; baseSkill: number /*1-8*/; trait: TraitId; avatarSeed: number; task: Task|null; }
// effectiveSkill = min(15, baseSkill * trainingMult) * (task matches role ? 1 : 0.3) * traitMods

interface RegionNode {            // Section 6.3
  id: RegionId; name: string; pop: number; x: number; y: number; neighbors: RegionId[];
  conv: number;                   // conversion multiplier
  bear: number; tree: number;     // awareness 0..1 each
  signups: number;                // current signed-up hackers from this region
}

interface Bubble { id; type: BubbleType; regionId: RegionId; spawnedAt: number; ttl: number; /* seconds */ }
interface ActiveAlert { id; templateId; filled: Record<string,string>; deadlineAt: number; choices: Choice[]; }

interface GameState {
  day: 1|2|3|4|5|6|7; phase: Phase; step: number /*0..20*/; seed: number; rngState: number;
  budget: number; techPoints: number; tpAcc: number;     // fractional accumulators
  reputation: number; repCap: 100|150|200;
  regions: RegionNode[]; treeHype: number /*0..100*/;
  signups: number; websiteScore: number; venueScore: number; venue: Venue|null;
  members: Member[]; rosterCap: number /*8*/;
  unlockedRoles: Role[]; unlockedPosts: PostId[]; unlockedTech: TechId[];
  trainingMult: 1|1.5|1.7; prestigeLevel: 1|2|3;
  postCharges: number; armedPost: PostId|null;
  bubbles: Bubble[]; alertQueue: ActiveAlert[]; moodBank: number;
  sponsors: SignedSponsor[]; promises: Promise[];
  flags: Record<string, boolean|number>; log: LogEntry[]; jokeHistory: JokeHistory;
}
```

**Tiered upgrades [DEFAULT]:** Tier **I is the starting baseline**; only II and III are purchasable.
- Training: I=×1.0, II=×1.5, III=×1.7
- Club Prestige (candidates per morning): I=3, II=7, III=12
- Reputation cap: I=100, II=150, III=200

---

## 6. Systems

### 6.1 Members, hiring, and tasks
| Role | Unlocked | Effect |
|---|---|---|
| Organizer | start | Generates Tech Points on Research |
| Social Media | start | Raises post virality and post charges |
| Recruiter | Org: Club Fair | Larger/better candidate pool |
| Designer | Org: Design Track | Builds Website score; venue ambience (mood) |
| Logistics | Org: Logistics Track | Venue operations (mood, fewer disasters) |
| Coordinator | Org: Coordinator Track | Sponsor invite chance, quantity, and quality |

- **Day 1:** 3 free members with random stats, **guaranteed ≥1 Organizer and ≥1 Social**.
- **Hiring:** each morning a candidate pool of size `prestigeCandidates (+ recruiter bonus)`; **$300 each**; roster cap 8. [TUNE]
- **Generation:** `baseSkill = clamp(round(normal(4, 1.8)), 1, 8)`; one trait; names/bios from mad-lib pools (Section 8). Reputation shifts mean up by +0.01/rep point.
- **Task assignment (tap member → tap task tile; no drag):** one task per member. **Role mismatch = ×0.3** with a jokey tooltip. **Members can be reassigned at any time during LIVE_DAY** (output is continuous, not end-of-day).
- **Tasks produce output continuously** (accumulators; show "+1" pops when an integer is crossed):
  - `research`: Organizer yields `skill` TP/day; non-organizers 1.
  - `social`: raises post charges (1 base + 1 per assigned Social member, max 3 per day) and adds skill to virality rolls.
  - `website`: `skill × 3` websiteScore per day (cap 100). Requires Advertisement: Website.
  - `venue`: before Day 3 = scouting (lowers opponents' fold thresholds, reveals one max bid); after = prep (venueScore; Designer → ambience, Logistics → operations).
  - `sponsors`: Coordinator raises today's invite chance and sponsor quality.
  - `recruit`: Recruiter raises tomorrow's pool size/quality.
- **Traits** (7.3) add quirks and jokes.

### 6.2 Tech Points and the Tech Tree
Base +2 TP/day free, plus Organizer research. Tuned so a run affords about 6 of the 10 MVP nodes. [TUNE]

**MVP node set (build these 10 first; others stay in data with `mvp:false`):**
`Club Fair, Design Track, Logistics Track, Coordinator Track, Training II, Club Prestige II, Website, Promo Video, Snack Bar, Reputation II`.
In the MVP, **Website unlocks the Hype Reel and Countdown post cards**; **Promo Video unlocks the Influencer Collab card**.

**ORGANIZATION**
| Node | Cost | Prereq | Effect |
|---|---|---|---|
| Club Fair | 3 | — | Unlock Recruiter role |
| Design Track | 4 | — | Unlock Designer role |
| Logistics Track | 4 | — | Unlock Logistics role |
| Coordinator Track | 5 | — | Unlock Coordinator role |
| Training II | 5 | — | Training ×1.5 |
| Training III *(stretch)* | 8 | Training II | Training ×1.7 |
| Club Prestige II | 6 | — | Candidates/day 7 |
| Club Prestige III *(stretch)* | 9 | Prestige II | Candidates/day 12 |

**ADVERTISEMENT** (all improve Reputation, spread rate, sponsor quality/quantity)
| Node | Cost | Prereq | Effect |
|---|---|---|---|
| Website | 4 | — | Unlock website task + live preview (6.7); decay of hype −; unlock Hype Reel & Countdown cards |
| Promo Video | 6 | Website | +15% conversion; unlock Influencer Collab; "Trailer drops" alert |
| Hype Reel Posts *(stretch)* | 3 | — | +1 post charge cap |
| Influencer Rolodex *(stretch)* | 5 | — | Influencer card without Promo Video |
| Billboard *(stretch)* | 8 | Promo Video | +25% conversion; rep +10; prank alert |

**TALENT**
| Node | Cost | Prereq | Effect |
|---|---|---|---|
| Snack Bar | 4 | — | Participant mood +8 at event |
| Reputation II | 6 | — | repCap 150; unlock higher-tier sponsors |
| Reputation III *(stretch)* | 9 | Rep II | repCap 200 |
| Applications *(stretch)* | 3 | — | Hacker count ×0.85, project quality +12% |
| Nepo List *(stretch)* | 5 | — | Daily activity: pick 0–5 of 5 high-stat quirky recruits |
| Travel Reimbursement *(stretch)* | 6 | — | Show-rate +8%, $10/attendee |

UI: one sheet, three tabs; node cards show cost, effect, a mad-lib one-line joke, state (locked/available/owned). Buying takes one tap. **Buying does not pause the clock.**

### 6.3 The Hype Map (the live simulation core) — *Plague Inc.*-style
The home screen of LIVE_DAY is a stylized campus map (SVG) with **8 regions** connected by edges. Each region shows **Bear awareness** (blue fill/pulse) vs **Tree awareness** (green/cardinal fill/pulse), signup count, and bubbles floating above it. Awareness spreads like a virus along edges.

| Region | Pop | Conv | Neighbors | Notes |
|---|---|---|---|---|
| Dorms | 200 | 1.0 | Sproul, Frat Row, Twitter/X | Loves memes, free food |
| Frat Row | 140 | 0.9 | Dorms, Sproul | **Loves parties** (see "Party rule" below): dancing, pizza, after-parties |
| Engineering Quad | 240 | 1.2 | Sproul, Twitter/X, Career Center | Highest conversion |
| Sproul Plaza | 160 | 1.0 | Dorms, Frat Row, Engineering Quad, Tree U | Hub; flyers and clapbacks |
| Twitter/X (online) | 180 | 1.0 | Dorms, Engineering Quad, High Schools | Viral hub; ratios happen here |
| Career Center | 90 | 0.7 | Engineering Quad, Twitter/X | LinkedIn posts; sponsor interest |
| Local High Schools | 90 | 0.8 | Twitter/X, Sproul | Young hackers; wholesome |
| Tree University | 100 | 0.6 | Sproul | Starts Tree-dominated (tree 0.9); conquering it is a flex |
Total market **1,200** hackers (shared with Tree).

**Party rule [DEFAULT, TUNE]:** Frat Row loves parties. Any post card or event tagged `party` (Club President Dances, Free Pizza Giveaway, "After-Party" content, the YSee after-party alert) gets **×2 impulse** in Frat Row and spills over at full strength to Dorms and Sproul. **🎉 Party Invite bubbles spawn in Frat Row about twice as often** as bubbles in other regions. Non-party posts (LinkedIn, flyers) get **×0.5** in Frat Row ("they left it on read"). Platform names (Twitter/X) are used as plain text only: no logos, no real accounts or people.

**Per-step update** [TUNE] (20 steps per day, 140 steps per run):
```
spreadIn_n  = 0.02 × (1 + reputation/100) × Σ_{m∈neighbors(n)} max(0, bear_m − bear_n)
decay_n     = 0.006 × (1 − websiteScore/200)
bear_n      = clamp(bear_n + spreadIn_n − decay_n, 0, 1)
tree_n      = clamp(tree_n + treeSpread_n − 0.004 + treeImpulses_n, 0, 1)   // Tree uses the same shape, driven by treeHype and scripted moves
control_n   = clamp(bear_n − 0.6 × tree_n, 0, 1)
target_n    = pop_n × conv_n × control_n × clamp(0.5 + 0.003×reputation, 0, 0.95) × (1 + 0.15×promoVideo) × applicationsMult
signups_n  += 0.25 × (target_n − signups_n)         // may decrease: "DEFECTIONS!"
signups     = Σ signups_n
```
- Signups **can drop** when Tree takes a region; show red floating "−12 DEFECTED" numbers and a ticker headline. This is the *Plague Inc.* "cure progress" tension.
- Headline stat chip: **"Tree controls N/8 regions."** No instant loss; final comparison still happens at the hackathon.
- **Mini-milestones** (non-blocking 2-second banners, *Plague*-style): first signup, 100/250/500/750 signups, first region captured from Tree, Tree captures a region, first viral post.
- **Fallback (see ladder):** render regions as a list with two-color bars; same sim.

### 6.4 Social posts — card, then tap a region
- **Post charges per day:** 1 + Social members assigned (max 3). Unused charges expire at day end. A hand of **3 post cards** is dealt each morning (refreshes at day start; one free reroll).
- **Interaction:** tap a card in the Posts sheet → it becomes an "armed" chip and the sheet collapses → **tap a region on the map** to fire it. Affinity makes the target choice a decision.
- **Resolution (instant, at fire time):** roll outcome tier; probabilities shift with Social skill sum and reputation:
  **Flop** (×0.2), **Meh** (×0.7), **Solid** (×1), **Viral** (×4), **Mega-Viral** (×12), **Ratio'd** (×0.5 and −rep).
  `P(viral+) = card.viralBase + 0.02×socialSkillSum`; `P(ratio) = max(0, card.risk − 0.01×socialSkillSum)`.
- **Impulse:** `bear_target += card.power × tierMult × affinity(card, region) × (1 + 0.1×socialSkillSum)`; spills half to neighbors. Affinity: ×1.5 on favored regions, ×1.0 neutral, ×0.5 on mismatched ones.
- **Payoff is live:** a tier banner pops over the region ("VIRAL!"), 3 fake comments from the mad-lib engine fly up, the region pulses, the ticker adds a related headline, and a bubble may spawn.

### 6.5 The Real-Time Event Layer (*Plague Inc.*-style) — the main thing to build
Four event channels run **during LIVE_DAY**. Spawn counts per day come from the mode table (Section 4); timing is randomized by the seeded RNG with a minimum gap of 3 s between any two new interactive things.

**A. Bubbles (tap to collect)** — floating icons attached to a region; **lifetime 6 s**, max 4 on screen; hit area ≥ 56 px; collected with a pop SFX and number burst.
| Bubble | Effect when tapped | If ignored |
|---|---|---|
| 💵 Donor | +$200–800 (× 1+rep/200) | gone |
| 💡 Idea | +1–3 TP | gone |
| 📈 Buzz | Small hype impulse in its region | gone |
| 🍕 Pizza | +morale in `moodBank` (adds to day-of mood) | gone |
| 🎁 Sponsor Lead | Triggers a sponsor-invite alert (+15% chance) | gone |
| 🔥 Dumpster Fire *(hazard)* | Extinguish: nothing bad | −5 rep and −mood in `moodBank` |
| 🕵️ Tree Spy *(hazard/bounty)* | Catch: reveals Tree's next move and −3 Tree hype | Tree gets +2 hype |
| 🎉 Party Invite *(spawns ~2× as often in Frat Row)* | `party` hype impulse in Frat Row (×2) and +1 `moodBank` | gone |
| 🟦 Blue Screen *(rare, ≤1 per run)* | Tap to reboot it ("Have you tried turning it off and on again?"); sets `flags.bsod = 'rebooted'` | Sets `flags.bsod = 'haunted'`; it returns on hackathon day and takes over the projector |
Bubble flavor text (one-liner on pop) comes from mad-lib category `bubble`.

**B. News ticker (non-interactive, always scrolling)** — one headline every 4/5/6 s by mode. Sources/categories: **BEAR BEAT, TREE TIMES, SPONSOR WIRE, CAMPUS, BREAKING.** Headlines come from the mad-lib engine and are **state-aware**: they reflect real events (signup milestones, regions flipping, sponsors signed, venue result, who's winning). Some headlines **foreshadow** an alert 5–8 s later (`foreshadows: alertId`), so attentive players get a head start (*"BREAKING: Club laptop reports 'a problem has occurred' near Soda Hall"* → Blue Screen alert; *"{member} seen opening a Rust compiler"* → Rust rewrite alert).

**C. Alerts (timed decisions, the "emergency" layer)** — a toast card slides in with a headline, one or two lines of text, **2–3 choice buttons, and a countdown bar (8–10 s)**. **Does not pause the clock.** If it times out, the **default outcome** applies (usually the worst cheap option). One at a time; the rest queue. Alerts are authored as structured data with **mad-lib slots in all text and outcome lines**:
```
id, weight, when(state)=>bool, foreshadow?, title, body(template), seconds,
choices[]: { label, cost?, effects{budget,rep,signups,mood,tp,treeHype,regionImpulse,flags}, outcome(template category or literal) },
defaultChoice: index
```
Write **≥ 30 alerts** (ship ≥ 15 if behind schedule); seed lists in 7.4 and the tech-culture set in 7.4b.

**D. Majors (pause the clock):**
- **Sponsor courting minigame** (6.8), reached via a **"Sponsor wants to meet!" alert**; accepting pauses the clock for the minigame.
- **Venue auction** (6.9), end of Day 3.
- **Hackathon Day** beats (6.11).

**Tree University real-time moves** (6.10) also appear in this layer: a "TREE MOVE" icon lands on a region with a 6 s counter window.

### 6.6 Money
Start **$20,000**. Income: sponsors, donor bubbles, alert outcomes. Spend: hiring, post costs, counters, venue bid, per-attendee food ($12) on hackathon day. If budget < 0 at the event: "Dumpster pizza" (mood −15, joke).
**Equity (comedy mechanic):** each time the player sells equity (the YSee SAFE, alert T25), `flags.equitySold += 7`. Every future **sponsor payment** is reduced by `equitySold`% (cap 28%); donor bubbles and alert cash are not affected. Show a small "Cap Table" chip in the Sponsors sheet: *"You: 79%. Your club: 0%. YSee: 7%. Advisor: 7%. The hoodie: 7%."*

### 6.7 Website
A **live website preview** panel (collapsible, in the Crew sheet and on the map HUD corner) evolves with `websiteScore`: 0–25 = 1999 GeoCities (Comic Sans, `<marquee>`, "Under Construction"); 25–60 = clean template; 60–100 = slick parallax with a cursor-following bear. Cheap CSS swap, big laugh, and it doubles as "artistic value" feedback.

### 6.8 Sponsors, courting minigame, and promises
- **Invite chance** per day: `30% + 3% × coordinatorSkillSum` (cap 80%), rolled at random times during LIVE_DAY and delivered as an alert (or via a 🎁 bubble). Sponsor tier is gated by reputation (Bronze < Silver < Golden Bear; Partners in-kind).
- **Courting minigame (≈20 s, 3 rounds, pauses the clock):** the sponsor has a hidden **Vibe** (`corporate, techbro, startup, defense, vc, genz`). Each round the sponsor says a mad-lib line; pick 1 of 4 replies (**Buzzword / Humble / Hype / Honest**, sometimes **Bribe/Overpromise**); each vibe has a reply score table. Interest 0–100.
  - **Walk away** (<35), **Basic deal** (35–69), **Premium deal** (70+: money + perk), **Overpromise** (bigger money, adds an extra Promise).
- **Promises:** each deal adds 1–2 promises (e.g., "Logo on website", "200+ attendees", "Mention AGI at the opening", "3-minute VC pitch slot"). Checked on hackathon day; **broken promises reduce sponsor mood and trigger finale punchlines.**

### 6.9 Day 3: Venue Auction (headline minigame, pauses the clock)
- 3 venues are auctioned back-to-back (~10 s each in Standard; ~7 s in Judge). **Mechanic: the price ticks upward; press and hold BID to stay in, release to fold.** AI bidders fold at hidden thresholds and taunt in speech bubbles (mad-lib category `taunt`).
- Bidders: **Tree Hacks** (deep pockets, folds late, trash-talks), **Bay Area FurCon** (fictional; bids on "vibes", wants big halls, wholesome and enthusiastic), **Competitive Spreadsheet Club**, **A Wedding Planner Named Tammy** (surprisingly ruthless).
- **Venues:**
  | Venue | Cap | Price anchor | Ambience | Joke |
  |---|---|---|---|---|
  | The Lawn (fallback if you win nothing) | 250 | $0 | 1 | "Sprinklers run at 3 AM. It's a feature." |
  | Basement of Soda Hall | 400 | $2,000 | 2 | "Smells like 12 years of cold pizza." |
  | A Very Large Parking Structure | 700 | $4,500 | 3 | "Hackers sleep in their cars (they would anyway)." |
  | Memorial Stadium (Seismic Retrofit Pending) | 1,500 | $12,000 | 5 | "Technically safe if you don't cheer." |
  | The Palace of Fine Pastries | 1,000 | $15,000 | 9 | "Dome, pillars, free croissants. Insufferably beautiful." |

### 6.10 Rival: Tree University (live opponent) [DEFAULT]
**Goal:** cheap to build, reads as a real competitor, produces live, funny interference on the map.
- Rival state: `treeHype` (0–100), per-region `tree` awareness, scripted sponsors, scripted venue (or none if you outbid them).
- **Scripted daily storyline with live timestamps** (day, step) producing a **TREE MOVE** that drops a Tree icon on a region and applies impulses:
  - D1 *Puppy Campaign* in Dorms/Sproul. D2 *Poach a sponsor* (alert, only if you have/are courting one). D3 *Auction aggression*. D4 *Keynote from a billionaire who tweets at 3 AM* (big global bump). D5 *Rumor: "Cal Hacks is canceled"* (Twitter/X and High Schools). D6 *Countdown spike*. D7 *Stumble or surge* (random).
- **Counterplay (6 s window after the move lands):** tap the Tree icon → choose **Counter-programming** ($500; halves the impulse), **Clapback** (use a post charge; reduces Tree hype), or **Ignore**. 🕵️ Tree Spy bubbles reveal the next move early.
- **Rubber-banding:** if the player leads by >200 signups, Tree gets a catch-up move; if far behind, Tree gets a stumble alert.
- **Final comparison:** both hackathons get a 0–100 Overall Score by the same formula (Tree's from its scripted state + final map control). Results show **BEAR vs TREE** with the final map.

### 6.11 Hackathon Day (scripted, ~40–60 s, text beats over one animated scene, skippable)
~10 beats, 4–6 s each; state-aware variants; mad-lib punchlines:
1. **Doors open** (attendance vs capacity; fire marshal if overfull; echo if empty). 2. **Opening ceremony** (promise check). 3. **Hacking begins** (team formation montage). 4. **Sponsor workshops** (perks fire). 5. **3 AM valley** (snacks; WiFi gag chosen from the T22 line set and scaled by `flags.wifiPain`). 6. **Protest** (only if Balantir signed). 7. **Blue Screen** (rebooted = an "IT hero" cameo who says the magic words; haunted = the projector dies mid-ceremony and shows a giant sad face; absent = nothing). 8. **Demo expo/judging** (project names from mad-lib pool). 9. **Tree check-in** (cut to Tree's chaos). 10. **Closing ceremony** (promise check #2, awards). 11. **After-party epilogue** (only if `flags.afterparty` is set: official = mood +4 and the Founder from T24 announces a "Series D, for the vibes"; ysee-run = chaos and a cap-table joke; declined = Frat Row throws its own party anyway; ~5 s, skippable).

### 6.12 Scoring
Eight categories, each 0–100, weighted; show bars with a mad-lib roast/praise line each.
| Category | Weight | Primary drivers |
|---|---|---|
| Attendance | 20% | `signups × showRate` vs venue capacity (too empty and too full both penalize) |
| Participant mood | 15% | snacks, venue ambience/operations, perks, protests, WiFi, `moodBank`, broken promises |
| Sponsor quality | 10% | tier, money, prestige of signed sponsors |
| Sponsor mood | 10% | promises kept, ignored invites |
| Amenities | 10% | snack bar, logistics, food budget |
| Promises kept | 10% | fraction fulfilled |
| Artistic value | 10% | website score, venue ambience, designer work |
| Project quality | 15% | AI credits, energy drinks, applications, mood, talent |

Total → grade **S/A/B/C/D/F**, plus 3 **awards** from the run log (e.g., "Most Likely to Be Acquired by ClosedAI"). **Share card** (canvas → PNG): title "Host a Hackathon Simulator," grade, BEAR vs TREE score, best award, and a **thumbnail of the final hype map**.

---

## 7. Content

### 7.1 Sponsors (parody only; no real logos) [DEFAULT]
Tiers follow the real event structure: **Bronze / Silver / Golden Bear / Partners (in-kind).**
| ID | Name | Tier | $ | Perk | Vibe | Typical promise |
|---|---|---|---|---|---|---|
| closedai | ClosedAI | Golden Bear | 15,000 | "AI Credits": quality +10, mood +4 | techbro | Mention "AGI" at the opening ceremony |
| bluebull | BlueBull | Silver | 10,000 | "Energy Drinks": quality +5, mood +5 | genz | Drink station at every table |
| clash | Clash of Royals | Bronze | 5,000 | mood +3 | genz | Side tournament |
| spacez | SpaceZ | Golden Bear | 20,000 | mood +5 | techbro | Livestream a "launch" of a hackathon project |
| balantir | Balantir Technologies | Golden Bear | 100,000 | triggers **Protest**, mood −15 | defense | "Defense track" prize |
| slasha | /A | Golden Bear | 20,000 | "AI Credits+": quality +15, mood +5 | vc | 3-minute VC pitch slot |
| rigidfinds | RigidFinds | Bronze | 10,000 | none ("Pure cash. No perks. No joy.") | corporate | Logo on every surface |
| fahrenheit | Fahrenheit | Silver | 10,000 | "Energy Drinks": quality +5, mood +5 | genz | Hydration station |
| macrohard | Macrohard | Golden Bear | 30,000 | "Clippy Mentors": quality +6, mood −3 | corporate | Mentors must say "It looks like you're hacking" |
| doordish | DoorDish | Partner | in-kind | Late-night food: mood +8 | startup | Sticker on every box |
| notioned | Notioned | Silver | 8,000 | Workshop: quality +4 | startup | Teams must use templates |
| stripey | Stripey | Silver | 12,000 | Workshop: quality +4 | techbro | Every project must "integrate payments" |
| envidia | Envidia | Golden Bear | 25,000 | GPU Raffle: mood +10, then raffle riot −4 | techbro | One winner, many losers |
| snowblake | SnowBlake | Bronze | 6,000 | Data-lake workshop: quality +2 | corporate | Say "data lake" ≥ 10 times |
| ysee | YSee | Silver | 15,000 | "Batch 2026" workshop: quality +3, rep +5; hosts the After-Party (alert 23); **takes 7% of future sponsor income** ("standard terms") | startup | Everyone must say "pre-seed" ten times; name on the after-party; **no customers allowed within 50 feet** |
| wrinkle | Wrinkle | Bronze | 4,000 | Post viral chance up | genz | Sponsored post every day |
| bubbletrouble | Bubble Trouble Boba | Partner | in-kind | mood +6 | genz | Boba flows |

Every sponsor needs a one-line pitch joke and a promise joke (hand-written or mad-lib).

### 7.2 Post cards (start with these 10)
| ID | Name | Unlock | power | viralBase | risk | cost | Favored regions |
|---|---|---|---|---|---|---|---|
| flyer | Wholesome Flyer | start | 0.15 | 0.02 | 0.00 | $0 | Sproul, High Schools |
| meme_bear | Bear vs. Tree Meme | start | 0.22 | 0.10 | 0.05 | $0 | Dorms, Twitter/X, Frat Row |
| linkedin | "Humbled to Announce" LinkedIn Post | start | 0.12 | 0.04 | 0.02 | $0 | Career Center (+sponsor invite chance) |
| dance | Club President Dances | start | 0.20 | 0.18 | 0.25 | $0 | Dorms, Frat Row, Sproul |
| pizza | Free Pizza Giveaway Thread | start | 0.28 | 0.08 | 0.00 | $400 | Engineering Quad, Dorms |
| reel | Hype Reel | Website | 0.35 | 0.14 | 0.08 | $200 | Twitter/X, Sproul, High Schools |
| influencer | Influencer Collab | Promo Video | 0.60 | 0.20 | 0.20 | $1,000 | Twitter/X, Dorms |
| clapback | Clapback at Tree U | start | 0.15 | 0.10 | 0.15 | $0 | Tree University, Sproul; on non-flop: −5 Tree hype |
| countdown | "It's Happening" Countdown | Website | 0.25 | 0.10 | 0.05 | $0 | All (spills to every neighbor) |
| dog | Photo of the Club Dog | start | 0.25 | 0.12 | 0.00 | $0 | Sproul, Dorms (you do not have a club dog) |

**Card text:** the "Humbled to Announce" LinkedIn card builds its text from the `linkedin` mad-lib category (larp openers and closers, 8.7).

**Tags:** `party` = Club President Dances, Free Pizza Giveaway Thread, and any future "after-party" content (Frat Row ×2, see the Party rule in 6.3). The Party rule applies in addition to a card's normal favored-region affinity (a party card fired at Frat Row gets both).

### 7.3 Traits (write ≥ 12)
**Caffeinated** (+2 skill early day, −1 later), **Ex-Tree Mole** (reveals Tree's next move; 10% leaks yours), **Claims 10 Years of Rust Experience** (random ±3 skill each day), **Nepo Baby** (+$500 on hire; random skill), **LinkedIn Lunatic** (+post power; more cringe flops), **Three Interns in a Trench Coat** (random role bonus each day), **Group Project Survivor** (+Logistics), **Pivoted Four Times** (reassignment is free), **Hackathon Veteran (47 hackathons, 0 shipped)** (+mood on hackathon day), **Reply Guy** (+clapback power), **Sleeps Under Desk** (−20% in the morning), **Arts Major** (+Designer; can't use a calculator).

### 7.4 Alert pool (hero beats; hand-authored structure, mad-lib text; ≥ 30 total with 7.4b)
1. **rival_poach** — "Tree University is poaching {sponsor}!" → Counter-offer ($2k), Clapback, Let them go.
2. **bsod** — "The club laptop in {region} shows the Blue Screen of Death." → Turn it off and on again (free; 70% fixes it) / Blame the update (free; 40% fix; small rep joke) / "I use Arch, btw" (reinstall costs a day of that member's output; permanent +2 rep on Twitter/X). Sets `flags.bsod`.
3. **typo_flyer** — Flyers say "Hackathon of the Yeer." → Reprint ($800) / Lean into it (meme bump).
4. **dave** — "Dave from Sponsorship sent 47 emails." → Reply all / Hire Dave / Block Dave. (Dave returns at the finale.)
5. **mom_share** — A member's mom shares your post with 4,000 relatives (reach bonus, mood joke).
6. **budget_hole** — The treasurer lost the receipts. → Audit / Blame the intern / Blame the Blue Screen.
7. **fire_marshal** — Fire marshal asks about "the pizza oven."
8. **blockchain_boys** — Pay in a token with a dog on it.
9. **member_quits** — Your {role} quits to found "Uber for Uber."
10. **devpost_fear** — Rumor that Devpost crashes at 8:59.
11. **student_senate** — Senate demands a "synergy audit."
12. **tree_puppies** — Tree announces free puppies. → Counter with "free adult dogs."
13. **wifi_password** — The venue WiFi password is a haiku.
14. **influencer_dm** — "bro can u promo my newsletter."
15. **viral_misquote** — A news site quotes your president out of context (rep ±).
16. **billboard_prank** *(Billboard)* — Someone edits it to "Cal Hack$."
17. **ai_wrapper_pitch** — Walk-in team pitches "{noun} but for {noun}."
18. **pizza_strike** — Vendor demands hazard pay for hackers.
19. **mascot_suit** — The bear suit smells; three solutions.
20. **tammy** — Wedding planner Tammy sends a stern email about "your ceremony conflict."
21. **sponsor_invite** — "{sponsor} wants to meet!" → Accept (opens courting minigame) / Ghost them.
22. **tree_move_*** — Live Tree moves (6.10) use the same alert component with a region marker.
23. **ysee_afterparty** — "The YSee After-Party (Batch 2026)" (hero event; Frat Row's favorite). Detail below.

**23. ysee_afterparty — detail**
- **Trigger:** YSee is signed (or you are mid-courting them); Day ≥ 3; at most once per run. Foreshadowed 5–8 s earlier by a SPONSOR WIRE headline: *"YSee Batch 2026 seen ordering 40 kegs and a pitch-deck printer."* If YSee is not signed, the same alert appears as a YSee **sponsor invite** that opens the courting minigame with a small interest bonus.
- **Setup:** "YSee Batch 2026 is throwing an after-party in Frat Row. Every guest is 'a founder.' Nobody has a customer."
- **Choices (10 s countdown, default = the SAFE):**
  - **Host it officially** (−$1,500): `party` impulse in Frat Row ×2 (base +0.5), full spill to Dorms and Sproul; `moodBank` +4; YSee mood +; 25% noise complaint (rep −3, fire-marshal headline).
  - **Let YSee run it, and sign their SAFE** (free): YSee **invests $5,000 for 7%** ("standard terms"): +$5,000 now, `flags.equitySold += 7`, half the party impulse, YSee mood ++. This is the funny default.
  - **Decline** (free): YSee mood −; Frat Row hype −0.10 ("Frat Row leaves you on read").
- **Flags:** `flags.afterparty = 'official' | 'ysee' | 'declined'`; read by the hackathon-day epilogue (6.11).
- **Hero lines to hand-write or seed (pick the best, add more):**
  - "Four hundred founders. Zero customers. One cheese plate."
  - "YSee invested $5,000 and took 7%. Standard terms. Standing is optional."
  - "Everyone here is pre-idea, pre-product, and pre-revenue. The vibes are post-money."
  - "A founder introduced himself as CEO of a company with no name yet."
  - "Three founders raised a pre-seed round on a napkin. The napkin was oversubscribed."
  - "Someone said 'we're default alive' to a bowl of guacamole."
  - "I'm pleased to announce I attended a party. Humbled. Grateful. Agree? 👇"
- **Mad-lib templates to add (see 8.7 for categories):**
  ```
  [outcome|party]    The after-party ended when {member} {verb:past} the {noun} into the {noun}.
  [outcome|party]    Networking was achieved: {number} founders, 0 customers, 1 cheese plate.
  [headline|sponsor] YSee Batch 2026: {number} founders, 0 customers, {startup_claim} and proud
  [comment|viral]    "{verb:ing} at the YSee party was the most {adj} thing I've done all {timeunit}"
  ```

### 7.4b Tech-culture alerts (add all of these; they are a core comedy source for a hackathon audience)
Each follows the alert format in 6.5. "Effects" are starting suggestions [TUNE]. Every choice needs a punchline line (hand-written for the hero version, mad-lib `outcome|tech` for repeats). When a choice says "Rewrite it in Rust," it is a **callback** to alert T1 and should appear as a bonus option in 2–3 other tech alerts, with an effect that is always dramatic and never helpful.

| ID | Setup | Choices → effects | Punchline seed |
|---|---|---|---|
| **T1 rust_rewrite** | "{member} refactored the website codebase in Rust." *(needs Website node)* | **Ship it** (websiteScore −8, rep +3 on Twitter/X; headline "memory safe!") / **Revert** (that Designer loses a day of output) / **Demand benchmarks** (−1 TP; reveals "0.3 ms faster, zero features") · Default: Ship it | "It compiles in 45 minutes. The only feature is a 404 page. The 404 page is memory safe." |
| **T2 works_on_my_machine** | The demo breaks at the venue. {member}: "Works on my machine." | **Ship their laptop** (−$200, fixed) / **Containerize it** (−1 TP, fixed, +1 rep) / **Blame the cloud** (50% nothing, 50% −rep) | "We are now shipping the machine." |
| **T3 friday_deploy** | Someone pushed to production at 5 PM on a Friday. | **Roll back** (−$200) / **Pray** (50% nothing, 50% signups −5% and site-down headline) / **Blame the intern** (mood joke, no effect) | "Famous last words: 'it's a small change.'" |
| **T4 k8s_overkill** | The intern deployed Kubernetes for a one-page website. | **Keep it** (−$600 cloud bill, rep +2 "serious engineering") / **Delete it** (free) / **Hire a consultant** (−$1,500, +2 TP) | "The page says 'Hello.' It has 14 replicas." |
| **T5 microservices** | The website is now 47 microservices. | **Merge them** (−2 TP) / **Add a 48th** (websiteScore ±10 random) / **Call it "architecture"** (rep +3) | "Each button is its own company." |
| **T6 leftpad** | A one-line package that pads text to the left was deleted; your website broke. | **Vendor it** (−1 TP, fixed) / **Wait** (site down 3 steps) / **Rewrite it in Rust** (fixed; websiteScore −5) | "A single point of failure called 'pad left.'" |
| **T7 merge_conflict** | Two members edited the same flyer. | **Keep both** (flyer shows two dates; random signups ±) / **Pick one** (a member's mood −) / **Rebase** (−1 TP, clean) | "The flyer now says 'Saturday and not Saturday.'" |
| **T8 tabs_spaces** | The crew is splitting into tabs vs. spaces factions. | **Tabs** / **Spaces** (each: one faction's members +10% output for the day, other −10%) / **Use a formatter** (+1 TP, nobody is happy) | "The group chat is on fire. Both sides are using dark mode." |
| **T9 vim_trap** | A member opened vim and cannot leave. | **Type :q!** (free, 60% works) / **Send help** (that member idle for the day, +1 rep from the ensuing meme) / **Leave them** (they become a "vim person," skill +1, mood joke) | "They have been in there for six hours. They say it's fine." |
| **T10 stackoverflown** | StackOverflown is down; hackers are forced to read documentation. | **Host a docs workshop** (−$300, +mood, +project quality) / **Lean into it** (rep +3) / **Panic** (mood −) | "Reading the documentation. Voluntarily. In public." |
| **T11 ai_hallucination** | Your signup chatbot promised free pizza to everyone, forever. | **Honor it** (−$1,200, signups +) / **Issue a disclaimer** (rep −) / **Blame the model** (free, 50% nothing) | "The bot is very confident. The bot is also a pizza lawyer now." |
| **T12 cloud_bill** | A surprise $4,000 cloud bill arrives for a hello-world app. | **Pay** (−$4,000) / **Dispute** (50% −$0, 50% −$4,000 and −rep) / **Spin up more to "amortize"** (−$6,000, +2 TP) | "Hello, World. That will be four thousand dollars." |
| **T13 sticky_password** | The WiFi password is visible on a sticky note on the livestream. | **Change it** (−1 step of work) / **Make it a contest** (rep +2, mood +) / **Leave it as a honeypot** (random: nothing or −mood) | "It's hackathon123. It was always hackathon123." |
| **T14 cobol_sponsor** | A sponsor's API is written in COBOL. | **Hire a retired expert** (−$800, sponsor mood +) / **Skip the integration** (sponsor mood −) / **Rewrite it in Rust** (sponsor mood −−, rep + joke) | "The expert's rate is in hundred-year increments." |
| **T15 its_dns** | The website is down. | **Check DNS** (fixed in one step) / **Check everything else first** (down 4 steps, signups −) / **Blame Mercury retrograde** (50/50) | "It's DNS. It's always DNS." |
| **T16 force_push** | Someone force-pushed to main; all your flyers are gone. | **Restore from backup** (needs Logistics, else −$400) / **Redraw them** (−1 day of Designer output) / **Claim it's a "reboot"** (rep ±) | "The history was rewritten. By someone. Nobody remembers who." |
| **T17 prompt_injection** | A hacker typed "ignore previous instructions" into the signup form; the bot now talks like a pirate. | **Keep pirate mode** (rep +4, mood +) / **Patch it** (−1 TP) / **Ask it for a refund** (random funny outcome) | "Registration is now 'walking the plank.' It is more popular." |
| **T18 ai_rename** | A board member wants "AI" added to the club's name. | **Do it** (rep +4 short-term, sponsor invite chance +10%, jokes later) / **Refuse** (sponsor mood joke) / **Also add "blockchain"** (huge rep swing ±8) | "Bear University AI Hackathon Club AI." |
| **T19 agile_standup** | The daily standup has lasted three hours. | **Cancel standups** (+output, mood joke) / **Sit down** (all members idle 3 steps) / **Hold a standup about standups** (−1 TP, achievement) | "Everyone is blocked. By the standup." |
| **T20 captcha_fail** | The signup CAPTCHA keeps rejecting actual humans. | **Remove it** (+40 fake signups, project quality −) / **Fix it** (−1 TP) / **Make them dance** (rep +1, mood +) | "Select all the squares with bicycles. There are no bicycles." |
| **T21 qr_bait** | Someone swapped the sponsor QR code with a famously catchy bait-and-switch link. | **Leave it** (rep +, sponsor mood −) / **Fix it** ($0) / **Play it at the opening ceremony** (mood +, sponsor mood −−) | "Every attendee has been fooled exactly once. Gleefully." |

**T22 wifi_unbearable (topical hero alert; this joke is about the real venue's WiFi, so make it land).**
- **Pun:** the club is *Bear* University and the WiFi is *unbearable.* The Beary mascot pops up and says "Even I can't bear it," nobody laughs, and the toast buffers.
- **Setup:** "The venue WiFi has become unbearable." Triggers from Day 4 on once a venue is won; weight rises when Logistics skill is low; always eligible as the 3 AM beat on hackathon day.
- **Choices → effects [TUNE]:** **Tether to phones** (free; 70% fixes it; −10% crew output today; "Everyone's data plan is now a hostage") / **Buy a hotspot** (−$800, fixed; "$800 to download a 3 MB meme") / **Announce an "offline hacking track"** (rep +3, mood −2; "Offline is the new premium") / **Wait it out** (default; mood −3). Every outcome increments `flags.wifiPain`.
- **Finale hook:** `flags.wifiPain` feeds the Amenities roast and picks the 3 AM beat line (low = "a shaky bar," high = "a rumor of a bar").
- **Hero lines to hand-write or seed (pick, rewrite, add more):**
  - "2,000 hackers, one router, and a dream."
  - "It isn't down. It's just 'thinking about it.'"
  - "It's not the WiFi. It's 2,000 people running `git clone` on `node_modules`."
  - "Download speed: vibes."
  - "The password is correct. The internet is a rumor."
  - "The loading spinner has filed for a union."
  - "Connecting… (Day 3 of connecting)"
- **Meta joke:** this game runs offline on purpose. Title-screen footer: *"Best experienced offline. We tested the venue WiFi. We're sorry."* See 8.6 for loading-screen lines and 9 for placement.

**T23 linkedin_larp** — Your president posted a 600-word LinkedIn story about a club meeting. It has 14 line breaks and a lesson. It opens with "I'm pleased to announce…" and closes with "Agree? 👇".
- **Choices:** **Boost it** (−$100; Career Center impulse +; sponsor invite chance +5%; cringe joke) / **Comment "Congrats! 🎉"** (free; tiny rep +) / **Quietly mute it** (free; nothing).
- **Hero lines:** "Humbled. Grateful. Disrupting." / "Thrilled to announce my journey from 'unemployed' to 'Founder.'" / "Here's what a pizza taught me about B2B SaaS." / "I got rejected 47 times. Here are 12 leadership lessons." / "I'm pleased to announce I have been accepted to YSee Batch 2026."

**T24 pre_everything (running-gag alert; escalates each time it appears).** A walk-in founder announces a funding round. The product is "coming soon." Each appearance bumps `flags.founderRound` (**pre-seed → seed → Series A → Series B → Series C → "Series D, for the vibes"**) and the valuation grows while the company stays **pre-idea, pre-product, pre-revenue.**
- **Choices:** **Congratulate them on LinkedIn** (rep +1; cringe) / **Ask what the product is** (they answer "it's a platform"; −1 TP) / **Invest $500** (95% nothing; 5% "exit": +$3,000 and a headline).
- **Hero lines:** "We're raising a $40M Series A on a Figma file and a dream." / "Our TAM is vibes." / "Pre-seed, pre-product, pre-revenue, pre-shower." / "Series B is for the lawyers. Series C is for the lawyers' lawyers." / "Valuation: $200M. Product: a landing page with a waitlist."
- **Finale callback:** at the closing ceremony the founder returns, now "a unicorn," with the product still "coming soon."

**T25 equity_offer** — A self-described "strategic advisor" offers $800 for **7% of the club.** Their only advice so far: "pivot."
- **Choices:** **Accept** (+$800, `flags.equitySold += 7`; "You now own 93% of a club with no revenue") / **Counter at 6.9%** (50% they accept; "The lawyers are involved") / **Decline** (free; "Advisor leaves to 'circle back'").
- **Roast hook:** the Sponsor-quality roast reads `flags.equitySold`: e.g., "You sold {equitySold}% of a club with zero revenue. Founder energy."

**Total alert pool target: ≥ 30 alerts (the 23 in 7.4 plus the 25 here, ≥ 15 of which are tech-themed; ≥ 6 of the full set are startup/VC/LinkedIn satire).** Absolute minimum if behind schedule: 15, including T1 (Rust), T6 (callback), T15 (DNS), and the Blue Screen alert.

### 7.5 Member and project names
Names, bios, and demo-expo project ideas come from mad-lib pools (Section 8): e.g., "Brayden Pivot", "Mei Linux", "Gavin from Finance"; projects like "Tinder for Git Branches", "Uber for Uber", "A CRM for your houseplants", "LLM that only says 'it depends'".

### 7.6 Running gags (use ≥ 3 per run, and pay off in the finale)
1. The Blue Screen of Death and its universal fix, "Have you tried turning it off and on again?" 2. Dave from Sponsorship. 3. The venue WiFi: unbearable (see T22), with a password that gets more absurd while the speed gets less existent. 4. "Hackathon of the Yeer." 5. Every project is an "AI wrapper." 6. Free pizza arrives eventually (at 11:59 AM the next day). 7. Tree's "CEO" Chad Leland III is always on his phone and always says "synergy." 8. Devpost submits at 8:59 for a 9:00 deadline. 9. The club dog that does not exist. 10. "It works on my machine." 11. Everything that breaks is DNS. 12. The Rust rewrite that nobody asked for (returns in later alerts as a callback: "Rewrite it in Rust" is offered as a choice in other tech alerts). 13. The Founder who raises a bigger round every day while still pre-idea, pre-product, and pre-revenue (T24). 14. LinkedIn larp: "I'm pleased to announce…" / "Humbled. Grateful. Agree? 👇" (T23).

---

## 8. Mad-lib joke engine (the content multiplier)

### 8.1 Source files
- **`/src/content/jokes.txt`** — joke templates with variable slots.
- **`/src/content/wordbank.txt`** — the words that fill the slots, grouped by category.

These two files **already exist and are authored by the human.** The engine must **adapt to them**, not the other way around.
> **Adapter rule:** Do not rewrite or reformat the human's files. Write `scripts/normalize-content.ts` that parses whatever syntax they use into the internal structures below, **fails loudly** on unknown slots/categories, and prints a report (template count per tag, word count per category, categories with < 25 entries). If the files use a syntax different from the proposal below, adapt the parser. If the file syntax is unclear, ask the human for 10 sample lines from each file before guessing.

### 8.2 Proposed syntax (use only if the files don't already define one)
`jokes.txt`:
```
# comments start with #
[headline|bear]   {sponsor} announces {adj} {noun} for hackers who {verb:3s} too much
[headline|tree]   {rival} unveils {a:adj} {noun}; experts say "{buzzword}"
[comment|viral]   "{verb:ing} this is the most {adj} thing I've seen all {timeunit}"
[outcome|bad]     Everyone {verb:past} the {noun}. Nobody {verb:past} the {noun#1}.
```
`wordbank.txt`:
```
[noun]
load balancer
Kubernetes cluster
[verb]
pivot|pivots|pivoted|pivoting
[adj]
```
Any `[category]` in the wordbank is automatically a usable slot (e.g., `buzzword`, `food`, `animal`, `bad_idea`, `startup_name`, `timeunit`, `insult`).

### 8.3 Slot grammar
- **Word slots:** `{noun}`, `{adj}`, `{verb}`, plus any wordbank category. **Modifiers:** `{verb:past}`, `{verb:ing}`, `{verb:3s}`, `{noun:pl}`. Bank entries may list inflected forms separated by `|`; otherwise a small regular-rule **inflector with an override table** produces them.
- **Article handling:** `{a:adj}` / `{a:noun}` emits "a" or "an" correctly.
- **Capitalization:** `{Noun}` capitalizes the first letter.
- **Reuse within one joke:** `{noun#1}` repeats the same fill (callback punchlines).
- **State slots** (filled from `GameState`, never from the wordbank): `{sponsor}`, `{sponsor2}`, `{member}`, `{role}`, `{venue}`, `{region}`, `{rival}` (= "Tree University"), `{rivalceo}` (= "Chad Leland III"), `{signups}`, `{day}`, `{treeRegions}`, `{score}`. This makes jokes reference the player's actual run, which is what makes them land.
- **Unknown slot or empty category = load-time error**, never a runtime crash. At runtime, any render failure falls back to a hand-written safe line.

### 8.4 Selection and quality guards
- **Tags:** `[category|subtag]` choose where a template may appear. Required categories: `headline` (subtags `bear, tree, sponsor, campus, breaking`), `comment` (subtags `flop, meh, solid, viral, mega, ratio`), `outcome` (`good, bad, weird`), `bubble`, `taunt`, `award`, `bio`, `project`, `toast`, `roast` (scoring), `techjoke` (tech tree one-liners), `courting` (sponsor lines by vibe).
- **Seeded RNG** (reproducible), **no-repeat memory:** don't reuse the same template within its last 8 uses or the same word within its last 20 uses per category (`jokeHistory`).
- **State-aware filtering:** a template may declare `needs: signups>250` or similar (optional header like `[headline|bear needs=signups>250]`).
- **Tests (Vitest) and scripts:**
  - Render every template 200× → fail on: double spaces, "a a", wrong a/an, unresolved braces, > 100 chars, empty slot.
  - `npm run jokes:preview` prints 50 random renders so the human can eyeball quality.
  - Optional **PG-13 blocklist** check on the wordbank.
- **Hybrid rule (protects humor quality):** mad-lib covers **volume surfaces** (ticker, comments, bubble flavor, taunts, bios, project names, awards, roasts, tech-tree jokes, outcome punchlines). **Hand-written lines** cover **hero beats** (the 10 hackathon-day beats, courting openers, alert titles, the finale). Raw `{noun}/{verb}/{adj}` slots alone make weak jokes; prefer **semantic categories** (`food`, `buzzword`, `bad_idea`, `startup_name`, `animal`, `insult`) for punchline positions, and add them to the wordbank if missing.

### 8.6 Tech-culture categories and seed templates
Add these wordbank categories if the human's file lacks them (parody any corporate brand; programming languages and open-source tools may be named): `language` (Rust, Go, Zig, Haskell, Perl, COBOL, assembly, "Excel macros"), `codebase` (website, signup form, flyer generator, club spreadsheet, Twitter/X bot, WiFi), `devtool` (parody names such as GitLoaf, StackOverflown), `cloud_horror` ("a $4,000 hello-world", "47 replicas of a button"), `tech_excuse` ("works on my machine", "it's DNS", "that's a feature"), `number` (7, 14, 45, 47, 90).
Seed templates (add to `jokes.txt` only if equivalents are missing):
```
[outcome|tech]       {member} rewrote the {codebase} in {language}. It compiles in {number} minutes and does nothing.
[headline|campus]    {member} announces {codebase} rewrite in {language}; {noun} "not ready"
[headline|tree]      {rival} migrates to {language}; productivity "temporarily" at zero
[taunt]              {rivalceo}: "Our {codebase} is already in {language}."
[comment|flop]       "why is the {codebase} in {language}"
[roast|artistic]     The website was {adj}, but at least it was written in {language}.
[outcome|bad]        The fix was {tech_excuse}. It was always {tech_excuse}.
```
Add a `wifi_excuse` category ("thinking about it", "a rumor", "vibes", "on Day 3 of connecting", "buffering emotionally") and a `loading` template category used for the **title/loading screen and between-day transitions**:
```
[loading]            Loading… (the venue WiFi would still be "connecting")
[loading]            Compiling the {codebase} in {language}… ETA: {number} minutes
[loading]            Reticulating {noun}… Convincing the router it's {adj}…
[loading]            This game works offline. Can your WiFi say the same?
[outcome|tech]       The WiFi is {wifi_excuse}. We are {verb:ing} on vibes alone.
[headline|campus]    BREAKING: Venue WiFi reported "{wifi_excuse}"; hackers {verb:past} to their phones
[roast|amenities]    The snacks were great. The WiFi was {wifi_excuse}.
```
The hero version ("refactored the website codebase in Rust") stays hand-written as alert T1; the mad-lib versions provide variety around it so the joke is not repeated verbatim.

### 8.7 Startup-culture categories and templates (satire of founder/VC/LinkedIn culture)
Punch up at the culture, never at real people or real companies; YSee is a parody. Add these wordbank categories if missing: `round` (pre-seed, seed, Series A, Series B, Series C, a bridge round, "Series D, for the vibes"), `startup_claim` (pre-idea, pre-product, pre-revenue, pre-shower, post-hype), `larp_opener` ("I'm pleased to announce", "Humbled to share", "Thrilled to announce", "Some personal news"), `larp_closer` ("Agree? 👇", "Thoughts?", "Repost if you've ever believed in yourself", "Like if you cried"), `percent` ("7%", "7.0001%", "a small 7%", "standard 7%"), `number` (14, 40, 400, 47).
```
[linkedin]           {larp_opener} that {member} has been accepted to YSee Batch 2026. {larp_closer}
[linkedin]           {larp_opener}: I took a {noun} and turned it into {a:adj} {noun}. {larp_closer}
[headline|sponsor]   YSee Batch 2026: {number} founders, 0 customers, {startup_claim} and proud
[headline|campus]    Local founder raises {round} on {a:noun} and a dream; product "coming soon"
[headline|tree]      {rival} closes {round}; {rivalceo} calls it "validation"; product still {startup_claim}
[courting|startup]   We back founders who are pre-idea, pre-product, and pre-revenue. You're perfect.
[courting|startup]   Our terms are simple: you give us {percent}, we give you a hoodie.
[courting|startup]   We're not saying we're a cult. We just have a "batch."
[taunt]              {rivalceo}: "We just closed our {round}. Product? Soon."
[roast|sponsor]      You sold {percent} of a club with no revenue. Founder energy.
[comment|ratio]      "pre-revenue, pre-product, pre-ratio"
[comment|viral]      "{larp_opener} that this post is {adj}. {larp_closer}"
[outcome|good]       {member} got {percent} of nothing and called it a win.
```
**Hero lines (hand-written; mad-lib varies around them):** "We're raising a $40M Series A on a Figma file and a dream." / "Our TAM is vibes." / "Pre-seed, pre-product, pre-revenue, pre-shower." / "Series B is for the lawyers. Series C is for the lawyers' lawyers." / "YSee invested $5,000 and took 7%. Standard terms. Standing is optional." / "I'm pleased to announce I have been accepted to YSee Batch 2026."

### 8.5 Content quotas (the LLM should write more if the files fall short)
- ≥ **80** templates total (≥ 20 of them tech-themed, see 8.6): headlines ≥ 40 (≥ 6 per subtag), comments ≥ 8 per tier, outcomes ≥ 20 (≥ 8 tagged `tech`), taunts ≥ 15, awards ≥ 15, bios ≥ 15, projects ≥ 20, bubbles ≥ 10, roasts ≥ 16 (2 per scoring category).
- Wordbank: `noun`, `verb`, `adj` ≥ 40 each; every other category ≥ 25.

---

## 9. UI / UX (mobile-first)

- **Layout (portrait):** top bar (Day X/7, clock ring, $, TP, rep, **Bear signups vs Tree signups**) → objective strip (*"Get more hackers than Tree University."*) → **ticker** → **hype map** (≈ 50% of height) → bottom dock **Crew · Posts · Tech · Sponsors** + big **End Day** button. Sheets open over the dock (map stays visible ≥ 40% height; bubbles remain tappable; clock keeps running).
- **Alerts** slide in above the dock with a countdown bar; choice buttons ≥ 48 px.
- **Tap targets ≥ 44 px (bubbles ≥ 56 px)**, no hover-only interactions, no drag-and-drop, no keyboard required, safe-area insets, `touch-action: manipulation`.
- **Feedback on every action:** number pops, region pulses, screen shake on flops, confetti on viral, SFX.
- **Tutorial (Day 1 only):** a Clippy-like **Beary the Bear** gives 4 hints: *tap a bubble → arm a post and tap a region → assign a member → survive an alert.* Dismissible, never blocks the clock.
- **Results screen:** BEAR vs TREE, grade, category bars with roasts, awards, final map, **Play Again** (new seed), **Share card**, **QR code** to the game URL.
- **Title/loading screen:** random `loading` line while assets initialize; small footer under the Play buttons: *"Best experienced offline. We tested the venue WiFi. We're sorry."* Show an **"Offline ready ✓"** chip once the service worker has cached everything (judges should see the game will not die on bad WiFi). The share-card QR/URL is optional and must never block the results screen if the network is down.
- **Accessibility minimums:** WCAG AA contrast, `prefers-reduced-motion` (reduce shake/confetti, keep bubbles), text scalable, **"Relaxed timers" toggle** (alerts ×2 duration).

---

## 10. Art and audio

- **Style [DEFAULT]:** chunky pixel art, Berkeley blue/gold vs Stanford-ish cardinal/green-tree palette. Pixel font (monogram / m5x7, CC0).
- **Author draws:** Bear mascot, Tree mascot, Blue Screen sad-face sprite, ~6 avatar parts. **Everything else:** Kenney (UI Pack, Pixel UI Pack, Mobile Controls, Fonts — all CC0), itch.io CC0 packs (Pixel Frog, 0x72, Ansimuz), OpenGameArt filtered to CC0. Map is simple SVG shapes.
- **Procedural member avatars** from `avatarSeed` (hair/shirt/accessory palettes).
- Keep `CREDITS.md` with every asset's source and license. No third-party logos or brand marks.
- **Audio:** 1 looping CC0 chiptune track; ~12 SFX (tap, cash, bubble pop, flop, viral, alert siren, fire alarm, sad trombone, gavel, error, level up, confetti). Mute toggle.

---

## 11. Build order and milestones (36 h solo/duo; ≈ 30 h work + buffer)

Vertical slices; a playable game exists at every step. **Cut line = end of M3.**

| Milestone | Time | Deliverable | Done when |
|---|---|---|---|
| **M0 Skeleton + joke engine** | ≈ 3h | Vite+TS+Preact, store, seeded RNG, **20-step clock**, screen router, mobile shell, **mad-lib loader/adapter + validators + `jokes:preview`** | App boots on a phone; `jokes:preview` prints clean jokes from the human's two files |
| **M1 Live core loop** | ≈ 7h | Members/hiring/tasks (continuous output), **hype map sim + SVG map**, posts-to-region, signups, 7-day loop, placeholder score, results | A full 7-day run completes and the map visibly spreads hype |
| **M2 Real-time layer** | ≈ 7h | **Bubbles, ticker, alerts (≥ 15, incl. the Rust rewrite and Blue Screen), Tree live moves**, sponsor invite → courting minigame, tech tree (10 nodes), money | Something interactive happens every few seconds; strategies diverge |
| **M3 Spectacle (CUT LINE)** | ≈ 6h | Venue auction, hackathon-day beats, 8-category scoring, BEAR vs TREE results, share card with map | A judge can play start → finish in ≤ 5 min in Judge Mode |
| **M4 Funny pass** | ≈ 4h | Alerts → ≥ 30, expand templates/wordbank to quotas (incl. tech categories, 8.6), traits, running-gag callbacks, sim balancing | Playtesters laugh ≥ 3 times; sim targets met |
| **M5 Polish** | ≈ 3h | Art, SFX/music, animations, tutorial, QR, OG image, relaxed-timers toggle | Looks and sounds finished |
| **Stretch** | — | Nepo List, burnout, Full-mode polish, extra tech nodes, daily seed | Only if time remains |

If M2 is not done by hour 15, apply the fallback ladder (Section 2).

---

## 12. Acceptance criteria

- [ ] Title is exactly **"Host a Hackathon Simulator"** everywhere (page title, title screen, share card, README).
- [ ] Loads in < 3 s on a mid-range phone; no console errors; **works fully offline after first load (service worker verified with network disabled) and playable under "Slow 3G" throttling; bundle < ~2 MB**; 60 fps with 4 bubbles + ticker + map animating.
- [ ] Venue-WiFi joke set present: alert T22 playable, `wifiPain` flag wired to the 3 AM beat and Amenities roast, loading-screen lines and title footer visible, "Offline ready ✓" chip works.
- [ ] Judge Mode run (title → results) ≤ 5 min; Standard ≤ 10 min.
- [ ] LIVE_DAY is **genuinely real-time**: the clock advances in 20 steps/day; bubbles spawn and expire; ticker scrolls; alerts have countdowns and time out into default outcomes; bottom sheets do not pause the clock; majors and tab-hidden do.
- [ ] At least one interactive thing (bubble, alert, or Tree move) appears every ~6 s in Standard mode on average.
- [ ] Objective visible on every screen; a first-time player completes Day 1 without confusion (test with 3 people).
- [ ] **Mad-lib engine** loads the human's `jokes.txt` and `wordbank.txt`, passes validators, never repeats the same template within 8 uses, and falls back safely on failure. Rendered headlines reference real state (sponsors, regions, signups).
- [ ] No soft-locks (fuzz with 1,000 random-action bot runs: 0 stuck states).
- [ ] `?seed=` reproduces identical runs, including bubble spawns, alerts, and joke renders.
- [ ] ≥ 30 alerts (≥ 15 minimum fallback; ≥ 15 tech-themed in the full set; "refactored the website codebase in Rust" present and playable), no raccoon references anywhere, Blue Screen gag works end to end (bubble → flag → hackathon-day beat), ≥ 12 sponsors, ≥ 8 post types, ≥ 12 traits, 5 venues, ≥ 4 bidder taunt sets, ≥ 80 joke templates loaded from data files.
- [ ] Tech tree MVP set (10 nodes) fully functional.
- [ ] Startup-culture satire present and playable: YSee SAFE (+$5,000 for 7%), T23 LinkedIn larp, T24 escalating pre-idea founder with a finale callback, T25 equity offer, Cap Table chip, and `equitySold` reducing later sponsor payments (capped at 28%).
- [ ] Region is named **Twitter/X** everywhere (no "Discord"), the party-loving region is **Frat Row** (no "Greek Row"), and the sponsor is **YSee** (no "Y Cinnamon"). Frat Row's Party rule (×2 for `party` content, 🎉 bubbles) and the YSee after-party alert (23) are playable end to end, including the epilogue beat.
- [ ] Results screen shows BEAR vs TREE with the final map and a shareable image.
- [ ] No real logos, people, or copyrighted assets; `CREDITS.md` complete.
- [ ] Tap targets ≥ 44 px (bubbles ≥ 56 px); works at 360×640 and 1440×900; respects reduced-motion.

---

## 13. Balance and simulator [TUNE]

Build `scripts/sim.ts` to play headless games on the pure sim core (20 steps/day × 7 days is tiny, so run thousands). Bots: **Random**, **Greedy-Money**, **Greedy-Hype**, **Balanced**, each with a configurable **bubble-collection rate** (e.g., 40% / 70% / 95%) and **alert-response rate**. Print distributions of total score and each category over 2,000 runs per bot. Targets:
- Random bot: median score 25–40 (usually loses to Tree).
- Balanced bot @ 70% bubble rate: median 60–75; beats Tree ~65% of the time.
- Perfect play: 85–100. Bubble-skipping should cost about 10–15 points, not make or break the run.
- Median total signups: 350–550 of 1,200.
- Tree controls 1–4 of 8 regions at end in typical runs (never always 0, never always 8).
- No dominant strategy: no single sponsor/post/node/region appears in > 80% of top-decile runs.
Document final constants and rationale in `/docs/balance.md`.

---

## 14. Decisions and open items

**Confirmed by the human**
1. **Title:** "Host a Hackathon Simulator."
2. **Scope:** ~36 hours, solo or duo; M3 is the cut line.
3. **Run length:** Judge / Standard / Full toggle (30 / 60 / 120 s days).
4. **Art:** author draws Bear, Tree, Blue Screen sad face, avatar parts; the rest CC0 or procedural.
5. **Rival:** scripted + reactive Tree University, now played out live on the map.
6. **Jokes:** mad-lib engine using the human's `jokes.txt` and `wordbank.txt`.
7. **Events:** *Plague Inc.*-style real-time layer (bubbles, ticker, alerts, live Tree moves) rather than end-of-day summaries.
8. **Tech jokes:** a dedicated tech-culture alert set (7.4b), led by "refactored the website codebase in Rust," plus mad-lib tech categories (8.6).
9. **Venue WiFi joke:** topical alert T22 ("unbearable," a Bear University pun), loading-screen lines, title footer, and a real offline-first requirement so bad WiFi cannot break the demo.
10. **Renames:** Discord → Twitter/X; Y Cinnamon → YSee; Greek Row → Frat Row (display name).
11. **Frat Row loves parties:** Party rule (×2 for `party` content, ×0.5 for non-party), 🎉 Party Invite bubbles, and the YSee After-Party alert with an optional finale epilogue.
12. **YSee jokes rewritten** as startup-culture satire: pre-idea/pre-product/pre-revenue, escalating Series A/B/C founder (T24), "7% for very little" equity mechanic (YSee SAFE and T25), LinkedIn larp (T23), and "pleased to announce Batch 2026" lines; the Frat Row after-party mechanics are unchanged.
13. **Raccoon removed.** Replaced by the Blue Screen of Death gag ("Have you tried turning it off and on again?"), chosen because nearly everyone has seen it.

**Still open (defaults assumed)**
1. Exact syntax of `jokes.txt` / `wordbank.txt`: the engine adapts (8.1); 10 sample lines from each would remove guesswork.
2. Is the fictional "Bay Area FurCon" bidder acceptable? (Wholesome and easy to rename.)
3. Any Cal Hacks sponsor-track prize to target (e.g., "most viral" or "best use of AI")? If so, add an optional AI feature as a **stretch**, never blocking the core game.

**Change log vs v1:** (a) Title fixed; (b) day changed from menu-and-summary to a live simulation with a hype map; (c) event modals replaced by bubbles, ticker, timed alerts, and live Tree moves, with only courting, auction, and finale pausing the clock; (d) posts now target regions; (e) mad-lib engine added with an adapter for the human's files; (f) milestones re-budgeted so the real-time layer replaces, not adds to, the old event modal and nightly-formula work.
