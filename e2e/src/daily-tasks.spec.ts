import { test, expect } from '@playwright/test';

test.describe('Daily Tasks Flow', () => {
  test('should create a new daily task with Save Task and display it in the list', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.locator('h2').first()).toContainText('Daily Tasks');

    // Click Add Daily Task button in header
    const addBtn = page.getByRole('button', { name: /Add Daily Task/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Form should appear
    await expect(page.locator('app-daily-task-form')).toBeVisible();

    // Fill title
    const titleInput = page.getByPlaceholder('e.g. Morning Workout');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Morning Running');

    // Click Save Task
    const saveBtn = page.getByRole('button', { name: /Save Task/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Form should close and task should be visible in the task list
    await expect(page.locator('app-daily-task-form')).not.toBeVisible();
    await expect(page.getByText('Morning Running')).toBeVisible();

    // Verify difficulties are rendered
    await expect(page.getByRole('button', { name: /Easy \(\+100\)/i })).toBeVisible();
  });
});
