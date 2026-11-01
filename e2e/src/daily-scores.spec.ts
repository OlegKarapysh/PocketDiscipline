import { test, expect } from '@playwright/test';

test.describe('Daily Scores Flow', () => {
  test('should navigate to daily scores page and render all components without freezing', async ({ page }) => {
    await page.goto('daily-scores');

    // Verify loading indicator is not visible
    await expect(page.locator('mat-spinner')).not.toBeVisible();

    // Verify stats cards are rendered with the period label
    await expect(page.locator('.stats-container')).toBeVisible();
    await expect(page.getByText('Average score (7 days)')).toBeVisible();
    await expect(page.getByText('Current streak')).toBeVisible();

    // Verify period filter and chart are rendered
    await expect(page.locator('app-period-filter')).toBeVisible();
    await expect(page.locator('app-scores-chart')).toBeVisible();
    await expect(page.locator('app-scores-chart .chart-bar-group')).toHaveCount(7);

    // Switching to 14 days updates both the average score card label and chart bars
    await page.locator('app-period-filter').getByRole('radio', { name: '14 days' }).click();
    await expect(page.getByText('Average score (14 days)')).toBeVisible();
    await expect(page.locator('app-scores-chart .chart-bar-group')).toHaveCount(14);

    // Verify score input prompt and 10 score buttons
    await expect(page.getByText("Today's score")).toBeVisible();
    const scoreButtons = page.locator('.scale-buttons .score-btn');
    await expect(scoreButtons).toHaveCount(10);
  });

  test(
    'should navigate via sidenav menu and submit a daily score successfully',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('dashboard');

      // Navigate to Daily Scores via Sidenav
      await page.getByRole('link', { name: 'Daily Scores' }).click();
      await expect(page).toHaveURL(/.*daily-scores/);

      // Verify loading state finishes
      await expect(page.locator('mat-spinner')).not.toBeVisible();

      // Select score 10
      await page.getByRole('button', { name: 'Score 10' }).click();

      // Submit button should appear
      const submitButton = page.getByRole('button', { name: 'Save score' });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Verify reward success message appears
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText(
        'Score saved. You earned 500 ₴. High-score streak: 1',
      );

      // Verify readonly state is displayed for today's score
      await expect(page.locator('.readonly-container')).toBeVisible();
      await expect(page.locator('.readonly-score-num')).toHaveText('10');
      await expect(page.getByText('Score set for today')).toBeVisible();

      // Verify streak is updated in the stats card
      await expect(page.locator('.stat-value.streak')).toHaveText('1');
    },
  );

  test('should chart a range longer than 90 days week by week', async ({ page }) => {
    await page.goto('daily-scores');
    const filter = page.locator('app-period-filter');
    await filter.getByRole('radio', { name: 'Custom' }).click();
    await filter.getByPlaceholder('Start date').fill('1/1/2025');
    await filter.getByPlaceholder('End date').fill('6/30/2025');
    await filter.getByPlaceholder('End date').blur();

    const chart = page.locator('app-scores-chart');
    await expect(chart.getByRole('heading', { name: 'Weekly average scores' })).toBeVisible();
    // Wednesday 1 January to Sunday 5 January, then 26 weeks from Monday 6 January to Monday 30 June.
    await expect(chart.locator('.chart-bar-group')).toHaveCount(27);
    await expect(chart.getByLabel('2025-06-30: No score')).toBeVisible();
  });
});
