/**
 * E2E Tests - Search & Filtering
 * Tests PRP-08: Search & Filtering
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Search & Filtering', () => {
  let helpers: TestHelpers;
  let username: string;

  test.beforeEach(async ({ page, context }) => {
    // Set up virtual authenticator for WebAuthn
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('WebAuthn.enable');
    await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    helpers = new TestHelpers(page);
    username = `testuser_${Date.now()}`;

    // Register and login
    await helpers.registerUser(username);

    // Create diverse test data
    await helpers.createTodo('Morning Meeting', '2026-03-15T09:00', 'high', [], 'none', null);
    await helpers.createTodo('Grocery Shopping', '2026-03-16T10:00', 'low', [], 'none', null);
    await helpers.createTodo('Project Review', '2026-03-17T14:00', 'medium', [], 'none', null);
    await helpers.createTodo('Team Standup', '2026-03-18T09:30', 'medium', [], 'none', null);
  });

  test('should filter todos by search text', async ({ page }) => {
    await helpers.searchTodos('meeting');

    // Verify Morning Meeting is visible
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    
    // Verify other todos are not visible
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
    await expect(page.locator('text=Project Review')).not.toBeVisible();
  });

  test('should clear search with X button', async ({ page }) => {
    await helpers.searchTodos('meeting');
    
    // Only one todo visible
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
    
    // Clear search
    await helpers.clearSearch();
    
    // All todos visible again
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).toBeVisible();
    await expect(page.locator('text=Project Review')).toBeVisible();
  });

  test('should debounce search input', async ({ page }) => {
    // Type quickly
    await page.fill('input[aria-label="Search todos"]', 'm');
    await page.fill('input[aria-label="Search todos"]', 'me');
    await page.fill('input[aria-label="Search todos"]', 'mee');
    await page.fill('input[aria-label="Search todos"]', 'meet');
    
    // Wait for debounce
    await page.waitForTimeout(400);
    
    // Should now filter
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
  });

  test('should search case-insensitively', async ({ page }) => {
    await helpers.searchTodos('MEETING');
    
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
  });

  test('should search partial matches', async ({ page }) => {
    await helpers.searchTodos('shop');
    
    await expect(page.locator('text=Grocery Shopping')).toBeVisible();
    await expect(page.locator('text=Morning Meeting')).not.toBeVisible();
  });

  test('should show advanced filters panel', async ({ page }) => {
    await helpers.openAdvancedFilters();
    
    // Verify filter controls are visible
    await expect(page.locator('select[id="priority-filter"]')).toBeVisible();
    await expect(page.locator('select[id="tag-filter"]')).toBeVisible();
    await expect(page.locator('select[id="status-filter"]')).toBeVisible();
  });

  test('should toggle search mode', async ({ page }) => {
    await helpers.setSearchMode('advanced');
    
    // Verify advanced mode selected
    const advancedButton = page.locator('button:has-text("Advanced (All fields)")');
    await expect(advancedButton).toHaveClass(/bg-blue-600/);
  });

  test('should filter by priority', async ({ page }) => {
    await helpers.filterByPriorityAdvanced('high');
    
    // Only high priority todo visible
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
    await expect(page.locator('text=Project Review')).not.toBeVisible();
  });

  test('should filter by completion status', async ({ page }) => {
    // Complete one todo
    await helpers.toggleTodoCompletion('Morning Meeting');
    
    // Filter for complete only
    await helpers.filterByStatus('complete');
    
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
    
    // Filter for incomplete only
    await helpers.filterByStatus('incomplete');
    
    await expect(page.locator('text=Morning Meeting')).not.toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).toBeVisible();
  });

  test('should combine multiple filters', async ({ page }) => {
    // Search + Priority filter
    await helpers.searchTodos('meet');
    await helpers.filterByPriorityAdvanced('high');
    
    // Only Morning Meeting matches both
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Team Standup')).not.toBeVisible();  // Has "meet" but wrong priority
  });

  test('should show results count', async ({ page }) => {
    await helpers.searchTodos('meeting');
    
    const countText = await helpers.getResultsCountText();
    expect(countText).toContain('showing 1 of 4');
  });

  test('should show no results message', async ({ page }) => {
    await helpers.searchTodos('nonexistent task xyz');
    
    const noResults = await helpers.isNoResultsVisible();
    expect(noResults).toBe(true);
    
    // Clear filters button should be visible
    await expect(page.locator('button:has-text("Clear all filters")')).toBeVisible();
  });

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    await helpers.searchTodos('meeting');
    await helpers.filterByPriorityAdvanced('high');
    await helpers.filterByStatus('incomplete');
    
    // Verify filters are active
    const activeCount = await helpers.getActiveFilterCount();
    expect(activeCount).toBeGreaterThan(0);
    
    // Clear all
    await helpers.clearAllFilters();
    
    // All todos should be visible again
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).toBeVisible();
    await expect(page.locator('text=Project Review')).toBeVisible();
    await expect(page.locator('text=Team Standup')).toBeVisible();
  });

  test('should show active filter count badge', async ({ page }) => {
    // No filters initially
    let count = await helpers.getActiveFilterCount();
    expect(count).toBe(0);
    
    // Add one filter
    await helpers.searchTodos('meeting');
    await page.waitForTimeout(500);
    
    count = await helpers.getActiveFilterCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by date range', async ({ page }) => {
    await helpers.setDateRangeFilter('2026-03-15', '2026-03-16');
    
    // Only todos in date range visible
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).toBeVisible();
    await expect(page.locator('text=Project Review')).not.toBeVisible();
  });

  test('should clear date range filter', async ({ page }) => {
    await helpers.setDateRangeFilter('2026-03-15', '2026-03-16');
    
    // Date range applied
    await expect(page.locator('text=Project Review')).not.toBeVisible();
    
    // Clear date range
    await helpers.clearDateRangeFilter();
    
    // All todos visible again
    await expect(page.locator('text=Project Review')).toBeVisible();
  });

  test('should search in subtasks (advanced mode)', async ({ page }) => {
    // Create todo with subtask
    await helpers.createTodo('Shopping List', '2026-03-20T10:00', 'low', [], 'none', null);
    await helpers.addSubtask('Shopping List', 'Buy organic milk');
    
    // Simple mode - won't find subtask
    await helpers.setSearchMode('simple');
    await helpers.searchTodos('milk');
    await expect(page.locator('text=Shopping List')).not.toBeVisible();
    
    // Advanced mode - will find subtask
    await helpers.setSearchMode('advanced');
    await helpers.searchTodos('milk');
    await page.waitForTimeout(400);
    await expect(page.locator('text=Shopping List')).toBeVisible();
  });

  test('should maintain filter state when adding new todo', async ({ page }) => {
    await helpers.filterByPriorityAdvanced('high');
    
    // Only one high priority todo
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
    
    // Add new high priority todo
    await helpers.createTodo('Urgent Task', '2026-03-19T15:00', 'high', [], 'none', null);
    
    // New todo should be visible (matches filter)
    await expect(page.locator('text=Urgent Task')).toBeVisible();
    
    // Low priority still hidden
    await expect(page.locator('text=Grocery Shopping')).not.toBeVisible();
  });

  test('should handle empty search gracefully', async ({ page }) => {
    await helpers.searchTodos('');
    
    // All todos visible with empty search
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
    await expect(page.locator('text=Grocery Shopping')).toBeVisible();
    await expect(page.locator('text=Project Review')).toBeVisible();
  });

  test('should handle special characters in search', async ({ page }) => {
    // Create todo with special characters
    await helpers.createTodo('[Important] Project #1', '2026-03-21T10:00', 'high', [], 'none', null);
    
    // Search for special characters
    await helpers.searchTodos('[Important]');
    await expect(page.locator('text=[Important] Project #1')).toBeVisible();
    await expect(page.locator('text=Morning Meeting')).not.toBeVisible();
  });
});
