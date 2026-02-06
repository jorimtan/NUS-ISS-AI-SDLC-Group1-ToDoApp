/**
 * E2E Tests - Tag System
 * Tests PRP-06: Tag System
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Tag System', () => {
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
  });

  test('should create a new tag', async ({ page }) => {
    await helpers.createTag('Work', 0);
    
    // Verify tag was created by opening modal again
    await helpers.openTagManagementModal();
    await expect(page.locator('text=Work')).toBeVisible();
    await helpers.closeTagManagementModal();
  });

  test('should prevent duplicate tag names', async ({ page }) => {
    // Create first tag
    await helpers.createTag('Work', 0);
    
    // Try to create duplicate
    await helpers.openTagManagementModal();
    await page.click('button:has-text("Create New Tag")');
    await page.fill('input[placeholder="Tag name"]', 'Work');
    await page.click('button:has-text("Create")');

    // Should show error
    await expect(page.locator('text=Tag name already exists')).toBeVisible();
    
    await helpers.closeTagManagementModal();
  });

  test('should edit tag name and color', async ({ page }) => {
    await helpers.createTag('OldName', 0);
    await helpers.editTag('OldName', 'NewName', 1);
    
    // Verify changes
    await helpers.openTagManagementModal();
    await expect(page.locator('text=NewName')).toBeVisible();
    await expect(page.locator('text=OldName')).not.toBeVisible();
    await helpers.closeTagManagementModal();
  });

  test('should delete a tag', async ({ page }) => {
    await helpers.createTag('ToDelete', 0);
    
    // Verify it exists
    await helpers.openTagManagementModal();
    await expect(page.locator('text=ToDelete')).toBeVisible();
    await helpers.closeTagManagementModal();
    
    // Delete it
    await helpers.deleteTag('ToDelete');
    
    // Verify it's gone
    await helpers.openTagManagementModal();
    await expect(page.locator('text=ToDelete')).not.toBeVisible();
    await helpers.closeTagManagementModal();
  });

  test('should assign tags to a todo', async ({ page }) => {
    // Create tag first
    await helpers.createTag('Urgent', 0);
    
    // Create todo with tag
    await page.fill('input[placeholder*="What needs to be done"]', 'Tagged task');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    
    // Assign tag
    await helpers.assignTagsToTodo(['Urgent']);
    
    // Submit todo
    await page.click('button:has-text("Add Todo")');
    
    // Wait for todo to appear
    await page.waitForSelector('text=Tagged task', { timeout: 5000 });
    
    // Verify tag badge appears on todo
    const todoElement = await helpers.getTodoElement('Tagged task');
    await expect(todoElement.locator('text=Urgent')).toBeVisible();
  });

  test('should assign multiple tags to a todo', async ({ page }) => {
    // Create multiple tags
    await helpers.createTag('Work', 0);
    await helpers.createTag('Urgent', 1);
    await helpers.createTag('Client', 2);
    
    // Create todo with multiple tags
    await page.fill('input[placeholder*="What needs to be done"]', 'Multi-tag task');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    
    await helpers.assignTagsToTodo(['Work', 'Urgent', 'Client']);
    
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Multi-tag task', { timeout: 5000 });
    
    // Verify all tags appear
    const todoElement = await helpers.getTodoElement('Multi-tag task');
    await expect(todoElement.locator('text=Work')).toBeVisible();
    await expect(todoElement.locator('text=Urgent')).toBeVisible();
    await expect(todoElement.locator('text=Client')).toBeVisible();
  });

  test('should filter todos by tag', async ({ page }) => {
    // Create tags
    await helpers.createTag('Work', 0);
    await helpers.createTag('Personal', 1);
    
    // Create todos with different tags
    await page.fill('input[placeholder*="What needs to be done"]', 'Work task');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    await helpers.assignTagsToTodo(['Work']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Work task', { timeout: 5000 });
    
    await page.fill('input[placeholder*="What needs to be done"]', 'Personal task');
    await page.fill('input[type="datetime-local"]', '2026-03-15T11:00');
    await helpers.assignTagsToTodo(['Personal']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Personal task', { timeout: 5000 });
    
    // Filter by Work tag
    await helpers.filterByTag('Work');
    
    // Verify filtering
    await expect(page.locator('text=Work task')).toBeVisible();
    await expect(page.locator('text=Personal task')).not.toBeVisible();
    
    // Clear filter
    await helpers.clearTagFilter();
    
    // Both should be visible again
    await expect(page.locator('text=Work task')).toBeVisible();
    await expect(page.locator('text=Personal task')).toBeVisible();
  });

  test('should show usage count for tags', async ({ page }) => {
    await helpers.createTag('Test', 0);
    
    // Initially 0 usage
    let count = await helpers.getTagUsageCount('Test');
    expect(count).toBe(0);
    
    // Create todo with tag
    await page.fill('input[placeholder*="What needs to be done"]', 'Task 1');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    await helpers.assignTagsToTodo(['Test']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Task 1', { timeout: 5000 });
    
    // Usage should be 1
    count = await helpers.getTagUsageCount('Test');
    expect(count).toBe(1);
    
    // Create another todo with same tag
    await page.fill('input[placeholder*="What needs to be done"]', 'Task 2');
    await page.fill('input[type="datetime-local"]', '2026-03-15T11:00');
    await helpers.assignTagsToTodo(['Test']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Task 2', { timeout: 5000 });
    
    // Usage should be 2
    count = await helpers.getTagUsageCount('Test');
    expect(count).toBe(2);
  });

  test('should remove tag from todo when deleted', async ({ page }) => {
    // Create tag and todo with tag
    await helpers.createTag('Temp', 0);
    
    await page.fill('input[placeholder*="What needs to be done"]', 'Tagged task');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    await helpers.assignTagsToTodo(['Temp']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Tagged task', { timeout: 5000 });
    
    // Verify tag on todo
    let todoElement = await helpers.getTodoElement('Tagged task');
    await expect(todoElement.locator('text=Temp')).toBeVisible();
    
    // Delete tag
    await helpers.deleteTag('Temp');
    
    // Tag should be removed from todo
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    todoElement = await helpers.getTodoElement('Tagged task');
    await expect(todoElement.locator('text=Temp')).not.toBeVisible();
  });

  test('should edit tags on existing todo', async ({ page }) => {
    // Create tags
    await helpers.createTag('Tag1', 0);
    await helpers.createTag('Tag2', 1);
    
    // Create todo with Tag1
    await page.fill('input[placeholder*="What needs to be done"]', 'Edit tags task');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    await helpers.assignTagsToTodo(['Tag1']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Edit tags task', { timeout: 5000 });
    
    // Edit todo to change tag
    const todoElement = await helpers.getTodoElement('Edit tags task');
    await todoElement.locator('button:has-text("Edit")').click();
    
    // Remove Tag1 and add Tag2
    await todoElement.locator('text=Tag1').locator('xpath=ancestor::span').locator('button').click();
    await page.click('button:has-text("Select tags...")');
    await page.click('text=Tag2');
    
    // Save
    await todoElement.locator('button:has-text("Save")').click();
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify Tag2 is visible, Tag1 is not
    const updatedTodoElement = await helpers.getTodoElement('Edit tags task');
    await expect(updatedTodoElement.locator('text=Tag2')).toBeVisible();
    await expect(updatedTodoElement.locator('text=Tag1')).not.toBeVisible();
  });

  test('should maintain tags across page reload', async ({ page }) => {
    // Create tag and todo
    await helpers.createTag('Persist', 0);
    
    await page.fill('input[placeholder*="What needs to be done"]', 'Persistence test');
    await page.fill('input[type="datetime-local"]', '2026-03-15T10:00');
    await helpers.assignTagsToTodo(['Persist']);
    await page.click('button:has-text("Add Todo")');
    await page.waitForSelector('text=Persistence test', { timeout: 5000 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Tag should still be visible
    const todoElement = await helpers.getTodoElement('Persistence test');
    await expect(todoElement.locator('text=Persist')).toBeVisible();
  });

  test('should validate tag name length', async ({ page }) => {
    await helpers.openTagManagementModal();
    await page.click('button:has-text("Create New Tag")');
    
    // Try empty name
    await page.click('button:has-text("Create")');
    
    // Should prevent submission (HTML5 validation)
    const input = page.locator('input[placeholder="Tag name"]');
    const isInvalid = await input.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
    
    await helpers.closeTagManagementModal();
  });

  test('should show all tag colors', async ({ page }) => {
    await helpers.openTagManagementModal();
    await page.click('button:has-text("Create New Tag")');
    
    // Count color buttons (should be 10 based on TAG_COLORS)
    const colorButtons = page.locator('button[type="button"]').filter({ hasNot: page.locator('button:has-text("Create")') });
    const count = await colorButtons.count();
    
    // Should have 10 color options
    expect(count).toBeGreaterThanOrEqual(10);
    
    await helpers.closeTagManagementModal();
  });
});
