import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Recurring Todos (PRP-03)', () => {
  let helper: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelpers(page);
    await helper.setupNewUser();
    await page.goto('/');
  });

  test('should create daily recurring todo', async ({ page }) => {
    // Fill in todo details
    await page.fill('input[placeholder*="What needs to be done"]', 'Daily standup');
    await page.fill('input[type="datetime-local"]', '2026-02-10T09:00');
    
    // Show advanced options
    await page.click('button:has-text("Advanced Options")');
    
    // Select daily recurrence
    await page.selectOption('select[aria-label="Recurrence"]', 'daily');
    
    // Verify preview shows
    await expect(page.locator('text=Next 5 occurrences')).toBeVisible();
    
    // Submit form
    await page.click('button:has-text("Add Todo")');

    // Verify todo created with recurrence badge
    await expect(page.locator('text=Daily standup')).toBeVisible();
    await expect(page.locator('.bg-purple-100:has-text("Daily")')).toBeVisible();
  });

  test('should create weekly recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Weekly meeting');
    await page.fill('input[type="datetime-local"]', '2026-02-10T14:00');
    
    await page.click('button:has-text("Advanced Options")');
    await page.selectOption('select[aria-label="Recurrence"]', 'weekly');
    await page.click('button:has-text("Add Todo")');

    await expect(page.locator('text=Weekly meeting')).toBeVisible();
    await expect(page.locator('.bg-purple-100:has-text("Weekly")')).toBeVisible();
  });

  test('should create monthly recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Pay rent');
    await page.fill('input[type="datetime-local"]', '2026-02-01T10:00');
    
    await page.click('button:has-text("Advanced Options")');
    await page.selectOption('select[aria-label="Recurrence"]', 'monthly');
    await page.click('button:has-text("Add Todo")');

    await expect(page.locator('text=Pay rent')).toBeVisible();
    await expect(page.locator('.bg-purple-100:has-text("Monthly")')).toBeVisible();
  });

  test('should create yearly recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Health checkup');
    await page.fill('input[type="datetime-local"]', '2026-02-10T10:00');
    
    await page.click('button:has-text("Advanced Options")');
    await page.selectOption('select[aria-label="Recurrence"]', 'yearly');
    await page.click('button:has-text("Add Todo")');

    await expect(page.locator('text=Health checkup')).toBeVisible();
    await expect(page.locator('.bg-purple-100:has-text("Yearly")')).toBeVisible();
  });

  test('should create next instance when daily todo completed', async ({ page }) => {
    // Create daily recurring todo
    await helper.createTodo({
      title: 'Morning workout',
      dueDate: '2026-02-10T06:00',
      recurrence: 'daily',
    });

    // Mark as complete
    await page.click('input[type="checkbox"]');

    // Verify toast notification
    await expect(page.locator('text=Next instance created')).toBeVisible({ timeout: 3000 });

    // Verify two todos exist: completed and next instance
    const todoItems = page.locator('text=Morning workout');
    await expect(todoItems).toHaveCount(2);
    
    // Verify next instance has correct due date (one day later)
    await expect(page.locator('text=11 Feb')).toBeVisible();
  });

  test('should create next instance when weekly todo completed', async ({ page }) => {
    await helper.createTodo({
      title: 'Team meeting',
      dueDate: '2026-02-10T14:00',
      recurrence: 'weekly',
    });

    await page.click('input[type="checkbox"]');
    
    await expect(page.locator('text=Next instance created')).toBeVisible({ timeout: 3000 });
    
    // Next instance should be 7 days later (Feb 17)
    await expect(page.locator('text=17 Feb')).toBeVisible();
  });

  test('should copy tags to next recurring instance', async ({ page }) => {
    // Note: This test assumes tags feature is implemented (PRP-06)
    // For now, we'll skip tag copying test
    test.skip();
  });

  test('should copy subtasks to next recurring instance', async ({ page }) => {
    // Note: This test assumes subtasks feature is implemented (PRP-05)
    // For now, we'll skip subtask copying test
    test.skip();
  });

  test('should show recurrence preview', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Test preview');
    await page.fill('input[type="datetime-local"]', '2026-02-10T10:00');
    
    await page.click('button:has-text("Advanced Options")');
    await page.selectOption('select[aria-label="Recurrence"]', 'weekly');

    // Verify preview appears
    await expect(page.locator('text=Next 5 occurrences:')).toBeVisible();
    
    // Check at least some dates are shown
    await expect(page.locator('text=Feb 10')).toBeVisible();
    await expect(page.locator('text=Feb 17')).toBeVisible();
  });

  test('should allow removing recurrence pattern', async ({ page }) => {
    // Create recurring todo
    await helper.createTodo({
      title: 'Remove recurrence test',
      dueDate: '2026-02-10T10:00',
      recurrence: 'daily',
    });

    // Verify recurrence badge exists
    await expect(page.locator('.bg-purple-100:has-text("Daily")')).toBeVisible();

    // Edit todo
    await page.click('button:has-text("Edit")');
    
    // Remove recurrence
    await page.selectOption('select[aria-label="Recurrence"]', 'none');
    await page.click('button:has-text("Save")');

    // Mark as complete - should NOT create next instance
    await page.click('input[type="checkbox"]');
    
    // Should not show toast for next instance
    await expect(page.locator('text=Next instance created')).not.toBeVisible({ timeout: 2000 });
    
    // Should only be one todo (the completed one)
    const todoItems = page.locator('text=Remove recurrence test');
    await expect(todoItems).toHaveCount(1);
  });

  test('should persist recurrence pattern after page reload', async ({ page }) => {
    await helper.createTodo({
      title: 'Persist test',
      dueDate: '2026-02-10T10:00',
      recurrence: 'monthly',
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify recurrence badge still shows
    await expect(page.locator('text=Persist test')).toBeVisible();
    await expect(page.locator('.bg-purple-100:has-text("Monthly")')).toBeVisible();
  });

  test('should allow editing recurrence pattern', async ({ page }) => {
    await helper.createTodo({
      title: 'Edit recurrence',
      dueDate: '2026-02-10T10:00',
      recurrence: 'daily',
    });

    // Edit and change to weekly
    await page.click('button:has-text("Edit")');
    await page.selectOption('select[aria-label="Recurrence"]', 'weekly');
    await page.click('button:has-text("Save")');

    // Verify badge updated
    await expect(page.locator('.bg-purple-100:has-text("Weekly")')).toBeVisible();
    await expect(page.locator('.bg-purple-100:has-text("Daily")')).not.toBeVisible();
  });

  test('should handle monthly recurrence on month-end correctly', async ({ page }) => {
    // Create todo on Jan 31
    await helper.createTodo({
      title: 'Monthly report',
      dueDate: '2026-01-31T17:00',
      recurrence: 'monthly',
    });

    // Complete todo
    await page.click('input[type="checkbox"]');

    // Next instance should be Feb 28 (since Feb doesn't have 31 days)
    await expect(page.locator('text=28 Feb')).toBeVisible({ timeout: 3000 });
  });

  test('should not create next instance for non-recurring todo', async ({ page }) => {
    await helper.createTodo({
      title: 'One-time task',
      dueDate: '2026-02-10T10:00',
    });

    // Mark as complete
    await page.click('input[type="checkbox"]');

    // Should not show toast
    await expect(page.locator('text=Next instance created')).not.toBeVisible({ timeout: 2000 });

    // Should only be one todo
    const todoItems = page.locator('text=One-time task');
    await expect(todoItems).toHaveCount(1);
  });

  test('should show both completed and next instance in list', async ({ page }) => {
    await helper.createTodo({
      title: 'Recurring task',
      dueDate: '2026-02-10T10:00',
      recurrence: 'daily',
    });

    // Complete the todo
    await page.click('input[type="checkbox"]');

    // Wait for next instance to be created
    await page.waitForTimeout(1000);

    // Both should be visible (completed is grayed out, next is active)
    const allTodos = page.locator('text=Recurring task');
    await expect(allTodos).toHaveCount(2);
  });
});
