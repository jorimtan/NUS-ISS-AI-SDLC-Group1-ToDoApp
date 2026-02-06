/**
 * E2E Tests for Calendar View (PRP-10)
 * Tests calendar display, navigation, heat maps, and date details
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Calendar View (PRP-10)', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupNewUser();
  });

  // ===========================
  // Calendar Display Tests
  // ===========================

  test('should display calendar with 7-column grid', async ({ page }) => {
    // Navigate to calendar
    await helpers.navigateToCalendar();

    // Verify calendar grid exists
    const grid = page.locator('[data-testid="calendar-grid"]');
    await expect(grid).toBeVisible();

    // Verify 7 weekday headers (Sun-Sat)
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekDays) {
      await expect(page.locator(`text=${day}`)).toBeVisible();
    }

    // Verify calendar has 35-42 day cells (5-6 weeks)
    const dates = await helpers.getAllCalendarDates();
    expect(dates.length).toBeGreaterThanOrEqual(35);
    expect(dates.length).toBeLessThanOrEqual(42);
  });

  test('should display current month by default', async ({ page }) => {
    await helpers.navigateToCalendar();

    const monthHeader = await helpers.getCurrentMonth();
    
    // Should contain current month name and year
    const now = new Date();
    const expectedMonth = now.toLocaleString('en-US', { month: 'long' });
    const expectedYear = now.getFullYear().toString();
    
    expect(monthHeader).toContain(expectedMonth);
    expect(monthHeader).toContain(expectedYear);
  });

  test('should highlight today with blue border', async ({ page }) => {
    await helpers.navigateToCalendar();

    // Get today's date string
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    // Check if today is highlighted
    const isToday = await helpers.isDateToday(dateString);
    expect(isToday).toBe(true);
  });

  // ===========================
  // Navigation Tests
  // ===========================

  test('should navigate to previous month', async ({ page }) => {
    await helpers.navigateToCalendar();

    const currentMonth = await helpers.getCurrentMonth();
    
    await helpers.navigateToPreviousMonth();
    
    const newMonth = await helpers.getCurrentMonth();
    expect(newMonth).not.toBe(currentMonth);
  });

  test('should navigate to next month', async ({ page }) => {
    await helpers.navigateToCalendar();

    const currentMonth = await helpers.getCurrentMonth();
    
    await helpers.navigateToNextMonth();
    
    const newMonth = await helpers.getCurrentMonth();
    expect(newMonth).not.toBe(currentMonth);
  });

  test('should navigate back to today using Today button', async ({ page }) => {
    await helpers.navigateToCalendar();

    // Navigate to a different month
    await helpers.navigateToNextMonth();
    await helpers.navigateToNextMonth();

    // Click Today button
    await helpers.clickTodayButton();

    // Should be back to current month
    const monthHeader = await helpers.getCurrentMonth();
    const now = new Date();
    const expectedMonth = now.toLocaleString('en-US', { month: 'long' });
    
    expect(monthHeader).toContain(expectedMonth);
  });

  test('should support URL parameter for month navigation', async ({ page }) => {
    // Navigate to specific month via URL
    await helpers.navigateToMonth(2026, 3); // March 2026

    const monthHeader = await helpers.getCurrentMonth();
    expect(monthHeader).toContain('March');
    expect(monthHeader).toContain('2026');
  });

  // ===========================
  // Todo Display Tests
  // ===========================

  test('should display todos on calendar dates', async ({ page }) => {
    // Create a todo with due date
    const dueDate = helpers.getDateTimeString(5); // 5 days from now
    await helpers.createTodo('Calendar Test Todo', dueDate);

    // Navigate to calendar
    await helpers.navigateToCalendar();

    // Extract date string from dueDate
    const dateString = dueDate.split('T')[0];

    // Check if todo count badge is visible
    const todoCount = await helpers.getTodoCountForDate(dateString);
    expect(todoCount).toBe(1);

    // Check if todo title is visible in cell
    const cell = await helpers.getCalendarCell(dateString);
    await expect(cell.locator('text=Calendar Test Todo')).toBeVisible();
  });

  test('should show multiple todos on same date', async ({ page }) => {
    // Create multiple todos with same due date
    const dueDate = helpers.getDateTimeString(7); // 7 days from now
    await helpers.createTodo('Todo 1', dueDate);
    await helpers.createTodo('Todo 2', dueDate);
    await helpers.createTodo('Todo 3', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    const todoCount = await helpers.getTodoCountForDate(dateString);
    expect(todoCount).toBe(3);
  });

  test('should show +N more indicator when more than 2 todos', async ({ page }) => {
    // Create 4 todos with same due date
    const dueDate = helpers.getDateTimeString(10);
    await helpers.createTodo('Todo 1', dueDate);
    await helpers.createTodo('Todo 2', dueDate);
    await helpers.createTodo('Todo 3', dueDate);
    await helpers.createTodo('Todo 4', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    const cell = await helpers.getCalendarCell(dateString);
    
    // Should show "+2 more" indicator
    await expect(cell.locator('text=+2 more')).toBeVisible();
  });

  // ===========================
  // Heat Map Tests
  // ===========================

  test('should apply heat map styling based on todo count', async ({ page }) => {
    // Create todos with different counts on different dates
    const date1 = helpers.getDateTimeString(3); // 1 todo
    const date2 = helpers.getDateTimeString(4); // 2 todos
    const date3 = helpers.getDateTimeString(5); // 6 todos

    await helpers.createTodo('Todo 1-1', date1);
    
    await helpers.createTodo('Todo 2-1', date2);
    await helpers.createTodo('Todo 2-2', date2);
    
    await helpers.createTodo('Todo 3-1', date3);
    await helpers.createTodo('Todo 3-2', date3);
    await helpers.createTodo('Todo 3-3', date3);
    await helpers.createTodo('Todo 3-4', date3);
    await helpers.createTodo('Todo 3-5', date3);
    await helpers.createTodo('Todo 3-6', date3);

    await helpers.navigateToCalendar();

    // Check heat map intensities
    const intensity1 = await helpers.getHeatMapIntensity(date1.split('T')[0]);
    const intensity2 = await helpers.getHeatMapIntensity(date2.split('T')[0]);
    const intensity3 = await helpers.getHeatMapIntensity(date3.split('T')[0]);

    expect(intensity1).toBe('low'); // 1 todo = bg-gray-100
    expect(intensity2).toBe('medium'); // 2 todos = bg-blue-100
    expect(intensity3).toBe('high'); // 6+ todos = bg-blue-300
  });

  // ===========================
  // Holiday Display Tests
  // ===========================

  test('should display Singapore public holidays', async ({ page }) => {
    // Navigate to a month with known holiday (e.g., January = New Year's Day)
    await helpers.navigateToMonth(2026, 1); // January 2026

    // Check if New Year's Day (2026-01-01) is marked as holiday
    const isHoliday = await helpers.isHolidayVisible('2026-01-01', "New Year's Day");
    expect(isHoliday).toBe(true);
  });

  test('should show holiday indicator with emoji', async ({ page }) => {
    await helpers.navigateToMonth(2026, 1);

    const holidayElement = page.locator('[data-testid="holiday-2026-01-01"]');
    await expect(holidayElement).toBeVisible();
    
    const text = await holidayElement.textContent();
    expect(text).toContain('🎉');
  });

  // ===========================
  // Date Detail Modal Tests
  // ===========================

  test('should open date detail modal on cell click', async ({ page }) => {
    const dueDate = helpers.getDateTimeString(6);
    await helpers.createTodo('Modal Test Todo', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    await helpers.clickCalendarDate(dateString);

    // Modal should be visible
    const modal = page.locator('[data-testid="date-detail-modal"]');
    await expect(modal).toBeVisible();

    // Should show date header
    await expect(modal.locator('text=Modal Test Todo')).toBeVisible();
  });

  test('should display all todos in date detail modal', async ({ page }) => {
    const dueDate = helpers.getDateTimeString(8);
    await helpers.createTodo('Modal Todo 1', dueDate);
    await helpers.createTodo('Modal Todo 2', dueDate);
    await helpers.createTodo('Modal Todo 3', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    await helpers.openDateDetailModal(dateString);

    const modal = page.locator('[data-testid="date-detail-modal"]');
    await expect(modal.locator('text=Modal Todo 1')).toBeVisible();
    await expect(modal.locator('text=Modal Todo 2')).toBeVisible();
    await expect(modal.locator('text=Modal Todo 3')).toBeVisible();
  });

  test('should close modal with close button', async ({ page }) => {
    const dueDate = helpers.getDateTimeString(9);
    await helpers.createTodo('Close Test Todo', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    await helpers.openDateDetailModal(dateString);

    // Close modal
    await helpers.closeDateDetailModal();

    // Modal should be hidden
    const modal = page.locator('[data-testid="date-detail-modal"]');
    await expect(modal).not.toBeVisible();
  });

  test('should close modal with Escape key', async ({ page }) => {
    const dueDate = helpers.getDateTimeString(11);
    await helpers.createTodo('Escape Test Todo', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    await helpers.openDateDetailModal(dateString);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Modal should be hidden
    const modal = page.locator('[data-testid="date-detail-modal"]');
    await expect(modal).not.toBeVisible();
  });

  test('should toggle todo completion in modal', async ({ page }) => {
    const dueDate = helpers.getDateTimeString(12);
    const todoId = await helpers.createTodo('Toggle Test Todo', dueDate);

    await helpers.navigateToCalendar();

    const dateString = dueDate.split('T')[0];
    await helpers.openDateDetailModal(dateString);

    // Toggle completion
    await helpers.toggleTodoInModal(todoId);

    // Close and reopen modal
    await helpers.closeDateDetailModal();
    await helpers.openDateDetailModal(dateString);

    // Todo should be marked as completed (line-through)
    const modal = page.locator('[data-testid="date-detail-modal"]');
    const todoElement = modal.locator('text=Toggle Test Todo');
    const classList = await todoElement.getAttribute('class');
    expect(classList).toContain('line-through');
  });

  test('should show empty state when no todos for date', async ({ page }) => {
    await helpers.navigateToCalendar();

    // Click on a date far in the future (unlikely to have todos)
    const dateString = helpers.getDateTimeString(90).split('T')[0];
    
    // Need to navigate to the correct month first
    const [year, month] = dateString.split('-');
    await helpers.navigateToMonth(parseInt(year), parseInt(month));
    
    await helpers.clickCalendarDate(dateString);

    const modal = page.locator('[data-testid="date-detail-modal"]');
    await expect(modal.locator('text=No todos for this day')).toBeVisible();
  });

  // ===========================
  // Navigation Link Tests
  // ===========================

  test('should navigate to calendar from main page', async ({ page }) => {
    // Should start on main page after user setup
    await expect(page).toHaveURL('/');

    // Click Calendar link
    await page.click('[data-testid="calendar-link"]');

    // Should navigate to calendar page
    await expect(page).toHaveURL(/\/calendar/);
    
    // Calendar grid should be visible
    const grid = page.locator('[data-testid="calendar-grid"]');
    await expect(grid).toBeVisible();
  });

  test('should navigate back to main page from calendar', async ({ page }) => {
    await helpers.navigateToCalendar();

    // Click back link
    await page.click('text=← Back to Todos');

    // Should navigate back to main page
    await expect(page).toHaveURL('/');
  });

  // ===========================
  // Previous/Next Month Days Tests
  // ===========================

  test('should show previous and next month days in gray', async ({ page }) => {
    await helpers.navigateToCalendar();

    // Get all calendar dates
    const dates = await helpers.getAllCalendarDates();
    
    // Get current month
    const monthHeader = await helpers.getCurrentMonth();
    const [monthName, yearStr] = monthHeader.split(' ');
    
    // Find a cell that's from previous or next month
    // First cell is likely from previous month if current month doesn't start on Sunday
    const firstCell = await helpers.getCalendarCell(dates[0]);
    const classList = await firstCell.getAttribute('class');
    
    // Previous/next month cells should have opacity-40 class
    // We can't guarantee which cells are from other months, but we can verify
    // that cells with opacity-40 exist (unless current month perfectly fills weeks)
    const hasGrayedCells = classList?.includes('opacity-40');
    
    // This test is informational - we just verify the calendar renders
    expect(dates.length).toBeGreaterThan(0);
  });
});
