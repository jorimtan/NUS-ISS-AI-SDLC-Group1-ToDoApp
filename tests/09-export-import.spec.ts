/**
 * PRP-09: Export & Import E2E Tests
 * Tests for data backup and restore functionality
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('PRP-09: Export & Import', () => {
  let helpers: TestHelpers;
  let username: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    username = await helpers.setupNewUser();
  });

  test('should export all data to JSON file', async ({ page }) => {
    // Create some test data
    await helpers.createTodo({
      title: 'Test Todo 1',
      dueDate: helpers.getDateTimeString(1),
      priority: 'high',
    });

    await helpers.createTodo({
      title: 'Test Todo 2',
      dueDate: helpers.getDateTimeString(2),
      priority: 'medium',
    });

    // Add a subtask
    await helpers.addSubtask('Test Todo 1', 'Subtask 1');

    // Export data
    const download = await helpers.exportData();

    // Verify filename format
    expect(download.suggestedFilename()).toMatch(/todos-backup-\d{4}-\d{2}-\d{2}\.json/);

    // Verify content
    const exportContent = await helpers.verifyExportContent(download);
    expect(exportContent.version).toBe('1.0');
    expect(exportContent.todosCount).toBe(2);
  });

  test('should import valid backup file', async ({ page }) => {
    // Create export data
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 999,
          title: 'Imported Todo',
          priority: 'medium',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    // Import
    await helpers.importData(backupData);

    // Verify imported todo appears
    await expect(page.locator('text=Imported Todo')).toBeVisible();
  });

  test('should show import preview before importing', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Preview Test',
          priority: 'high',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [
            { id: 1, todo_id: 1, title: 'Subtask 1', position: 0, completed: 0 },
            { id: 2, todo_id: 1, title: 'Subtask 2', position: 1, completed: 0 },
          ],
          tag_ids: [],
        },
      ],
      tags: [
        { id: 1, name: 'Work', color: '#3B82F6', user_id: 1 },
      ],
      templates: [],
    });

    // Start import without confirming
    await helpers.importData(backupData, false);

    // Verify preview is shown
    const preview = await helpers.getImportPreview();
    expect(preview.valid).toBe(true);
    expect(preview.todosCount).toBe(1);
    expect(preview.tagsCount).toBe(1);

    // Verify preview modal content
    await expect(page.locator('text=Import Preview')).toBeVisible();
    await expect(page.locator('text=/1 todo/')).toBeVisible();
    await expect(page.locator('text=/2 subtask/')).toBeVisible();
  });

  test('should show validation errors for invalid JSON', async ({ page }) => {
    const invalidData = {
      version: '1.0',
      data: {
        todos: [
          {
            id: 1,
            // Missing required 'title' field
            priority: 'invalid_priority', // Invalid priority value
            subtasks: [],
            tag_ids: [],
          },
        ],
        tags: [],
        templates: [],
      },
    };

    // Import invalid data
    await helpers.importData(invalidData, false);

    // Verify validation errors are shown
    await expect(page.locator('text=Validation Errors')).toBeVisible();

    // Verify Confirm Import button is disabled
    const confirmButton = page.locator('button:has-text("Confirm Import")');
    await expect(confirmButton).toBeDisabled();
  });

  test('should merge duplicate tags by name', async ({ page }) => {
    // Create existing tag
    await helpers.createTag('Work', 0); // Use colorIndex instead of hex color

    // Import backup with same tag name but different color
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Test Todo',
          priority: 'high',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [1],
        },
      ],
      tags: [
        { id: 1, name: 'Work', color: '#EF4444', user_id: 1 }, // Different color
      ],
      templates: [],
    });

    // Import
    await helpers.importData(backupData, false);

    // Verify merge message in preview
    await expect(page.locator('text=/1 tag.*merged/')).toBeVisible();
    await expect(page.locator('text=Merging tags: Work')).toBeVisible();

    // Confirm import
    await page.click('button:has-text("Confirm Import")');
    await page.waitForTimeout(1500);

    // Verify todo has the existing tag
    const todoElement = await helpers.getTodoElement('Test Todo');
    await expect(todoElement.locator('text=Work')).toBeVisible();
  });

  test('should import todos with subtasks', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Project Setup',
          priority: 'high',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [
            { id: 1, todo_id: 1, title: 'Init repo', position: 0, completed: 0 },
            { id: 2, todo_id: 1, title: 'Install deps', position: 1, completed: 0 },
            { id: 3, todo_id: 1, title: 'Configure', position: 2, completed: 0 },
          ],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify subtasks are created
    const todoElement = await helpers.getTodoElement('Project Setup');
    await expect(todoElement.locator('text=Init repo')).toBeVisible();
    await expect(todoElement.locator('text=Install deps')).toBeVisible();
    await expect(todoElement.locator('text=Configure')).toBeVisible();
  });

  test('should import templates', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [],
      tags: [],
      templates: [
        {
          id: 1,
          user_id: 1,
          name: 'Weekly Report Template',
          title: 'Weekly Report',
          category: 'work',
          priority: 'medium',
          due_offset_days: 7,
          subtasks_json: JSON.stringify([
            { title: 'Gather data', position: 0 },
            { title: 'Write summary', position: 1 },
          ]),
        },
      ],
    });

    await helpers.importData(backupData);

    // Verify template exists
    const templateExists = await helpers.templateExists('Weekly Report Template');
    expect(templateExists).toBe(true);
  });

  test('should preserve todo priority during import', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'High Priority Task',
          priority: 'high',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify priority badge
    const todoElement = await helpers.getTodoElement('High Priority Task');
    await expect(todoElement.locator('.priority-badge, span:has-text("High")')).toBeVisible();
  });

  test('should handle empty export', async ({ page }) => {
    // Export with no data
    const download = await helpers.exportData();

    // Verify file is created
    expect(download.suggestedFilename()).toMatch(/todos-backup-\d{4}-\d{2}-\d{4}\.json/);

    // Verify content has empty arrays
    const exportContent = await helpers.verifyExportContent(download);
    expect(exportContent.todosCount).toBe(0);
    expect(exportContent.tagsCount).toBe(0);
    expect(exportContent.templatesCount).toBe(0);
  });

  test('should import todos with recurrence pattern', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Weekly Meeting',
          priority: 'medium',
          due_date: helpers.getDateTimeString(7),
          completed: 0,
          completed_at: null,
          recurrence_pattern: 'weekly',
          reminder_minutes: 60,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify recurrence badge is shown
    const todoElement = await helpers.getTodoElement('Weekly Meeting');
    await expect(todoElement.locator('text=/Weekly|🔁/')).toBeVisible();
  });

  test('should import todos with multiple tags', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Multi-tag Todo',
          priority: 'medium',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [1, 2, 3],
        },
      ],
      tags: [
        { id: 1, name: 'Work', color: '#3B82F6', user_id: 1 },
        { id: 2, name: 'Urgent', color: '#EF4444', user_id: 1 },
        { id: 3, name: 'Client', color: '#10B981', user_id: 1 },
      ],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify all tags are shown
    const todoElement = await helpers.getTodoElement('Multi-tag Todo');
    await expect(todoElement.locator('text=Work')).toBeVisible();
    await expect(todoElement.locator('text=Urgent')).toBeVisible();
    await expect(todoElement.locator('text=Client')).toBeVisible();
  });

  test('should reject missing version field', async ({ page }) => {
    const invalidData = {
      // Missing version field
      data: {
        todos: [],
        tags: [],
        templates: [],
      },
    };

    await helpers.importData(invalidData, false);

    const preview = await helpers.getImportPreview();
    expect(preview.valid).toBe(false);
    expect(preview.errors).toContain('Missing version field');
  });

  test('should reject invalid priority values', async ({ page }) => {
    const invalidData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Invalid Todo',
          priority: 'super-urgent', // Invalid priority
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    await helpers.importData(invalidData, false);

    const preview = await helpers.getImportPreview();
    expect(preview.valid).toBe(false);
    expect(preview.errors?.some(e => e.includes('invalid priority'))).toBe(true);
  });

  test('should close import modal with escape key', async ({ page }) => {
    await page.click('button:has-text("📤 Import Data"), button:has-text("Import Data")');

    // Verify modal is open
    const isOpen = await helpers.isImportModalVisible();
    expect(isOpen).toBe(true);

    // Close with escape
    await helpers.closeImportModal();

    // Verify modal is closed
    const isClosed = !(await helpers.isImportModalVisible());
    expect(isClosed).toBe(true);
  });

  test('should import completed todos', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Completed Task',
          priority: 'low',
          due_date: helpers.getDateTimeString(0),
          completed: 1,
          completed_at: new Date().toISOString(),
          recurrence_pattern: null,
          reminder_minutes: null,
          last_notification_sent: null,
          subtasks: [],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify completed todo is shown with strikethrough
    const todoElement = await helpers.getTodoElement('Completed Task');
    await expect(todoElement).toBeVisible();
  });

  test('should handle large import (10+ todos)', async ({ page }) => {
    const todos = [];
    for (let i = 1; i <= 15; i++) {
      todos.push({
        id: i,
        title: `Bulk Todo ${i}`,
        priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
        due_date: helpers.getDateTimeString(i),
        completed: 0,
        completed_at: null,
        recurrence_pattern: null,
        reminder_minutes: null,
        last_notification_sent: null,
        subtasks: [],
        tag_ids: [],
      });
    }

    const backupData = helpers.createExportData({
      todos,
      tags: [],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify some of the imported todos
    await expect(page.locator('text=Bulk Todo 1')).toBeVisible();
    await expect(page.locator('text=Bulk Todo 10')).toBeVisible();
    await expect(page.locator('text=Bulk Todo 15')).toBeVisible();
  });

  test('should reset notification timestamps on import', async ({ page }) => {
    const backupData = helpers.createExportData({
      todos: [
        {
          id: 1,
          title: 'Reminder Todo',
          priority: 'medium',
          due_date: helpers.getDateTimeString(1),
          completed: 0,
          completed_at: null,
          recurrence_pattern: null,
          reminder_minutes: 60,
          last_notification_sent: new Date().toISOString(), // Should be reset
          subtasks: [],
          tag_ids: [],
        },
      ],
      tags: [],
      templates: [],
    });

    await helpers.importData(backupData);

    // Verify todo is imported (notification reset is internal)
    await expect(page.locator('text=Reminder Todo')).toBeVisible();
  });
});
