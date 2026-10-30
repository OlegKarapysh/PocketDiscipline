# UI Contract: Shared Bar Chart (`app-bar-chart`)

`EarningsChart` (dashboard) and `ScoresChart` (daily scores) each carry their own copy of the same bar chart: width tracking, y grid, bar geometry, x-axis label thinning, the zero bar, the tooltip interaction and about 140 lines of SCSS. This contract moves that copy into one shared component, migrates both charts onto it without changing their behaviour, and then builds `PomodoroHistoryChart` on it (research §4).

**Location**: `src/app/shared/components/bar-chart/`: the `BarChart` component, selector `app-bar-chart`, with its models beside it, one per file, as `segmented-control` and `period-filter` keep theirs.

**Responsibility split**:

- **`BarChart` draws.** It takes bars that are already aggregated and lays them out.
- **The consumer decides.** It groups its data into periods (`groupByCalendarPeriod`), aggregates each period (sum, average…), chooses the scale and writes every label and tooltip text.
- **The consumer frames.** It wraps the chart in `app-section-card` with its own heading.

## Inputs

| Input | Type | Default | Notes |
|---|---|---|---|
| `bars` | `readonly BarChartBar[]` | required | Oldest first. Empty draws the axes only. |
| `scale` | `BarChartScale` | required | The y-axis. |
| `ariaLabel` | `string` | required | Label of the SVG region, such as "Daily earnings chart". |
| `legend` | `readonly BarChartLegendItem[]` | `[]` | Shown above the plot. Hidden when empty. |

No outputs: which bar's tooltip is open is internal state.

## Models

| Model (file) | Fields | Rules |
|---|---|---|
| `ChartTone` (`chart-tone.type.ts`) | `'primary' \| 'secondary' \| 'inverse-primary' \| 'reward'` | Maps to `--mat-sys-primary`, `--mat-sys-secondary`, `--mat-sys-inverse-primary` and `--pd-sys-reward` in `bar-chart.scss`. `reward` (amber) is only for earned amounts. |
| `BarChartBar` (`bar-chart-bar.model.ts`) | `key: string`, `axisLabel: string`, `ariaLabel: string`, `segments: readonly BarChartSegment[]`, `tooltip: BarChartTooltip` | `key` is unique within `bars`: the period's start date. Segments stack bottom to top. No segments, or all zero, draws the zero bar. |
| `BarChartSegment` (`bar-chart-segment.model.ts`) | `value: number`, `tone: ChartTone` | `value >= 0`, in the scale's unit. |
| `BarChartScale` (`bar-chart-scale.model.ts`) | `max: number`, `tickLabels: readonly string[]` | `max > 0` is the top of the y-axis. There are at least 2 `tickLabels`, evenly spaced from 0 at the baseline to `max` at the top. The widest label sets where the plot starts. |
| `BarChartTooltip` (`bar-chart-tooltip.model.ts`) | `title: string`, `rows: readonly BarChartTooltipRow[]`, `note?: string` | `title` is shown in mono above a divider. `note` is an italic line after the rows ("No earnings recorded"). |
| `BarChartTooltipRow` (`bar-chart-tooltip-row.model.ts`) | `label: string`, `text?: string`, `amount?: number`, `signedAmount?: boolean`, `swatch?: ChartTone`, `emphasis?: boolean` | Exactly one of `text` (shown in mono, such as "9 / 10" or "3") or `amount` (shown as `app-amount size="sm"`, with a sign when `signedAmount`). `swatch` puts a series dot before the label. `emphasis` makes the row bold. |
| `BarChartLegendItem` (`bar-chart-legend-item.model.ts`) | `label: string`, `tone: ChartTone` | |

## Behaviour (moved unchanged from both charts)

- **Width**: the chart is drawn at its container's measured width (`ObserveWidth`), one SVG user unit per CSS pixel.
- **One geometry for every chart**: a 260-unit-high viewBox, shown 220–300px high. This is the earnings chart's size; the daily scores chart grows by 20px, an accepted visual change.
- **Plot area**: the plot starts after the widest tick label (`AXIS_CHAR_WIDTH`) plus a 5px gap. Each bar takes 65% of its slot, and at least 4px.
- **Bar height**: a segment's height is `value / scale.max` of the plot height, stacked from the baseline.
- **X-axis labels**:
  - Base interval: every bar up to 10 bars, every 2nd up to 16, every 5th up to 31, otherwise about 7 labels in all.
  - Labels thin out further until neighbours keep a 9px gap.
  - The first and last bars are always labelled.
  - A label is centred under its bar but clamped inside the chart's edges.
- **Tooltip**:
  - A mouse opens it on hover and it follows the pointer.
  - A tap or click toggles it.
  - Keyboard focus (`:focus-visible`) opens it at the top of the bar, and blur closes it.
  - `FloatAt` keeps it on screen.
- **Accessibility**: every bar is focusable (`tabindex="0"`) and labelled with its `ariaLabel`.
- **Hooks the e2e suites select on, kept unchanged**: `.chart-bar-group`, `.bar-hitbox`, `.zero-bar`, `.chart-tooltip`, `.legend-item`, `.axis-label`, and the consumers' own `app-earnings-chart` and `app-scores-chart` hosts.

## Consumers

| Consumer | Aggregation per bar | Scale | Tones | Tooltip |
|---|---|---|---|---|
| `EarningsChart` (`features/dashboard/`) | Sum per source over the period | `max` is the next multiple of 500 (at least 500), 4 divisions, labels from `MONEY_FORMAT` | Goals `reward`, daily tasks `primary`, pomodoro `inverse-primary`, daily scores `secondary`; legend lists all four | Period; **Total** (emphasis, amount); one row per earning source with a swatch; note "No earnings recorded" when the total is 0 |
| `ScoresChart` (`features/daily-scores/`) | The day's score, or the scored days' average floored to one decimal | `max` 10, 5 divisions | Below 9 `primary`, 9–10 `reward`; legend switches between daily and average wording | Period, with the weekday for a day; **Score** or **Average score** as "9 / 10"; **Days scored** "3 / 7" for a week or longer; **Reward** as a signed amount when above 0; note "No score recorded" when nothing was scored |
| `PomodoroHistoryChart` (`features/pomodoro/`, new) | Sum of `DailyPomodoroTally` over the period | `max` is the next multiple of 4 (at least 4), 4 divisions, whole numbers | `primary` only, no legend | Period; **Pomodoros** (emphasis, text); one text row per engagement type ("Work", "Study"); note "No pomodoros" when the count is 0 |

## Removed by the Migration

- `features/dashboard/models/chart-bar.model.ts`, `chart-bar-segment.model.ts`, `chart-grid-line.model.ts` and `tooltip-position.model.ts`. The last two duplicate the copies in `shared/models/`.
- `features/daily-scores/models/score-bar.model.ts`.
- The geometry, interaction and frame styles in `earnings-chart.ts|.html|.scss` and `scores-chart.ts|.html|.scss`. Each keeps only its aggregation, scale, tones, legend and tooltip content.

## Design System

- `BarChart` is a new core component. Add it to the catalogue in `docs/design_system.md`, and change the "Charts" row of the component mapping from "existing SVG components" to `app-bar-chart`.
- Add a live example to `src/app/features/design-system/design-system-page.html`.
