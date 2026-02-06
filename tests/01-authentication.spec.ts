/**
 * E2E Tests for WebAuthn Authentication (PRP-11)
 * Tests passwordless registration, login, session management, and logout
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Authentication (PRP-11)', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  // ===========================
  // Registration Tests
  // ===========================

  test('should register new user with passkey', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await page.goto('/login');
    
    // Switch to register mode
    await page.click('text=Don\'t have an account? Register');
    
    // Fill username
    await page.fill('input[id="username"]', username);
    
    // Click register button
    await page.click('button:has-text("Register")');
    
    // Virtual authenticator handles WebAuthn automatically
    // Wait for redirect to main page
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify user is logged in (should see main page)
    await expect(page.locator('h1:has-text("Todo App")')).toBeVisible();
    
    // Verify logout button exists
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('should show error when registering duplicate username', async ({ page }) => {
    const username = `duplicate_${Date.now()}`;
    
    // Register first user
    await helpers.registerUser(username);
    
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login');
    
    // Try to register same username again
    await page.click('text=Don\'t have an account? Register');
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Register")');
    
    // Should show error message
    await expect(page.locator('text=Username already exists')).toBeVisible({ timeout: 5000 });
    
    // Should not navigate away from login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should require username for registration', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to register mode
    await page.click('text=Don\'t have an account? Register');
    
    // Try to submit without username
    await page.click('button:has-text("Register")');
    
    // HTML5 validation should prevent submission (input is required)
    // Check that we're still on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show WebAuthn info message', async ({ page }) => {
    await page.goto('/login');
    
    // Verify WebAuthn info is displayed
    await expect(page.locator('text=This app uses WebAuthn for secure, passwordless authentication')).toBeVisible();
  });

  // ===========================
  // Login Tests
  // ===========================

  test('should login existing user with passkey', async ({ page }) => {
    const username = `loginuser_${Date.now()}`;
    
    // Register user first
    await helpers.registerUser(username);
    
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login');
    
    // Login
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to main page
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify user is logged in
    await expect(page.locator('h1:has-text("Todo App")')).toBeVisible();
  });

  test('should show error when logging in with non-existent user', async ({ page }) => {
    await page.goto('/login');
    
    // Try to login with user that doesn't exist
    await page.fill('input[id="username"]', 'nonexistent@example.com');
    await page.click('button:has-text("Sign In")');
    
    // Should show error
    await expect(page.locator('text=User not found')).toBeVisible({ timeout: 5000 });
    
    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should toggle between login and register modes', async ({ page }) => {
    await page.goto('/login');
    
    // Should start in login mode
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('text=Don\'t have an account? Register')).toBeVisible();
    
    // Switch to register mode
    await page.click('text=Don\'t have an account? Register');
    await expect(page.locator('button:has-text("Register")')).toBeVisible();
    await expect(page.locator('text=Already have an account? Sign in')).toBeVisible();
    
    // Switch back to login mode
    await page.click('text=Already have an account? Sign in');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  // ===========================
  // Session Management Tests
  // ===========================

  test('should protect routes with middleware', async ({ page }) => {
    // Attempt to access protected route without login
    await page.goto('/');
    
    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page.locator('h2:has-text("Todo App")')).toBeVisible();
  });

  test('should protect calendar route with middleware', async ({ page }) => {
    // Attempt to access calendar without login
    await page.goto('/calendar');
    
    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
  });

  test('should persist session across page reloads', async ({ page }) => {
    const username = `sessionuser_${Date.now()}`;
    
    // Register and login
    await helpers.registerUser(username);
    
    // Verify on main page
    await expect(page).toHaveURL('/');
    
    // Reload page
    await page.reload();
    
    // Should still be on main page (session persisted)
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1:has-text("Todo App")')).toBeVisible();
  });

  test('should persist session across navigation', async ({ page }) => {
    const username = `navuser_${Date.now()}`;
    
    // Register and login
    await helpers.registerUser(username);
    
    // Navigate to calendar
    await page.click('[data-testid="calendar-link"]');
    await expect(page).toHaveURL(/\/calendar/);
    
    // Navigate back to main page
    await page.click('text=← Back to Todos');
    await expect(page).toHaveURL('/');
    
    // Should still be logged in
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  // ===========================
  // Logout Tests
  // ===========================

  test('should logout and clear session', async ({ page }) => {
    const username = `logoutuser_${Date.now()}`;
    
    // Register and login
    await helpers.registerUser(username);
    
    // Verify logged in
    await expect(page).toHaveURL('/');
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 5000 });
    
    // Attempt to access protected route should redirect back to login
    await page.goto('/');
    await page.waitForURL('/login', { timeout: 5000 });
  });

  test('should not allow access to protected routes after logout', async ({ page }) => {
    const username = `noaccessuser_${Date.now()}`;
    
    // Register and login
    await helpers.registerUser(username);
    
    // Create a todo
    const todoTitle = 'Test Todo Before Logout';
    await helpers.createTodo({ title: todoTitle, dueDate: helpers.getDateTimeString(1) });
    
    // Verify todo exists
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
    
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login');
    
    // Try to access main page directly
    await page.goto('/');
    await page.waitForURL('/login');
    
    // Try to access calendar
    await page.goto('/calendar');
    await page.waitForURL('/login');
  });

  // ===========================
  // Security Tests
  // ===========================

  test('should use HTTP-only cookies for session', async ({ page, context }) => {
    const username = `cookieuser_${Date.now()}`;
    
    // Register and login
    await helpers.registerUser(username);
    
    // Get cookies
    const cookies = await context.cookies();
    
    // Find session cookie
    const sessionCookie = cookies.find(c => c.name === 'session');
    
    // Session cookie should exist
    expect(sessionCookie).toBeTruthy();
    
    // Should be HTTP-only
    expect(sessionCookie?.httpOnly).toBe(true);
    
    // Should have sameSite set
    expect(sessionCookie?.sameSite).toBe('Lax');
  });

  test('should handle registration errors gracefully', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to register mode
    await page.click('text=Don\'t have an account? Register');
    
    // Use very short username (might trigger validation)
    await page.fill('input[id="username"]', 'a');
    await page.click('button:has-text("Register")');
    
    // Should handle the response (either success or error, but not crash)
    await page.waitForTimeout(2000);
    
    // Page should still be functional
    const usernameInput = page.locator('input[id="username"]');
    await expect(usernameInput).toBeVisible();
  });

  // ===========================
  // User Flow Tests
  // ===========================

  test('should complete full registration and todo creation flow', async ({ page }) => {
    const username = `fullflowuser_${Date.now()}`;
    
    // Start at login page
    await page.goto('/login');
    
    // Register new user
    await page.click('text=Don\'t have an account? Register');
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 10000 });
    
    // Create a todo
    const todoTitle = 'First Todo After Registration';
    const dueDate = helpers.getDateTimeString(1);
    await helpers.createTodo({ title: todoTitle, dueDate });
    
    // Verify todo created
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
    
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login');
    
    // Login again
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify todo still exists
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
  });

  test('should show loading state during registration', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to register mode
    await page.click('text=Don\'t have an account? Register');
    
    const username = `loadingtest_${Date.now()}`;
    await page.fill('input[id="username"]', username);
    
    // Click register and check for loading state
    await page.click('button:has-text("Register")');
    
    // Button should show "Processing..." briefly
    // (This might be too fast to catch in some cases)
    const button = page.locator('button:has-text("Processing")');
    
    // Either we see the loading state OR we've already navigated away (both are valid)
    try {
      await expect(button).toBeVisible({ timeout: 1000 });
    } catch {
      // If we don't see it, we should be on the main page
      await expect(page).toHaveURL('/');
    }
  });

  test('should show loading state during login', async ({ page }) => {
    const username = `loginloadingtest_${Date.now()}`;
    
    // Register first
    await helpers.registerUser(username);
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login');
    
    // Login and check for loading state
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Sign In")');
    
    // Button should show "Processing..." briefly
    const button = page.locator('button:has-text("Processing")');
    
    try {
      await expect(button).toBeVisible({ timeout: 1000 });
    } catch {
      // If we don't see it, we should be on the main page
      await expect(page).toHaveURL('/');
    }
  });

  // ===========================
  // Edge Case Tests
  // ===========================

  test('should handle whitespace in username', async ({ page }) => {
    const username = `  whitespaceuser_${Date.now()}  `;
    
    await page.goto('/login');
    await page.click('text=Don\'t have an account? Register');
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Register")');
    
    // Should either succeed (trimmed) or show error
    await page.waitForTimeout(3000);
    
    // Either way, page should be functional
    const usernameInput = page.locator('input[id="username"]');
    await expect(usernameInput).toBeVisible();
  });

  test('should handle special characters in username', async ({ page }) => {
    const username = `testuser+special_${Date.now()}@example.com`;
    
    await page.goto('/login');
    await page.click('text=Don\'t have an account? Register');
    await page.fill('input[id="username"]', username);
    await page.click('button:has-text("Register")');
    
    // Should handle or reject gracefully
    await page.waitForTimeout(3000);
    
    // Page should remain functional
    const usernameInput = page.locator('input[id="username"]');
    await expect(usernameInput).toBeVisible();
  });

  // ===========================
  // Multiple Users Test
  // ===========================

  test('should support multiple independent user sessions', async ({ browser }) => {
    // Create two separate browser contexts (independent sessions)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const helpers1 = new TestHelpers(page1);
    const helpers2 = new TestHelpers(page2);
    
    const username1 = `multiuser1_${Date.now()}`;
    const username2 = `multiuser2_${Date.now()}`;
    
    // Register first user
    await helpers1.registerUser(username1);
    await helpers1.createTodo({ title: 'User 1 Todo', dueDate: helpers1.getDateTimeString(1) });
    
    // Register second user in separate context
    await helpers2.registerUser(username2);
    await helpers2.createTodo({ title: 'User 2 Todo', dueDate: helpers2.getDateTimeString(1) });
    
    // Verify each user only sees their own todos
    await expect(page1.locator('text=User 1 Todo')).toBeVisible();
    await expect(page1.locator('text=User 2 Todo')).not.toBeVisible();
    
    await expect(page2.locator('text=User 2 Todo')).toBeVisible();
    await expect(page2.locator('text=User 1 Todo')).not.toBeVisible();
    
    // Cleanup
    await context1.close();
    await context2.close();
  });
});
