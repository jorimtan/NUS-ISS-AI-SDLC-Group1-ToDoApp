/**
 * E2E Tests - Priority System
 * Tests PRP-02: Priority System functionality
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Priority System', () => {
  let helpers: TestHelpers;
  let username: string;

  test.beforeEach(async ({ page, context }) => {
    // Set up virtual authenticator
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

  test('should create todo with default medium priority', async ({ page }) => {
    const todoTitle = 'Default priority task';

    await page.fill('input[placeholder*="What needs to be done"]', todoTitle);
    await page.click('button:has-text("Add Todo")');

    // Verify medium priority badge
    const todoElement = await helpers.getTodoElement(todoTitle);
    await expect(todoElement.locator('text=/Medium/i')).toBeVisible();
    await expect(todoElement.locator('.bg-yellow-100')).toBeVisible();
  });

  test('should create todo with high priority', async ({ page }) => {
    const todoTitle = 'Urgent high priority task';

    await page.fill('input[placeholder*="What needs to be done"]', todoTitle);
    
    // Select high priority
    await page.selectOption('select', 'high');
    
    await page.click('button:has-text("Add Todo")');

    // Verify high priority badge (red)
    const todoElement = await helpers.getTodoElement(todoTitle);
    await expect(todoElement.locator('text=/High/i')).toBeVisible();
    await expect(todoElement.locator('.bg-red-100')).toBeVisible();
    await expect(todoElement).toHaveClass(/border-red-500/);
  });

  test('should create todo with low priority', async ({ page }) => {
    const todoTitle = 'Low priority task';

    await page.fill('input[placeholder*="What needs to be done"]', todoTitle);
    await page.selectOption('select', 'low');
    await page.click('button:has-text("Add Todo")');

    // Verify low priority badge (green)
    const todoElement = await helpers.getTodoElement(todoTitle);
    await expect(todoElement.locator('text=/Low/i')).toBeVisible();
    await expect(todoElement.locator('.bg-green-100')).toBeVisible();
    await expect(todoElement).toHaveClass(/border-green-500/);
  });

  test('should sort todos by priority (high > medium > low)', async ({ page }) => {
    // Create todos with different priorities
    const todos = [
      { title: 'Low priority task', priority: 'low' },
      { title: 'High priority task', priority: 'high' },
      { title: 'Medium priority task', priority: 'medium' },
    ];

    for (const todo of todos) {
      await page.fill('input[placeholder*="What needs to be done"]', todo.title);
      await page.selectOption('select', todo.priority);
      await page.click('button:has-text("Add Todo")');
      await page.waitForTimeout(100); // Small delay to ensure order
    }

    // Get all todo cards
    const todoCards = page.locator('div[class*="bg-white rounded-lg shadow-md border-l-4"]');
    
    // Verify order: high → medium → low (first 3 todos)
    const firstTodo = todoCards.nth(0);
    const secondTodo = todoCards.nth(1);
    const thirdTodo = todoCards.nth(2);

    await expect(firstTodo).toContainText('High priority task');
    await expect(secondTodo).toContainText('Medium priority task');
    await expect(thirdTodo).toContainText('Low priority task');
  });

  test('should filter todos by priority', async ({ page }) => {
    // Create todos with different priorities
    await helpers.createTodo('High priority task', undefined, 'high');
    await helpers.createTodo('Medium priority task', undefined, 'medium');
    await helpers.createTodo('Low priority task', undefined, 'low');

    // All should be visible initially
    await expect(page.locator('text=High priority task')).toBeVisible();
    await expect(page.locator('text=Medium priority task')).toBeVisible();
    await expect(page.locator('text=Low priority task')).toBeVisible();

    // Filter by high priority
    await page.selectOption('select[aria-label="Priority filter"]', 'high');
    await page.waitForTimeout(300);

    // Only high priority should be visible
    await expect(page.locator('text=High priority task')).toBeVisible();
    await expect(page.locator('text=Medium priority task')).not.toBeVisible();
    await expect(page.locator('text=Low priority task')).not.toBeVisible();

    // Filter by medium priority
    await page.selectOption('select[aria-label="Priority filter"]', 'medium');
    await page.waitForTimeout(300);

    await expect(page.locator('text=High priority task')).not.toBeVisible();
    await expect(page.locator('text=Medium priority task')).toBeVisible();
    await expect(page.locator('text=Low priority task')).not.toBeVisible();
  });

  test('should clear priority filter', async ({ page }) => {
    // Create mixed priority todos
    await helpers.createTodo('High task', undefined, 'high');
    await helpers.createTodo('Low task', undefined, 'low');

    // Apply filter
    await page.selectOption('select[aria-label="Priority filter"]', 'high');
    await page.waitForTimeout(300);

    // Verify filter is active
    await expect(page.locator('text=Showing high priority todos only')).toBeVisible();

    // Clear filter
    await page.click('button:has-text("Clear filter")');
    await page.waitForTimeout(300);

    // All todos should be visible again
    await expect(page.locator('text=High task')).toBeVisible();
    await expect(page.locator('text=Low task')).toBeVisible();
  });

  test('should change todo priority', async ({ page }) => {
    const todoTitle = 'Changeable priority task';

    // Create with medium priority (default)
    await helpers.createTodo(todoTitle);

    const todoElement = await helpers.getTodoElement(todoTitle);

    // Initially medium
    await expect(todoElement.locator('.bg-yellow-100')).toBeVisible();

    // Click edit
    await todoElement.locator('button:has-text("Edit")').click();

    // Change to high priority
    await todoElement.locator('select').selectOption('high');

    // Save changes
    await todoElement.locator('button:has-text("Save")').click();
    await page.waitForTimeout(300);

    // Verify priority changed to high (red)
    const updatedTodoElement = await helpers.getTodoElement(todoTitle);
    await expect(updatedTodoElement.locator('.bg-red-100')).toBeVisible();
    await expect(updatedTodoElement.locator('text=/High/i')).toBeVisible();
    await expect(updatedTodoElement).toHaveClass(/border-red-500/);
  });

  test('should display priority icons', async ({ page }) => {
    await helpers.createTodo('High task', undefined, 'high');
    await helpers.createTodo('Medium task', undefined, 'medium');
    await helpers.createTodo('Low task', undefined, 'low');

    // Verify priority badges have icons (emoji)
    const highBadge = page.locator('.bg-red-100').first();
    const mediumBadge = page.locator('.bg-yellow-100').first();
    const lowBadge = page.locator('.bg-green-100').first();

    await expect(highBadge).toContainText('🔥');
    await expect(mediumBadge).toContainText('⚡');
    await expect(lowBadge).toContainText('✓');
  });

  test('should maintain priority after page reload', async ({ page }) => {
    const todoTitle = 'Persistent priority task';

    await helpers.createTodo(todoTitle, undefined, 'high');

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Verify high priority is still there
    const todoElement = await helpers.getTodoElement(todoTitle);
    await expect(todoElement.locator('.bg-red-100')).toBeVisible();
    await expect(todoElement).toHaveClass(/border-red-500/);
  });

  test('should show priority in dropdown during edit', async ({ page }) => {
    const todoTitle = 'Edit priority task';

    await helpers.createTodo(todoTitle, undefined, 'high');

    const todoElement = await helpers.getTodoElement(todoTitle);
    await todoElement.locator('button:has-text("Edit")').click();

    // Verify select shows current priority
    const select = todoElement.locator('select');
    await expect(select).toHaveValue('high');
  });

  test('should handle completed todos with different priorities', async ({ page }) => {
    await helpers.createTodo('High completed task', undefined, 'high');
    await helpers.createTodo('High incomplete task', undefined, 'high');

    // Complete first task
    await helpers.completeTodo('High completed task');
    await page.waitForTimeout(300);

    // Verify completed task shows gray border
    const completedTodo = await helpers.getTodoElement('High completed task');
    await expect(completedTodo).toHaveClass(/border-gray-300/);

    // Verify incomplete task still shows red border
    const incompleteTodo = await helpers.getTodoElement('High incomplete task');
    await expect(incompleteTodo).toHaveClass(/border-red-500/);
  });

  test('should show priority select with icons in form', async ({ page }) => {
    // Check the priority select in the add form
    const prioritySelect = page.locator('select').first();
    
    // Get all options
    const options = await prioritySelect.locator('option').allTextContents();
    
    // Verify icons are present
    expect(options.some(opt => opt.includes('🔥'))).toBeTruthy();
    expect(options.some(opt => opt.includes('⚡'))).toBeTruthy();
    expect(options.some(opt => opt.includes('✓'))).toBeTruthy();
  });
});
