/**
 * PRP-07: Template System E2E Tests
 * Tests for saving todos as templates and creating todos from templates
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('PRP-07: Template System', () => {
  let helpers: TestHelpers;
  let username: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    username = await helpers.setupNewUser();
  });

  test('should save a todo as a template', async ({ page }) => {
    // Create a todo
    await helpers.createTodo({
      title: 'Weekly Report',
      dueDate: helpers.getDateTimeString(7),
      priority: 'high',
    });

    // Save as template
    await helpers.saveAsTemplate({
      todoTitle: 'Weekly Report',
      templateName: 'Weekly Report Template',
      category: 'work',
      dueOffsetDays: 7,
    });

    // Verify template exists
    const exists = await helpers.templateExists('Weekly Report Template');
    expect(exists).toBe(true);
  });

  test('should save a todo with subtasks as a template', async ({ page }) => {
    // Create a todo with subtasks
    await helpers.createTodo({
      title: 'Project Setup',
      dueDate: helpers.getDateTimeString(1),
      priority: 'medium',
    });

    // Add subtasks
    await helpers.addSubtask('Project Setup', 'Initialize repo');
    await helpers.addSubtask('Project Setup', 'Install dependencies');
    await helpers.addSubtask('Project Setup', 'Configure linting');

    // Save as template
    await helpers.saveAsTemplate({
      todoTitle: 'Project Setup',
      templateName: 'Project Setup Template',
      category: 'work',
      dueOffsetDays: 0,
    });

    // Verify template exists
    await helpers.openTemplateBrowser();
    const templateCard = page.locator('div').filter({ hasText: 'Project Setup Template' }).first();
    await expect(templateCard).toBeVisible();

    // Verify subtasks are mentioned in preview
    await expect(templateCard.locator('text=/3 subtask/')).toBeVisible();
  });

  test('should create a todo from a template', async ({ page }) => {
    // Create and save a template
    await helpers.createTodo({
      title: 'Daily Standup',
      dueDate: helpers.getDateTimeString(1),
      priority: 'medium',
    });

    await helpers.saveAsTemplate({
      todoTitle: 'Daily Standup',
      templateName: 'Standup Template',
      category: 'work',
      dueOffsetDays: 1,
    });

    // Delete the original todo
    await helpers.deleteTodo('Daily Standup');

    // Create todo from template
    await helpers.useTemplate('Standup Template');

    // Verify new todo exists with correct properties
    const todoElement = await helpers.getTodoElement('Daily Standup');
    await expect(todoElement).toBeVisible();

    // Verify priority badge
    await expect(todoElement.locator('.priority-badge, span:has-text("Medium")')).toBeVisible();
  });

  test('should calculate due date correctly with offset', async ({ page }) => {
    // Create template with 7-day offset
    await helpers.createTodo({
      title: 'Weekly Review',
      dueDate: helpers.getDateTimeString(7),
      priority: 'low',
    });

    await helpers.saveAsTemplate({
      todoTitle: 'Weekly Review',
      templateName: 'Weekly Review Template',
      category: 'personal',
      dueOffsetDays: 7,
    });

    // Check preview shows correct offset
    await helpers.openTemplateBrowser();
    const templateCard = page.locator('div').filter({ hasText: 'Weekly Review Template' }).first();
    await expect(templateCard.locator('text=/in 7 days/')).toBeVisible();

    await helpers.closeTemplateBrowser();

    // Use template and verify due date
    await helpers.useTemplate('Weekly Review Template');

    // The todo should be created with due date 7 days from now
    const todoElement = await helpers.getTodoElement('Weekly Review');
    await expect(todoElement).toBeVisible();
  });

  test('should handle template with 0-day offset (today)', async ({ page }) => {
    await helpers.createTodo({
      title: 'Urgent Task',
      dueDate: helpers.getDateTimeString(0),
      priority: 'high',
    });

    await helpers.saveAsTemplate({
      todoTitle: 'Urgent Task',
      templateName: 'Urgent Template',
      category: 'work',
      dueOffsetDays: 0,
    });

    // Check preview shows "today"
    await helpers.openTemplateBrowser();
    const templateCard = page.locator('div').filter({ hasText: 'Urgent Template' }).first();
    await expect(templateCard.locator('text=/today/')).toBeVisible();
  });

  test('should filter templates by category', async ({ page }) => {
    // Create multiple templates in different categories
    await helpers.createTodo({
      title: 'Work Task 1',
      dueDate: helpers.getDateTimeString(1),
    });
    await helpers.saveAsTemplate({
      todoTitle: 'Work Task 1',
      templateName: 'Work Template 1',
      category: 'work',
      dueOffsetDays: 1,
    });

    await helpers.createTodo({
      title: 'Personal Task 1',
      dueDate: helpers.getDateTimeString(1),
    });
    await helpers.saveAsTemplate({
      todoTitle: 'Personal Task 1',
      templateName: 'Personal Template 1',
      category: 'personal',
      dueOffsetDays: 1,
    });

    await helpers.createTodo({
      title: 'Other Task 1',
      dueDate: helpers.getDateTimeString(1),
    });
    await helpers.saveAsTemplate({
      todoTitle: 'Other Task 1',
      templateName: 'Other Template 1',
      category: 'other',
      dueOffsetDays: 1,
    });

    // Filter by work
    await helpers.filterTemplatesByCategory('work');
    await expect(page.locator('text=Work Template 1')).toBeVisible();
    await expect(page.locator('text=Personal Template 1')).not.toBeVisible();
    await expect(page.locator('text=Other Template 1')).not.toBeVisible();

    // Filter by personal
    await page.click('button:has-text("Personal")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Personal Template 1')).toBeVisible();
    await expect(page.locator('text=Work Template 1')).not.toBeVisible();

    // Filter by all
    await page.click('button:has-text("All")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Work Template 1')).toBeVisible();
    await expect(page.locator('text=Personal Template 1')).toBeVisible();
    await expect(page.locator('text=Other Template 1')).toBeVisible();
  });

  test('should edit a template', async ({ page }) => {
    // Create template
    await helpers.createTodo({
      title: 'Original Task',
      dueDate: helpers.getDateTimeString(5),
      priority: 'low',
    });

    await helpers.saveAsTemplate({
      todoTitle: 'Original Task',
      templateName: 'Original Template',
      category: 'work',
      dueOffsetDays: 5,
    });

    // Edit template
    await helpers.editTemplate({
      templateName: 'Original Template',
      newName: 'Updated Template',
      newCategory: 'personal',
      newDueOffsetDays: 10,
    });

    // Verify changes
    await helpers.openTemplateBrowser();
    await expect(page.locator('text=Updated Template')).toBeVisible();
    await expect(page.locator('text=Original Template')).not.toBeVisible();

    // Check category badge
    const templateCard = page.locator('div').filter({ hasText: 'Updated Template' }).first();
    await expect(templateCard.locator('text=personal')).toBeVisible();

    // Check offset
    await expect(templateCard.locator('text=/in 10 days/')).toBeVisible();
  });

  test('should delete a template', async ({ page }) => {
    // Create template
    await helpers.createTodo({
      title: 'Temporary Task',
      dueDate: helpers.getDateTimeString(1),
    });

    await helpers.saveAsTemplate({
      todoTitle: 'Temporary Task',
      templateName: 'Temporary Template',
      category: 'other',
      dueOffsetDays: 1,
    });

    // Verify template exists
    const existsBefore = await helpers.templateExists('Temporary Template');
    expect(existsBefore).toBe(true);

    // Delete template
    await helpers.deleteTemplate('Temporary Template');

    // Verify template no longer exists
    await helpers.openTemplateBrowser();
    await expect(page.locator('text=Temporary Template')).not.toBeVisible();
  });

  test('should show empty state when no templates exist', async ({ page }) => {
    const isEmpty = await helpers.isNoTemplatesVisible();
    expect(isEmpty).toBe(true);

    await helpers.openTemplateBrowser();
    await expect(page.locator('text=No templates yet')).toBeVisible();
    await expect(page.locator('text=Save a todo as a template to reuse it later')).toBeVisible();
  });

  test('should preserve todo priority when saving as template', async ({ page }) => {
    // Create high priority todo
    await helpers.createTodo({
      title: 'Important Task',
      dueDate: helpers.getDateTimeString(1),
      priority: 'high',
    });

    // Save as template
    await helpers.saveAsTemplate({
      todoTitle: 'Important Task',
      templateName: 'Important Template',
      category: 'work',
      dueOffsetDays: 3,
    });

    // Check preview shows high priority
    await helpers.openTemplateBrowser();
    const templateCard = page.locator('div').filter({ hasText: 'Important Template' }).first();
    await expect(templateCard.locator('.priority-badge, span:has-text("High")')).toBeVisible();

    await helpers.closeTemplateBrowser();

    // Create todo from template
    await helpers.useTemplate('Important Template');

    // Verify new todo has high priority
    const todoElement = await helpers.getTodoElement('Important Task');
    await expect(todoElement.locator('.priority-badge, span:has-text("High")')).toBeVisible();
  });

  test('should create subtasks when using template with subtasks', async ({ page }) => {
    // Create todo with subtasks
    await helpers.createTodo({
      title: 'Onboarding Process',
      dueDate: helpers.getDateTimeString(1),
    });

    await helpers.addSubtask('Onboarding Process', 'Setup laptop');
    await helpers.addSubtask('Onboarding Process', 'Create accounts');
    await helpers.addSubtask('Onboarding Process', 'Meet team');

    // Save as template
    await helpers.saveAsTemplate({
      todoTitle: 'Onboarding Process',
      templateName: 'Onboarding Template',
      category: 'work',
      dueOffsetDays: 0,
    });

    // Delete original
    await helpers.deleteTodo('Onboarding Process');

    // Use template
    await helpers.useTemplate('Onboarding Template');

    // Verify subtasks were created
    const todoElement = await helpers.getTodoElement('Onboarding Process');
    await expect(todoElement.locator('text=Setup laptop')).toBeVisible();
    await expect(todoElement.locator('text=Create accounts')).toBeVisible();
    await expect(todoElement.locator('text=Meet team')).toBeVisible();
  });

  test('should handle template with maximum offset (365 days)', async ({ page }) => {
    await helpers.createTodo({
      title: 'Annual Review',
      dueDate: helpers.getDateTimeString(365),
      priority: 'low',
    });

    await helpers.saveAsTemplate({
      todoTitle: 'Annual Review',
      templateName: 'Annual Template',
      category: 'work',
      dueOffsetDays: 365,
    });

    // Check preview shows correct offset
    await helpers.openTemplateBrowser();
    const templateCard = page.locator('div').filter({ hasText: 'Annual Template' }).first();
    await expect(templateCard.locator('text=/in 365 days/')).toBeVisible();
  });

  test('should validate template name length', async ({ page }) => {
    await helpers.createTodo({
      title: 'Test Task',
      dueDate: helpers.getDateTimeString(1),
    });

    // Try to save with empty name
    const todoItem = page.locator('text=Test Task').first();
    await todoItem.scrollIntoViewIfNeeded();

    const container = page.locator('div').filter({ hasText: 'Test Task' }).first();
    await container.locator('button:has-text("💾 Save as Template"), button:has-text("Save as Template")').click();

    // Wait for modal
    await page.waitForSelector('text=Save as Template', { state: 'visible' });

    // Try to save with empty name
    await page.click('button:has-text("Save Template")');

    // Error should be shown or button should be disabled
    const saveButton = page.locator('button:has-text("Save Template")');
    const isDisabled = await saveButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should close template browser with escape key', async ({ page }) => {
    await helpers.openTemplateBrowser();
    await expect(page.locator('h2:has-text("📋 Templates"), h2:has-text("Templates")')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(page.locator('h2:has-text("📋 Templates"), h2:has-text("Templates")')).not.toBeVisible();
  });

  test('should show template count in different categories', async ({ page }) => {
    // Create templates in each category
    for (let i = 1; i <= 2; i++) {
      await helpers.createTodo({
        title: `Work Task ${i}`,
        dueDate: helpers.getDateTimeString(1),
      });
      await helpers.saveAsTemplate({
        todoTitle: `Work Task ${i}`,
        templateName: `Work Template ${i}`,
        category: 'work',
        dueOffsetDays: i,
      });
    }

    await helpers.createTodo({
      title: 'Personal Task',
      dueDate: helpers.getDateTimeString(1),
    });
    await helpers.saveAsTemplate({
      todoTitle: 'Personal Task',
      templateName: 'Personal Template',
      category: 'personal',
      dueOffsetDays: 1,
    });

    // Check total count
    const totalCount = await helpers.getTemplateCount();
    expect(totalCount).toBe(3);

    // Check work category count
    await helpers.filterTemplatesByCategory('work');
    const workTemplates = page.locator('div').filter({ has: page.locator('button:has-text("Use Template")') });
    const workCount = await workTemplates.count();
    expect(workCount).toBe(2);

    // Check personal category count
    await page.click('button:has-text("Personal")');
    await page.waitForTimeout(500);
    const personalTemplates = page.locator('div').filter({ has: page.locator('button:has-text("Use Template")') });
    const personalCount = await personalTemplates.count();
    expect(personalCount).toBe(1);
  });
});
