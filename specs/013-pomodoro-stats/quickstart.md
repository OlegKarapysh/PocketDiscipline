# Quickstart Validation Guide: Pomodoro Stats

## Prerequisites

- The spec 005 layout amendment (User Story 3) is implemented, or lands in the same change. SC-001 depends on the compact timer card.
- Start the dev server with `npm start` and open `http://localhost:4200/pomodoro`.
- To seed history by hand, use the browser's dev tools (Application → IndexedDB → `pocket-discipline-db` → `pomodoroSessions`). Rows follow the shape in [data-model.md](./data-model.md#stored-data-read-pomodorosessions-unchanged).

## Automated Verification

Run all four gates from the repository root:

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

Key suites for the shared chart refactor (step 1 of the plan; run them before any pomodoro code):

- `src/app/shared/components/bar-chart/bar-chart.spec.ts`:
  - geometry: plot start after the widest tick label, bar width, stacked segment heights, the zero bar;
  - x-axis label thinning, overlap avoidance and edge clamping, on wide and phone-width charts;
  - tooltip by mouse hover (following the pointer), tap toggle, keyboard focus and blur;
  - tooltip rows: text, amount, signed amount, swatch, emphasis and note;
  - the legend hidden when empty.
- `src/app/features/dashboard/components/earnings-chart/earnings-chart.spec.ts`: per-source stacking and tones, the 500-step money scale, the Total and per-source tooltip rows, "No earnings recorded", and week/month/year bars past 90 days.
- `src/app/features/daily-scores/components/scores-chart/scores-chart.spec.ts`: the default 7-day range, zero bars for unscored days, the high-score tone, the floored averages, the tooltip rows (with weekday, days scored and reward), and week/month/year bars past 90 days.
- Unchanged, as the behavioural safety net: `e2e/src/chart-tooltip.spec.ts`, `e2e/src/dashboard.spec.ts`, `e2e/src/daily-scores.spec.ts` and the layout audit's dashboard and daily scores entries.

Key suites for the feature:

- `src/app/features/pomodoro/services/pomodoro-stats.service.spec.ts`:
  - the counting rule: completed only, credited on `endTime`, falling back to `startTime`;
  - a session crossing midnight;
  - a session completed on reopen days after it started;
  - zero-filled days, including across a DST change;
  - `byType` listing every type, and `total` equal to the sum of the days.
- `src/app/features/pomodoro/components/pomodoro-stats/pomodoro-stats.spec.ts`: singular and plural count, focus time formats (`45 min`, `2 h 5 min`, `3 h`), the split badges and the earned amount.
- `src/app/features/pomodoro/components/pomodoro-today/pomodoro-today.spec.ts`: the figures, and the invitation when nothing is completed today.
- `src/app/features/pomodoro/components/pomodoro-history/pomodoro-history.spec.ts`: forwarding filter changes, the totals, and the message for an empty period.
- `src/app/features/pomodoro/components/pomodoro-history-chart/pomodoro-history-chart.spec.ts`:
  - one bar per day, with zero days keeping their position;
  - week, month or year bars beyond 90 days;
  - whole-number y-axis labels;
  - tooltip content, and the tooltip opening by tap, mouse and keyboard.
- `src/app/features/pomodoro/pomodoro-container/pomodoro-container.spec.ts`: the Today stream follows `ClockService.today`, and presets move with the day.
- `e2e/src/pomodoro-stats.spec.ts` (real IndexedDB, fixed clock):
  - figures for seeded sessions;
  - a running session completing while the page is open (SC-004);
  - a session crossing midnight;
  - the dashboard cross-check (SC-003).
- `e2e/src/layout-audit.spec.ts`: the `pomodoro` entry with worst-case sessions, plus `pomodoro: custom range` and `pomodoro: long range`, at all reference widths in light and dark (SC-006).
- `e2e/src/chart-tooltip.spec.ts`: the pomodoro chart's outermost bars keep their tooltip on screen at 360px.

## Manual Verification Scenarios

### 0. Existing Charts After the Refactor

1. Open `/` and `/daily-scores` at 360px and at 1280px, in light and dark.
2. **Expected**:
   - Both charts look and behave as before: same bars, colours, legends, axis labels and tooltips.
   - The one difference: the daily scores chart is 20px taller.
   - A tap toggles a tooltip, a mouse hover follows the pointer, and Tab focuses each bar in turn.
3. Open `/design-system`. **Expected**: The `app-bar-chart` example renders with a legend and a tooltip.

### 1. Today's Figures

1. Seed three completed work sessions of 25 minutes and one completed study session of 50 minutes, all with today's `endTime`, plus one `cancelled` session today and one completed yesterday.
2. Open `/pomodoro`.
3. **Expected**:
   - The Today card shows **4 pomodoros**, **Work 3**, **Study 1**, **2 h 5 min** and the sum of the four rewards in amber.
   - The cancelled session and yesterday's session are not counted.
   - At 360 × 640 px, the count and the split are visible without scrolling.

### 2. Live Update on Completion

1. Set the duration to 15 minutes and start a session. (In an automated run, fast-forward the clock instead.)
2. Wait for the completion dialog.
3. **Expected**: The Today card shows one more pomodoro and the new reward, and today's bar in the History chart grows, with no reload.

### 3. History Periods

1. Seed completed sessions on several of the last 30 days, leaving some days empty.
2. **Expected**: The History block shows 7 days by default. Its totals equal the sum over those days, and empty days have no bar but keep their axis label.
3. Select **30 days**, then a custom range. **Expected**: The totals and bars cover exactly the chosen range, both end days included.
4. Tap a bar. **Expected**: The tooltip shows the date, the pomodoros and the work/study split.
5. Choose a custom range of more than 90 days. **Expected**: One bar per week (or month or year) and totals covering every day of the range.
6. Choose a range with no sessions. **Expected**: Zero totals and a "no pomodoros in this period" message instead of the chart.

### 4. Consistency with the Today Page

1. With today's sessions seeded as in scenario 1, open `/` and tap today's bar in the earnings chart.
2. **Expected**: Its **Pomodoro** amount equals the reward on the Pomodoro page's Today card.

### 5. Wide Screen

1. Open `/pomodoro` at 1280px wide.
2. **Expected**: The timer card and the Today card are in the first column and the History block is beside them. Nothing scrolls horizontally, in light or dark.
