# Balance

All tunable constants live in `src/core/config.ts` (`T` and `MODES`), plus two formulas in `src/core/map.ts` (`repFactor`, `treeBase`) and the category formulas in `src/core/score.ts`. `npm run sim` plays 2,000 headless games per bot on the real sim core (`-- --mode judge|standard|full`, `-- --runs N`, `-- --bot name`).

## Results after the Plague Inc rework (Standard, 2,000 runs per bot)

The rework moved the game to 10,000 students across 8 regions, so signups and attendees are now in the thousands. "Attendees" counts confirmed hackers times the show rate plus about 10% walk-ins, capped by the venue.

| Target | Result | Status |
| --- | --- | --- |
| Random bot median 25–40, usually loses | median 40, beats Tree 11% | ✅ |
| Balanced@70 median 60–75 | median 70 | ✅ |
| Balanced@70 beats Tree ~65% | 70% | ✅ |
| Perfect play 85–100 | median 74, p90 84 | ⚠️ see below |
| Skipping bubbles costs 10–15 points | Balanced@0 55 vs @70 70 (−15) | ✅ |
| Popups pause the world about twice a day | 2.1–2.4 per day | ✅ |
| Rumors mutate 1–2 nodes per run | 1–2 | ✅ |
| Money stops piling up | Balanced@70 median leftover $5.4k (was most of the budget) | ✅ |
| No stuck games | 0 in 16,000 | ✅ |

| Bot | p10 | Median | p90 | Beats Tree | Median interested | Median confirmed | Median leftover |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Random | 34 | 40 | 52 | 11% | 1,720 | 1,282 | $233 |
| Greedy-Money | 51 | 60 | 69 | 61% | 3,436 | 3,379 | $13.8k |
| Greedy-Hype | 49 | 57 | 66 | 48% | 3,906 | 3,000 | $1.0k |
| Balanced@40 | 55 | 66 | 75 | 62% | 4,116 | 3,778 | $2.1k |
| Balanced@70 | 59 | 70 | 78 | 70% | 4,464 | 3,882 | $5.4k |
| Balanced@95 | 62 | 71 | 80 | 73% | 4,426 | 4,000 | $10.3k |
| Balanced@0 | 46 | 55 | 66 | 34% | 2,776 | 2,572 | $1.5k |
| Perfect | 62 | 74 | 84 | 85% | 4,312 | 4,500 | $11.2k |

## Economy after the rework

- **Money comes only from the starting budget and sponsors.** Bubbles give tech points only. Alerts no longer pay cash, except YSee's SAFE, which is a sponsor deal. A test checks that the final budget plus everything spent never exceeds start + sponsor payouts.
- **Confirming costs money.** `T.confirmBatch` 250 hackers per tap at `T.confirmCost` $14 each (floor `T.confirmCostMin` $9). Travel Grants cut $3 and Swag Bags cut $2. This replaces the old per-attendee food cost and is the main money sink.
- **Sponsor payouts trimmed.** Premium deals pay ×0.85 and basic deals ×0.5 of the listed amount.
- **Show rate.** `T.showRateBase` 0.8, clamped 0.6–0.97. Unconfirmed signups walk in at `T.walkInRate` 10%.
- **Tech bars.** Each branch bar starts at 10 and owned nodes add to it (cap 100). Hype speeds spread (`1 + 0.8·hype/100`), Conversion raises signups per aware student (`0.45 + 0.6·conv/100 + 0.015·nodes`), and Talent feeds project quality.
- **Tree.** Off-map base `treeBase` 900 + 12·hype. Tree's show rate is 0.72 + 0.0015·hype (0.5–0.9). Tree moves land instantly; Clapback Team cuts them to ×0.6.
- **Pauses.** `MODES[mode].popupsPerDay` (2/2/3) caps pausing popups. Each day from Day 2 gets one special (world news or a rumor). Milestone popups that would go over the cap go to the ticker instead.

## Known gaps

- **Perfect play scores 74, not 85+.** The Perfect bot is the Balanced bot with optimal courting replies and a different tech order. It doesn't time posts or chase bubbles by value, so it's a soft upper bound. Real playtests are the better check.
- **Parking dominates the Perfect bot's top decile.** Bots can't afford the Stadium (about $25k at auction on Day 3), so Parking is the biggest venue they win. A human who saves early can still buy the Stadium. If playtests show nobody does, lower the Stadium price.
- **Leftover cash still has a long tail.** p90 leftover is $35k–$48k, from runs that land Balantir late in the week when there is little left to spend on. Medians are low, which was the main complaint.
- **Tree region count is wide** (p10 0, p90 8). The map snowballs once one side leads. If playtests feel swingy, raise `T.treeControlPenalty` or lower `T.spread`.
- **YSee appears in almost every run.** It is a guaranteed invite and the bots accept every invite. The sim only flags something as dominant if it is also much more common in top runs (lift > 1.15), and YSee isn't.
