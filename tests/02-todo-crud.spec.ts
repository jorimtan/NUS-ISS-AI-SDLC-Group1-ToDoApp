/**
 * E2E Tests - Todo CRUD Operations
 * Tests PRP-01: Todo CRUD Operations
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Authentication', () => {
  test('should register a new user with passkey', async ({ page, context }) => {
    // Create a virtual authenticator for WebAuthn
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

    const helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;

    await helpers.registerUser(username);

    // Verify we're on the home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Todo App');
  });
});

test.describe('Todo CRUD Operations', () => {
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

  test('should create a new todo', async ({ page }) => {
    const todoTitle = 'Buy groceries';
    const dueDate = '2026-02-15T14:00';

    await helpers.createTodo(todoTitle, dueDate, 'high');

    // Verify todo appears in list
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();

    // Verify priority badge
    const todoElement = await helpers.getTodoElement(todoTitle);
    await expect(todoElement.locator('text=HIGH')).toBeVisible();
  });

  test('should display validation error for empty title', async ({ page }) => {
    // Try to submit empty form
    await page.click('button:has-text("Add Todo")');

    // HTML5 validation should prevent submission
    const input = page.locator('input[placeholder*="What needs to be done"]');
    const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('should mark todo as complete', async ({ page }) => {
    const todoTitle = 'Complete this task';

    await helpers.createTodo(todoTitle);

    // Mark as complete
    await helpers.completeTodo(todoTitle);

    // Verify strikethrough styling
    const todoElement = await helpers.getTodoElement(todoTitle);
    const titleElement = todoElement.locator('h3');
    await expect(titleElement).toHaveClass(/line-through/);
  });

  test('should edit a todo', async ({ page }) => {
    const originalTitle = 'Original task';
    const updatedTitle = 'Updated task';

    await helpers.createTodo(originalTitle);

    // Edit the todo
    await helpers.editTodo(originalTitle, updatedTitle, '2026-02-20T10:00', 'low');

    // Verify changes
    await expect(page.locator(`text=${updatedTitle}`)).toBeVisible();
    await expect(page.locator(`text=${originalTitle}`)).not.toBeVisible();

    const todoElement = await helpers.getTodoElement(updatedTitle);
    await expect(todoElement.locator('text=LOW')).toBeVisible();
  });

  test('should cancel editing without saving changes', async ({ page }) => {
    const todoTitle = 'Task to edit';

    await helpers.createTodo(todoTitle);

    const todoElement = await helpers.getTodoElement(todoTitle);

    // Start editing
    await todoElement.locator('button:has-text("Edit")').click();

    // Modify title
    const titleInput = todoElement.locator('input[type="text"]');
    await titleInput.clear();
    await titleInput.fill('Should not be saved');

    // Cancel
    await todoElement.locator('button:has-text("Cancel")').click();

    // Verify original title remains
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
    await expect(page.locator('text=Should not be saved')).not.toBeVisible();
  });

  test('should delete a todo', async ({ page }) => {
    const todoTitle = 'Task to delete';

    await helpers.createTodo(todoTitle);

    // Verify it exists
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();

    // Delete it
    await helpers.deleteTodo(todoTitle);

    // Verify it's gone
    await expect(page.locator(`text=${todoTitle}`)).not.toBeVisible();
  });

  test('should create multiple todos with different priorities', async ({ page }) => {
    const todos = [
      { title: 'Low priority task', priority: 'low' as const },
      { title: 'Medium priority task', priority: 'medium' as const },
      { title: 'High priority task', priority: 'high' as const },
    ];

    for (const todo of todos) {
      await helpers.createTodo(todo.title, undefined, todo.priority);
    }

    // Verify all todos are created
    for (const todo of todos) {
      await expect(page.locator(`text=${todo.title}`)).toBeVisible();
    }

    // Verify count
    const activeCount = await page.locator('h2:has-text("Your Todos")').textContent();
    expect(activeCount).toContain('3 active');
  });

  test('should handle todo completion with optimistic UI update', async ({ page }) => {
    const todoTitle = 'Quick complete test';

    await helpers.createTodo(todoTitle);

    const todoElement = await helpers.getTodoElement(todoTitle);
    const checkbox = todoElement.locator('input[type="checkbox"]');

    // Check the box
    await checkbox.check();

    // Immediately verify strikethrough (optimistic update)
    const titleElement = todoElement.locator('h3');
    await expect(titleElement).toHaveClass(/line-through/, { timeout: 1000 });
  });

  test('should persist todos after page reload', async ({ page }) => {
    const todoTitle = 'Persistent task';

    await helpers.createTodo(todoTitle);

    // Reload page
    await page.reload();

    // Verify todo still exists
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
  });

  test('should show empty state when no todos exist', async ({ page }) => {
    // Should show empty state
    await expect(page.locator('text=No todos yet')).toBeVisible();
  });

  test('should update active todo count correctly', async ({ page }) => {
    // Create 3 todos
    await helpers.createTodo('Task 1');
    await helpers.createTodo('Task 2');
    await helpers.createTodo('Task 3');

    // Check initial count
    await expect(page.locator('text=3 active')).toBeVisible();

    // Complete one
    await helpers.completeTodo('Task 1');

    // Check updated count
    await expect(page.locator('text=2 active')).toBeVisible();
  });

  test('should format due dates in Singapore timezone', async ({ page }) => {
    const todoTitle = 'Timezone test';
    const dueDate = '2026-02-15T14:00';

    await helpers.createTodo(todoTitle, dueDate);

    const todoElement = await helpers.getTodoElement(todoTitle);
    
    // Verify date is displayed
    await expect(todoElement.locator('text=/📅 Due:/')).toBeVisible();
    await expect(todoElement.locator('text=/Feb/')).toBeVisible();
  });
});

test.describe('Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page, context }) => {
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

    const helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;

    await helpers.registerUser(username);

    // Logout
    await helpers.logout();

    // Verify we're on login page
    await expect(page).toHaveURL('/login');
  });
});
