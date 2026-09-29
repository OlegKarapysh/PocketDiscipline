import { test, expect } from '@playwright/test';

test.describe('Daily Scores Flow', () => {
  test('should navigate to daily scores page and render all components without freezing', async ({ page }) => {
    await page.goto('/daily-scores');

    // Verify loading indicator is not visible
    await expect(page.locator('mat-spinner')).not.toBeVisible();

    // Verify stats cards are rendered
    await expect(page.locator('.stats-container')).toBeVisible();
    await expect(page.getByText('Monthly average')).toBeVisible();
    await expect(page.getByText('Current streak')).toBeVisible();

    // Verify 7-day chart is rendered
    await expect(page.locator('app-scores-chart')).toBeVisible();
    await expect(page.getByText('Last 7 days')).toBeVisible();
    await expect(page.locator('.bars .bar-wrapper')).toHaveCount(7);

    // Verify score input prompt and 10 score buttons
    await expect(page.getByText("Today's score")).toBeVisible();
    const scoreButtons = page.locator('.scale-buttons .score-btn');
    await expect(scoreButtons).toHaveCount(10);
  });

  test('should navigate via sidenav menu and submit a daily score successfully', async ({ page }) => {
    await page.goto('/dashboard');

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
    await expect(page.locator('.success-message')).toContainText('Score saved. You earned 500 ₴. High-score streak: 1');

    // Verify readonly state is displayed for today's score
    await expect(page.locator('.readonly-container')).toBeVisible();
    await expect(page.locator('.readonly-score-num')).toHaveText('10');
    await expect(page.getByText('Score set for today')).toBeVisible();

    // Verify streak is updated in the stats card
    await expect(page.locator('.stat-value.streak')).toHaveText('1');
  });
});
