# Balance

All tunable constants live in `src/core/config.ts` (`T` and `MODES`). `npm run sim` plays 2,000 headless games per bot on the real sim core and prints score, signup and region distributions.

## Status

**Pre-tuning baseline (M3).** M4 tuning is in progress; this file will be updated with the final constants and their rationale.

| Bot | Median score | Beats Tree | Median signups | Target |
| --- | --- | --- | --- | --- |
| Random | 44 | 0% | 178 | median 25–40 |
| Balanced @70% bubbles | 72 | 10% | 310 | median 60–75, beats Tree ~65% |
| Perfect | 76 | 29% | 328 | median 85–100 |

Known problems at this baseline:

- Tree University is too strong, so even good play rarely wins.
- Signups sit around 300; the target median is 350–550.
- Participant and sponsor scores saturate at 100.
- YSee appears in almost every top-decile run.
