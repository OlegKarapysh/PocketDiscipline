# Quickstart & Validation Guide: Dashboard Earnings Chart and Statistics

This guide describes how to validate the Dashboard Earnings Chart and Statistics feature locally.

## Prerequisites

- Application dependencies installed (`npm install`).
- Development server running (`npm start` or `ng serve`).
- Pocket Discipline open in the browser (default: `http://localhost:4200`).

---

## Validation Scenarios

### Scenario 1: Default 7-Day Stacked Bar Chart on Dashboard Load
1. Open the application in your browser and click on the **Dashboard** tab.
2. Verify that below the balance widget, an **Earnings Overview** section appears.
3. Verify that the **Last 7 Days** preset is active by default.
4. Verify that the chart renders an SVG stacked bar for each of the last 7 consecutive calendar days (including 0-height bars for days with no activity).

---

### Scenario 2: Inspecting Bar Segments and Tooltips
1. On the 7-day chart, hover over or tap a bar that contains earnings.
2. Verify that a tooltip appears indicating:
   - The specific date (e.g., "Sep 2, 2026").
   - The total amount earned on that day.
   - The breakdown by activity category with corresponding color swatches:
     - Goals
     - Daily Tasks
     - Pomodoro
     - Daily Scores
3. Hover over a day with zero earnings and verify that it clearly indicates 0 pts without UI glitch.

---

### Scenario 3: Switching Presets & Custom Date Range
1. In the period filter controls, click **Last 14 Days**.
2. Verify that the chart updates immediately to render 14 consecutive daily bars.
3. Click **Last 30 Days** and verify 30 daily bars appear in chronological sequence.
4. Select **Custom** and use the date range picker to choose a specific 5-day window in the past.
5. Verify that only those 5 days are plotted on the chart.

---

### Scenario 4: Current Month Daily Average Calculation
1. Locate the **Monthly Earnings Summary** card on the Dashboard.
2. Verify that the current month and year are displayed (e.g., "September 2026").
3. Verify that the subtitle indicates calculation based on elapsed days (e.g., "Based on 2 elapsed days").
4. Verify the math: `Average per Day = Total Month Earnings / Elapsed Days`.

---

### Scenario 5: Monthly Navigation to Past Months
1. Click the `<` (previous month) button in the monthly statistics card.
2. Verify that the label changes to the previous month (e.g., "August 2026").
3. Verify that the calculation uses the total calendar days of August (31 days) as the denominator:
   `Average per Day = Total August Earnings / 31`.
4. Click `>` to return to the current month.

---

### Scenario 6: End-to-End Activity Earning Reflection
1. Note the current day's earnings on the Dashboard chart.
2. Navigate to the **Daily Scores** tab and submit a high score (score 10) to earn points.
3. Navigate back to the **Dashboard** tab.
4. Verify that today's bar immediately reflects the added points in the Daily Scores color segment, and the current month's total and daily average increase accordingly.
