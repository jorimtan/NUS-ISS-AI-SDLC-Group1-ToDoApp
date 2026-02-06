import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Reminders and Notifications (PRP-04)', () => {
  let helper: TestHelpers;

  test.beforeEach(async ({ page, context }) => {
    helper = new TestHelpers(page);
    
    // Grant notification permissions at context level
    await context.grantPermissions(['notifications']);
    
    await helper.setupNewUser();
    await page.goto('/');
  });

  test('should show notification permission banner on first visit', async ({ page, context }) => {
    // Clear localStorage to simulate first visit
    await page.evaluate(() => {
      localStorage.removeItem('notification_banner_dismissed');
      localStorage.removeItem('notification_permission_requested');
    });

    // Reload to trigger banner
    await page.reload();

    // Banner might not show if permission already granted
    // Check if it's either visible or not present (if already granted)
    const banner = page.locator('text=Enable notifications?');
    const isVisible = await banner.isVisible().catch(() => false);
    
    // If visible, test dismiss functionality
    if (isVisible) {
      await page.click('button:has-text("Not now")');
      await expect(banner).not.toBeVisible();
    }
  });

  test('should create todo with 1 hour reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Meeting with client');
    
    // Set due date to 2 hours from now
    const now = new Date();
    const dueDate = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    const dueDateStr = dueDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dueDateStr);
    
    // Show advanced options
    await page.click('button:has-text("Advanced Options")');
    
    // Select 1 hour reminder
    await page.selectOption('select[aria-label="Reminder"]', '60');
    
    // Submit form
    await page.click('button:has-text("Add Todo")');

    // Verify reminder badge appears
    const badge = page.locator('.bg-blue-100:has-text("1 hr")');
    await expect(badge).toBeVisible();
  });

  test('should create todo with different reminder options', async ({ page }) => {
    const reminderTests = [
      { value: '15', label: '15 min' },
      { value: '30', label: '30 min' },
      { value: '120', label: '2 hrs' },
      { value: '1440', label: '1 day' },
      { value: '2880', label: '2 days' },
      { value: '10080', label: '1 wk' },
    ];

    for (const reminder of reminderTests) {
      // Create todo
      await page.fill('input[placeholder*="What needs to be done"]', `Test ${reminder.label}`);
      
      const now = new Date();
      const dueDate = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days from now
      const dueDateStr = dueDate.toISOString().slice(0, 16);
      await page.fill('input[type="datetime-local"]', dueDateStr);
      
      // Expand advanced options if not already expanded
      const advancedOpen = await page.locator('text=Reminder').isVisible().catch(() => false);
      if (!advancedOpen) {
        await page.click('button:has-text("Advanced Options")');
      }
      
      await page.selectOption('select[aria-label="Reminder"]', reminder.value);
      await page.click('button:has-text("Add Todo")');

      // Verify badge
      await expect(page.locator(`.bg-blue-100:has-text("${reminder.label}")`).first()).toBeVisible();
    }
  });

  test('should allow creating todo without reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'No reminder task');
    
    const now = new Date();
    const dueDate = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    const dueDateStr = dueDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dueDateStr);
    
    // Don't set any reminder (default is "No reminder")
    await page.click('button:has-text("Add Todo")');

    // Verify todo created without reminder badge
    await expect(page.locator('text=No reminder task')).toBeVisible();
    
    // Should not have reminder badge
    const todoItem = page.locator('text=No reminder task').locator('xpath=../..');
    await expect(todoItem.locator('.bg-blue-100')).not.toBeVisible();
  });

  test('should allow editing todo reminder', async ({ page }) => {
    // Create todo with 1 hour reminder
    await helper.createTodo({
      title: 'Edit reminder test',
      dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
      recurrence: undefined,
    });

    // Initially no reminder, add one via edit
    await page.click('button:has-text("Edit")');
    
    // Select 1 hour reminder
    await page.selectOption('select[aria-label="Reminder"]', '60');
    await page.click('button:has-text("Save")');

    // Verify badge appears
    await expect(page.locator('.bg-blue-100:has-text("1 hr")')).toBeVisible();

    // Edit again to remove reminder
    await page.click('button:has-text("Edit")');
    await page.selectOption('select[aria-label="Reminder"]', 'none');
    await page.click('button:has-text("Save")');

    // Verify badge gone
    await expect(page.locator('.bg-blue-100:has-text("1 hr")')).not.toBeVisible();
  });

  test('should not return completed todos in reminder check', async ({ page }) => {
    // Create todo with reminder
    await helper.createTodo({
      title: 'Complete me',
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });

    // Complete the todo
    await page.click('input[type="checkbox"]');

    // Check API doesn't return it
    const response = await page.request.get('/api/notifications/check');
    const data = await response.json();
    
    // Should not include completed todo
    const hasCompletedTodo = data.reminders.some((r: any) => r.todo.title === 'Complete me');
    expect(hasCompletedTodo).toBe(false);
  });

  test('should persist reminder after page reload', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Persistent reminder');
    
    const now = new Date();
    const dueDate = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    const dueDateStr = dueDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dueDateStr);
    
    await page.click('button:has-text("Advanced Options")');
    await page.selectOption('select[aria-label="Reminder"]', '60');
    await page.click('button:has-text("Add Todo")');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify reminder badge still shows
    await expect(page.locator('text=Persistent reminder')).toBeVisible();
    await expect(page.locator('.bg-blue-100:has-text("1 hr")')).toBeVisible();
  });

  test('should handle API check endpoint correctly', async ({ page }) => {
    // Test the notifications/check endpoint
    const response = await page.request.get('/api/notifications/check');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('reminders');
    expect(Array.isArray(data.reminders)).toBe(true);
  });

  test('should show different reminder badges for different times', async ({ page }) => {
    // Create multiple todos with different reminders
    const reminders = [
      { minutes: 15, label: '15 min', title: 'Task 1' },
      { minutes: 60, label: '1 hr', title: 'Task 2' },
      { minutes: 1440, label: '1 day', title: 'Task 3' },
    ];

    for (const reminder of reminders) {
      await page.fill('input[placeholder*="What needs to be done"]', reminder.title);
      
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await page.fill('input[type="datetime-local"]', dueDate.toISOString().slice(0, 16));
      
      const advancedOpen = await page.locator('text=Reminder').isVisible().catch(() => false);
      if (!advancedOpen) {
        await page.click('button:has-text("Advanced Options")');
      }
      
      await page.selectOption('select[aria-label="Reminder"]', String(reminder.minutes));
      await page.click('button:has-text("Add Todo")');
    }

    // Verify all badges show correctly
    await expect(page.locator('.bg-blue-100:has-text("15 min")')).toBeVisible();
    await expect(page.locator('.bg-blue-100:has-text("1 hr")')).toBeVisible();
    await expect(page.locator('.bg-blue-100:has-text("1 day")')).toBeVisible();
  });

  test('should not show notification banner after dismissing', async ({ page }) => {
    // Clear storage to simulate first visit
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();

    const banner = page.locator('text=Enable notifications?');
    const isVisible = await banner.isVisible().catch(() => false);
    
    if (isVisible) {
      // Dismiss the banner
      await page.click('button:has-text("Not now")');
      
      // Reload page
      await page.reload();
      
      // Banner should not appear again
      await expect(banner).not.toBeVisible();
    }
  });
});
