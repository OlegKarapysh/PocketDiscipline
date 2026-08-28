import { test, expect } from '@playwright/test';

test.describe('Daily Scores Flow', () => {
  test('should navigate to daily scores page and render all components without freezing', async ({ page }) => {
    await page.goto('/daily-scores');

    // Verify loading indicator is not visible
    await expect(page.locator('.loading-state')).not.toBeVisible();

    // Verify page header
    await expect(page.locator('h1')).toHaveText('Daily Scores');

    // Verify stats cards are rendered
    await expect(page.locator('.stats-container')).toBeVisible();
    await expect(page.getByText('Month Avg')).toBeVisible();
    await expect(page.getByText('Current Streak')).toBeVisible();

    // Verify 7-day chart is rendered
    await expect(page.locator('.chart-container')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Last 7 Days' })).toBeVisible();
    await expect(page.locator('.bars .bar-wrapper')).toHaveCount(7);

    // Verify score input prompt and 10 score buttons
    await expect(page.getByRole('heading', { name: 'How was your discipline today?' })).toBeVisible();
    const scoreButtons = page.locator('.score-buttons button');
    await expect(scoreButtons).toHaveCount(10);
  });

  test('should navigate via sidenav menu and submit a daily score successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Daily Scores via Sidenav
    await page.locator('mat-nav-list a[routerLink="/daily-scores"]').click();
    await expect(page).toHaveURL(/.*daily-scores/);

    // Verify loading state finishes
    await expect(page.locator('.loading-state')).not.toBeVisible();

    // Select score 10
    await page.locator('.score-buttons button', { hasText: '10' }).click();

    // Submit button should appear
    const submitButton = page.getByRole('button', { name: 'Submit Score' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Verify reward success message appears
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Awesome! You earned 500₴. Current high score streak: 1');

    // Verify readonly state is displayed for today's score
    await expect(page.locator('.readonly-score')).toBeVisible();
    await expect(page.locator('.readonly-score .score-circle')).toHaveText('10');
    await expect(page.getByText('Score set for today!')).toBeVisible();

    // Verify streak is updated in the stats card
    await expect(page.locator('.stat-value.streak')).toHaveText('1');
  });
});
