# Balance

All tunable constants live in `src/core/config.ts` (`T` and `MODES`), plus two formulas in `src/core/map.ts` (`repFactor`, `treeBase`) and the category formulas in `src/core/score.ts`. `npm run sim` plays 2,000 headless games per bot on the real sim core (`-- --mode judge|standard|full`, `-- --runs N`, `-- --bot name`).

## Results (Standard, 2,000 runs per bot)

| Target (spec §13) | Result | Status |
| --- | --- | --- |
| Random bot median 25–40, usually loses | median 38, beats Tree 6% | ✅ |
| Balanced@70 median 60–75 | median 71 | ✅ |
| Balanced@70 beats Tree ~65% | 65% | ✅ |
| Perfect play 85–100 | median 77, p90 86 | ⚠️ see below |
| Skipping bubbles costs 10–15 points | Balanced@0 57 vs @70 71 (−14) | ✅ |
| Median total signups 350–550 | Balanced@70 363, Perfect 401 | ✅ |
| Tree holds 1–4 of 8 regions in typical runs | Balanced@70 median 3 (p10 0, p90 8) | ✅ |
| No sponsor/venue in >80% of top-decile runs | None dominant (see YSee note) | ✅ |
| No stuck games | 0 in 16,000 | ✅ |

| Bot | p10 | Median | p90 | Beats Tree | Median signups |
| --- | --- | --- | --- | --- | --- |
| Random | 29 | 38 | 48 | 6% | 31 |
| Greedy-Money | 46 | 53 | 62 | 34% | 228 |
| Greedy-Hype | 65 | 75 | 82 | 71% | 379 |
| Balanced@40 | 55 | 65 | 76 | 50% | 327 |
| Balanced@70 | 60 | 71 | 81 | 65% | 363 |
| Balanced@95 | 66 | 76 | 85 | 76% | 392 |
| Balanced@0 | 47 | 57 | 66 | 36% | 296 |
| Perfect | 67 | 77 | 86 | 79% | 401 |

Other modes, 400 runs each (Balanced@70):

| Mode | Median score | Beats Tree | Median signups |
| --- | --- | --- | --- |
| Judge | 64 | 67% | 368 |
| Standard | 71 | 65% | 363 |
| Full | 76 | 75% | 387 |

## What changed and why

**1. Proportional awareness decay** (`T.decay` 0.006 → 0.03, `T.treeDecay` 0.004 → 0.02, now multiplied by current awareness). With a flat decay, spread pushed every region to about 0.96 awareness for both schools by Day 7. Control was then identical everywhere and the result was a coin flip that play barely affected. With proportional decay, awareness settles where posting effort holds it. Regions now end up clearly Bear's or Tree's, and posts aimed at the right region matter.

**2. Tree's ambient posting** (`T.treePostsPerDay` 3 → 4.25, `T.treePostPower` 0.11). With the faster decay, Tree needs a steadier drip of its own posts to hold territory. Win rate is very sensitive here: 4.0 gives Balanced@70 77%, 4.5 gives 57%.

**3. Per-mode Tree power** (`MODES[mode].treePower`: Judge 0.8, Standard 1, Full 1.2). A day is always 20 steps, so Tree posts at the same rate in every mode, but shorter modes give the player fewer bubbles and alerts to answer with. Without this, Judge was the hardest mode (54% win) and Full the easiest (83%).

**4. Signup conversion** (`repFactor` base 0.5 → 0.66) puts median signups in the 350–550 band. **Tree's off-map base** (`treeBase` 110 + 1.6·hype → 30 + 1.0·hype) makes Tree's total come mostly from the map, which the player can contest.

**5. Score floors lowered.** The Random bot was getting about 44 for doing almost nothing. Base values dropped:
- mood 46 → 38
- amenities 30 → 20
- project quality 28 → 20
- promises with none made 55 → 40
- sponsor mood with no sponsors 38 → 25

**6. Attendance and sponsors pay off sooner and saturate later.**
- Attendance reaches full marks at 480 attendees (`T.attendanceFull`, was 620), so hitting the signup band is rewarded.
- Sponsor quality is scaled ×0.7 (non-premium ×0.6), so it no longer sits at 100 for every competent bot.
- Website weight in Artistic is up 0.5 → 0.6.

## Known gaps

- **Perfect play scores 77, not 85+.** The Perfect bot is the Balanced bot with optimal courting replies and a different tech order. It doesn't time posts, chase bubbles by value, or plan promises, so it's a soft upper bound, not true perfect play. In Full mode it reaches 84. Raising the ceiling further would mostly mean un-capping categories that good players already max (participant mood, sponsor quality), so I left it. Real playtests are the better check.
- **Tree region count is wide** (p10 0, p90 8). The map still snowballs once one side gets a lead. That's part of the drama, but if playtests feel swingy, raise `T.treeControlPenalty` or lower `T.spread`.
- **YSee appears in about 99% of all runs, not just top ones.** The spec makes it a guaranteed hero invite (the after-party), and the bots accept every invite. The sim now reports something as **dominant** only if it shows up in >80% of top-decile runs *and* is noticeably more common there than overall (lift > 1.15). Nothing meets that bar.
