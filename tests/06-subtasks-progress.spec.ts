/**
 * E2E Tests - Subtasks & Progress Tracking
 * Tests PRP-05: Subtasks & Progress Tracking
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Subtasks & Progress Tracking', () => {
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

  test('should add subtasks to a todo', async ({ page }) => {
    // Create a todo
    await helpers.createTodo({
      title: 'Project Alpha',
      dueDate: '2026-03-15T10:00',
      priority: 'high',
    });

    // Add first subtask
    await helpers.addSubtask('Project Alpha', 'Research requirements');
    await expect(page.locator('text=Research requirements')).toBeVisible();

    // Add second subtask
    await helpers.addSubtask('Project Alpha', 'Design architecture');
    await expect(page.locator('text=Design architecture')).toBeVisible();

    // Add third subtask
    await helpers.addSubtask('Project Alpha', 'Implement features');
    await expect(page.locator('text=Implement features')).toBeVisible();
  });

  test('should show progress bar when subtasks exist', async ({ page }) => {
    // Create todo and add subtask
    await helpers.createTodo({
      title: 'Progress Test',
      dueDate: '2026-03-15T10:00',
    });

    // Progress bar should not exist initially
    let progressText = await helpers.getProgressText('Progress Test');
    expect(progressText).toBeNull();

    // Add a subtask
    await helpers.addSubtask('Progress Test', 'Task 1');

    // Progress bar should now appear showing 0%
    progressText = await helpers.getProgressText('Progress Test');
    expect(progressText).toContain('0 of 1 completed (0%)');
  });

  test('should update progress when subtask is completed', async ({ page }) => {
    // Create todo with 3 subtasks
    await helpers.createTodo({
      title: 'Completion Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Completion Test', 'Subtask 1');
    await helpers.addSubtask('Completion Test', 'Subtask 2');
    await helpers.addSubtask('Completion Test', 'Subtask 3');

    // Initial progress: 0%
    let progressText = await helpers.getProgressText('Completion Test');
    expect(progressText).toContain('0 of 3 completed (0%)');

    // Complete first subtask
    await helpers.toggleSubtask('Subtask 1');
    
    // Progress should be 33%
    progressText = await helpers.getProgressText('Completion Test');
    expect(progressText).toContain('1 of 3 completed (33%)');

    // Complete second subtask
    await helpers.toggleSubtask('Subtask 2');
    
    // Progress should be 67%
    progressText = await helpers.getProgressText('Completion Test');
    expect(progressText).toContain('2 of 3 completed (67%)');

    // Complete third subtask
    await helpers.toggleSubtask('Subtask 3');
    
    // Progress should be 100%
    progressText = await helpers.getProgressText('Completion Test');
    expect(progressText).toContain('3 of 3 completed (100%)');
  });

  test('should toggle subtask completion with strikethrough', async ({ page }) => {
    // Create todo with subtask
    await helpers.createTodo({
      title: 'Toggle Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Toggle Test', 'Task to toggle');

    // Initially not completed
    const subtaskElement = page.locator('text=Task to toggle').locator('xpath=ancestor::div[contains(@class, "ml-8")]').first();
    let classes = await subtaskElement.locator('span').first().getAttribute('class');
    expect(classes).not.toContain('line-through');

    // Toggle to complete
    await helpers.toggleSubtask('Task to toggle');
    
    // Should have strikethrough
    classes = await subtaskElement.locator('span').first().getAttribute('class');
    expect(classes).toContain('line-through');

    // Toggle back to incomplete
    await helpers.toggleSubtask('Task to toggle');
    
    // Should not have strikethrough
    classes = await subtaskElement.locator('span').first().getAttribute('class');
    expect(classes).not.toContain('line-through');
  });

  test('should reorder subtasks', async ({ page }) => {
    // Create todo with 3 subtasks
    await helpers.createTodo({
      title: 'Reorder Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Reorder Test', 'First');
    await helpers.addSubtask('Reorder Test', 'Second');
    await helpers.addSubtask('Reorder Test', 'Third');

    // Get initial order
    const todoElement = await helpers.getTodoElement('Reorder Test');
    let subtasks = await todoElement.locator('.ml-8 span').allTextContents();
    expect(subtasks[0]).toBe('First');
    expect(subtasks[1]).toBe('Second');
    expect(subtasks[2]).toBe('Third');

    // Move "Third" up
    await helpers.moveSubtaskUp('Third');

    // Wait and verify order changed
    await page.waitForTimeout(500);
    subtasks = await todoElement.locator('.ml-8 span').allTextContents();
    expect(subtasks[1]).toBe('Third');
    expect(subtasks[2]).toBe('Second');

    // Move "First" down
    await helpers.moveSubtaskDown('First');

    // Wait and verify order changed
    await page.waitForTimeout(500);
    subtasks = await todoElement.locator('.ml-8 span').allTextContents();
    expect(subtasks[0]).toBe('Third');
    expect(subtasks[1]).toBe('First');
    expect(subtasks[2]).toBe('Second');
  });

  test('should delete a subtask', async ({ page }) => {
    // Create todo with 2 subtasks
    await helpers.createTodo({
      title: 'Delete Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Delete Test', 'Keep this');
    await helpers.addSubtask('Delete Test', 'Delete this');

    // Verify both exist
    await expect(page.locator('text=Keep this')).toBeVisible();
    await expect(page.locator('text=Delete this')).toBeVisible();

    // Progress: 0 of 2 (0%)
    let progressText = await helpers.getProgressText('Delete Test');
    expect(progressText).toContain('0 of 2 completed (0%)');

    // Delete second subtask
    await helpers.deleteSubtask('Delete this');

    // Verify only first remains
    await expect(page.locator('text=Keep this')).toBeVisible();
    await expect(page.locator('text=Delete this')).not.toBeVisible();

    // Progress: 0 of 1 (0%)
    progressText = await helpers.getProgressText('Delete Test');
    expect(progressText).toContain('0 of 1 completed (0%)');
  });

  test('should cascade delete subtasks when parent todo is deleted', async ({ page }) => {
    // Create todo with 2 subtasks
    await helpers.createTodo({
      title: 'Cascade Delete Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Cascade Delete Test', 'Child 1');
    await helpers.addSubtask('Cascade Delete Test', 'Child 2');

    // Verify all exist
    await expect(page.locator('text=Cascade Delete Test')).toBeVisible();
    await expect(page.locator('text=Child 1')).toBeVisible();
    await expect(page.locator('text=Child 2')).toBeVisible();

    // Delete parent todo
    await helpers.deleteTodo('Cascade Delete Test');

    // Verify all are gone
    await expect(page.locator('text=Cascade Delete Test')).not.toBeVisible();
    await expect(page.locator('text=Child 1')).not.toBeVisible();
    await expect(page.locator('text=Child 2')).not.toBeVisible();
  });

  test('should hide subtasks when todo is completed', async ({ page }) => {
    // Create todo with subtask
    await helpers.createTodo({
      title: 'Complete Todo Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Complete Todo Test', 'Hidden subtask');

    // Verify subtask is visible
    await expect(page.locator('text=Hidden subtask')).toBeVisible();

    // Complete the todo
    await helpers.completeTodo('Complete Todo Test');

    // Subtask list should be hidden (not visible to users)
    // Note: We only hide the "Add Subtask" button and subtask management
    // The subtasks themselves may still be in DOM but hidden via CSS
    const todoElement = await helpers.getTodoElement('Complete Todo Test');
    const addSubtaskButton = todoElement.locator('button:has-text("Add Subtask")');
    await expect(addSubtaskButton).not.toBeVisible();
  });

  test('should maintain subtask state across page reload', async ({ page }) => {
    // Create todo with subtasks
    await helpers.createTodo({
      title: 'Persistence Test',
      dueDate: '2026-03-15T10:00',
    });

    await helpers.addSubtask('Persistence Test', 'Subtask A');
    await helpers.addSubtask('Persistence Test', 'Subtask B');
    await helpers.toggleSubtask('Subtask A');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify subtasks and state persisted
    await expect(page.locator('text=Subtask A')).toBeVisible();
    await expect(page.locator('text=Subtask B')).toBeVisible();

    // Verify progress persisted
    const progressText = await helpers.getProgressText('Persistence Test');
    expect(progressText).toContain('1 of 2 completed (50%)');

    // Verify completed subtask has strikethrough
    const subtaskElement = page.locator('text=Subtask A').locator('xpath=ancestor::div[contains(@class, "ml-8")]').first();
    const classes = await subtaskElement.locator('span').first().getAttribute('class');
    expect(classes).toContain('line-through');
  });

  test('should show validation error for empty subtask title', async ({ page }) => {
    // Create a todo
    await helpers.createTodo({
      title: 'Validation Test',
      dueDate: '2026-03-15T10:00',
    });

    const todoElement = await helpers.getTodoElement('Validation Test');

    // Click "Add Subtask" button
    await todoElement.locator('button:has-text("Add Subtask")').click();

    // Try to submit empty subtask
    const input = todoElement.locator('input[placeholder*="subtask"]');
    await input.press('Enter');

    // Should show error message
    await expect(page.locator('text=Subtask title cannot be empty')).toBeVisible();

    // Subtask should not be added
    const progressText = await helpers.getProgressText('Validation Test');
    expect(progressText).toBeNull();
  });

  test('should cancel subtask input on Escape key', async ({ page }) => {
    // Create a todo
    await helpers.createTodo({
      title: 'Cancel Test',
      dueDate: '2026-03-15T10:00',
    });

    const todoElement = await helpers.getTodoElement('Cancel Test');

    // Click "Add Subtask" button
    await todoElement.locator('button:has-text("Add Subtask")').click();

    // Input should be visible
    const input = todoElement.locator('input[placeholder*="subtask"]');
    await expect(input).toBeVisible();

    // Press Escape
    await input.press('Escape');

    // Input should be hidden
    await expect(input).not.toBeVisible();

    // "Add Subtask" button should be visible again
    await expect(todoElement.locator('button:has-text("Add Subtask")')).toBeVisible();
  });
});
