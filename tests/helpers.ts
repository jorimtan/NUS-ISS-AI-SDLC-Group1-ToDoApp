/**
 * Playwright Test Helpers
 * Reusable methods for E2E tests
 */

import { Page } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Get datetime string for datetime-local input
   * @param daysFromNow Number of days from now (can be 0 for today)
   */
  getDateTimeString(daysFromNow: number): string {
    const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 16);
  }

  /**
   * Register a new user with WebAuthn
   * Generates a unique username based on timestamp
   */
  async setupNewUser() {
    const username = `testuser_${Date.now()}`;
    await this.registerUser(username);
    return username;
  }

  /**
   * Register a new user with WebAuthn
   */
  async registerUser(username: string) {
    await this.page.goto('/login');
    await this.page.fill('input[id="username"]', username);
    
    // Click register mode
    const isRegisterMode = await this.page.locator('button:has-text("Register")').isVisible();
    if (!isRegisterMode) {
      await this.page.click('button:has-text("have an account")');
    }
    
    await this.page.click('button:has-text("Register")');
    
    // Wait for navigation to home page
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  /**
   * Login an existing user with WebAuthn
   */
  async loginUser(username: string) {
    await this.page.goto('/login');
    await this.page.fill('input[id="username"]', username);
    
    // Ensure we're in login mode
    const isLoginMode = await this.page.locator('button:has-text("Sign In")').isVisible();
    if (!isLoginMode) {
      await this.page.click('button:has-text("Already have an account")');
    }
    
    await this.page.click('button:has-text("Sign In")');
    
    // Wait for navigation to home page
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  /**
   * Create a todo via UI
   */
  async createTodo(options: {
    title: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  }) {
    await this.page.fill('input[placeholder*="What needs to be done"]', options.title);
    
    if (options.dueDate) {
      await this.page.fill('input[type="datetime-local"]', options.dueDate);
    }
    
    if (options.priority) {
      // Priority is now a component, not inline select
      await this.page.selectOption('select', options.priority);
    }
    
    if (options.recurrence) {
      // Show advanced options
      const advancedButton = this.page.locator('button:has-text("Advanced Options")');
      const isVisible = await advancedButton.isVisible();
      if (isVisible) {
        await advancedButton.click();
      }
      
      // Select recurrence pattern
      await this.page.selectOption('select[aria-label="Recurrence"]', options.recurrence);
    }
    
    await this.page.click('button:has-text("Add Todo")');
    
    // Wait for todo to appear
    await this.page.waitForSelector(`text=${options.title}`, { timeout: 5000 });
  }

  /**
   * Get todo element by title
   */
  async getTodoElement(title: string) {
    return this.page.locator(`text=${title}`).locator('xpath=ancestor::div[contains(@class, "bg-white")]').first();
  }

  /**
   * Check if todo exists
   */
  async todoExists(title: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text=${title}`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark todo as complete
   */
  async completeTodo(title: string) {
    const todoElement = await this.getTodoElement(title);
    const checkbox = todoElement.locator('input[type="checkbox"]');
    await checkbox.check();
  }

  /**
   * Delete a todo
   */
  async deleteTodo(title: string) {
    const todoElement = await this.getTodoElement(title);
    
    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    
    await todoElement.locator('button:has-text("Delete")').click();
    
    // Wait for todo to disappear
    await this.page.waitForSelector(`text=${title}`, { state: 'hidden', timeout: 5000 });
  }

  /**
   * Edit a todo
   */
  async editTodo(oldTitle: string, newTitle: string, newDueDate?: string, newPriority?: 'low' | 'medium' | 'high') {
    const todoElement = await this.getTodoElement(oldTitle);
    
    // Click edit button
    await todoElement.locator('button:has-text("Edit")').click();
    
    // Update fields
    const titleInput = todoElement.locator('input[type="text"]');
    await titleInput.clear();
    await titleInput.fill(newTitle);
    
    if (newDueDate) {
      const dateInput = todoElement.locator('input[type="datetime-local"]');
      await dateInput.clear();
      await dateInput.fill(newDueDate);
    }
    
    if (newPriority) {
      await todoElement.locator('select').selectOption(newPriority);
    }
    
    // Save changes
    await todoElement.locator('button:has-text("Save")').click();
    
    // Wait for edit mode to close
    await this.page.waitForSelector(`text=${newTitle}`, { timeout: 5000 });
  }

  /**
   * Get count of visible todos
   */
  async getTodoCount(): Promise<number> {
    const todos = await this.page.locator('div[class*="bg-white rounded-lg shadow-md"]').count();
    return todos;
  }

  /**
   * Logout current user
   */
  async logout() {
    await this.page.click('button:has-text("Logout")');
    await this.page.waitForURL('/login', { timeout: 5000 });
  }

  // ============================================================================
  // Subtask Helpers
  // ============================================================================

  /**
   * Add a subtask to a todo
   */
  async addSubtask(todoTitle: string, subtaskTitle: string) {
    const todoElement = await this.getTodoElement(todoTitle);
    
    // Click "Add Subtask" button
    await todoElement.locator('button:has-text("Add Subtask")').click();
    
    // Fill subtask title
    const input = todoElement.locator('input[placeholder*="subtask"]');
    await input.fill(subtaskTitle);
    
    // Press Enter or click checkmark
    await input.press('Enter');
    
    // Wait for subtask to appear
    await this.page.waitForSelector(`text=${subtaskTitle}`, { timeout: 5000 });
  }

  /**
   * Toggle a subtask's completion status
   */
  async toggleSubtask(subtaskTitle: string) {
    // Find subtask by title and click its checkbox
    const subtaskElement = this.page.locator(`text=${subtaskTitle}`).locator('xpath=ancestor::div[contains(@class, "ml-8")]').first();
    const checkbox = subtaskElement.locator('input[type="checkbox"]');
    await checkbox.click();
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(subtaskTitle: string) {
    const subtaskElement = this.page.locator(`text=${subtaskTitle}`).locator('xpath=ancestor::div[contains(@class, "ml-8")]').first();
    
    // Hover to show delete button
    await subtaskElement.hover();
    
    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    
    // Click delete button
    await subtaskElement.locator('button[title*="Delete"]').click();
    
    // Wait for subtask to disappear
    await this.page.waitForSelector(`text=${subtaskTitle}`, { state: 'hidden', timeout: 5000 });
  }

  /**
   * Move a subtask up
   */
  async moveSubtaskUp(subtaskTitle: string) {
    const subtaskElement = this.page.locator(`text=${subtaskTitle}`).locator('xpath=ancestor::div[contains(@class, "ml-8")]').first();
    
    // Hover to show move buttons
    await subtaskElement.hover();
    
    // Click move up button
    await subtaskElement.locator('button[title*="Move up"]').click();
    
    // Wait for reorder to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Move a subtask down
   */
  async moveSubtaskDown(subtaskTitle: string) {
    const subtaskElement = this.page.locator(`text=${subtaskTitle}`).locator('xpath=ancestor::div[contains(@class, "ml-8")]').first();
    
    // Hover to show move buttons
    await subtaskElement.hover();
    
    // Click move down button
    await subtaskElement.locator('button[title*="Move down"]').click();
    
    // Wait for reorder to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Get progress text for a todo
   */
  async getProgressText(todoTitle: string): Promise<string | null> {
    const todoElement = await this.getTodoElement(todoTitle);
    
    try {
      const progressText = await todoElement.locator('text=/\\d+ of \\d+ completed \\(\\d+%\\)/').textContent();
      return progressText;
    } catch {
      return null;
    }
  }

  /**
   * Get progress percentage from progress bar
   */
  async getProgressPercentage(todoTitle: string): Promise<number> {
    const todoElement = await this.getTodoElement(todoTitle);
    
    const progressBar = todoElement.locator('.bg-blue-600');
    const width = await progressBar.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.width;
    });
    
    // Extract percentage from width (e.g., "50%" -> 50)
    const match = width.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ============================================================================
  // Tag Helpers
  // ============================================================================

  /**
   * Open tag management modal
   */
  async openTagManagementModal() {
    await this.page.click('button:has-text("Manage Tags")');
    await this.page.waitForSelector('text=Manage Tags', { timeout: 5000 });
  }

  /**
   * Close tag management modal
   */
  async closeTagManagementModal() {
    await this.page.click('button:has-text("×")');
    await this.page.waitForSelector('text=Manage Tags', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Create a new tag via tag management modal
   */
  async createTag(name: string, colorIndex: number = 0) {
    await this.openTagManagementModal();
    
    // Click create button
    await this.page.click('button:has-text("Create New Tag")');
    
    // Fill form
    await this.page.fill('input[placeholder="Tag name"]', name);
    
    // Select color (click the nth color button)
    const colorButtons = this.page.locator('button[type="button"]').filter({ hasNot: this.page.locator('button:has-text("Create")') });
    await colorButtons.nth(colorIndex).click();
    
    // Submit
    await this.page.click('button:has-text("Create")');
    
    // Wait for tag to appear
    await this.page.waitForSelector(`text=${name}`, { timeout: 5000 });
    
    await this.closeTagManagementModal();
  }

  /**
   * Delete a tag via tag management modal
   */
  async deleteTag(name: string) {
    await this.openTagManagementModal();
    
    // Find tag and click delete
    const tagRow = this.page.locator(`text=${name}`).locator('xpath=ancestor::div[contains(@class, "border")]').first();
    
    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    
    await tagRow.locator('button:has-text("Delete")').click();
    
    // Wait for tag to disappear
    await this.page.waitForSelector(`text=${name}`, { state: 'hidden', timeout: 5000 });
    
    await this.closeTagManagementModal();
  }

  /**
   * Edit a tag via tag management modal
   */
  async editTag(oldName: string, newName: string, colorIndex?: number) {
    await this.openTagManagementModal();
    
    // Find tag and click edit
    const tagRow = this.page.locator(`text=${oldName}`).locator('xpath=ancestor::div[contains(@class, "border")]').first();
    await tagRow.locator('button:has-text("Edit")').click();
    
    // Update name
    const input = this.page.locator(`input[value="${oldName}"]`);
    await input.clear();
    await input.fill(newName);
    
    // Update color if provided
    if (colorIndex !== undefined) {
      const colorButtons = this.page.locator('button[type="button"]').filter({ hasNot: this.page.locator('button:has-text("Update")') });
      await colorButtons.nth(colorIndex).click();
    }
    
    // Submit
    await this.page.click('button:has-text("Update")');
    
    // Wait for changes
    await this.page.waitForSelector(`text=${newName}`, { timeout: 5000 });
    
    await this.closeTagManagementModal();
  }

  /**
   * Assign tags to a todo (in Advanced Options)
   */
  async assignTagsToTodo(tagNames: string[]) {
    // Open advanced options if not open
    const advancedButton = this.page.locator('button:has-text("Advanced Options")');
    const isVisible = await advancedButton.isVisible();
    if (isVisible) {
      const isExpanded = await this.page.locator('text=Tags').isVisible().catch(() => false);
      if (!isExpanded) {
        await advancedButton.click();
      }
    }
    
    // Click tag selector
    await this.page.click('button:has-text("Select tags...")');
    
    // Select each tag
    for (const tagName of tagNames) {
      await this.page.click(`text=${tagName}`);
    }
    
    // Close dropdown by clicking outside
    await this.page.click('h2:has-text("Add New Todo")');
  }

  /**
   * Filter todos by tag
   */
  async filterByTag(tagName: string) {
    // Click the tag in the filter section
    const tagFilter = this.page.locator('text="Filter by tag:"').locator('..');
    await tagFilter.locator(`text=${tagName}`).click();
    
    // Wait for filter to apply
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear tag filter
   */
  async clearTagFilter() {
    await this.page.click('button:has-text("Clear filter")');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get usage count for a tag
   */
  async getTagUsageCount(tagName: string): Promise<number> {
    await this.openTagManagementModal();
    
    const tagRow = this.page.locator(`text=${tagName}`).locator('xpath=ancestor::div[contains(@class, "border")]').first();
    const usageText = await tagRow.locator('text=/Used by \\d+ todo/').textContent();
    
    await this.closeTagManagementModal();
    
    const match = usageText?.match(/Used by (\d+) todo/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ========================================
  // Search & Filtering Helpers (PRP-08)
  // ========================================

  /**
   * Search for todos using search bar
   */
  async searchTodos(searchTerm: string) {
    await this.page.fill('input[aria-label="Search todos"]', searchTerm);
    // Wait for debounce
    await this.page.waitForTimeout(400);
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    const clearButton = this.page.locator('button[aria-label="Clear search"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
    await this.page.waitForTimeout(400);
  }

  /**
   * Open advanced filters panel
   */
  async openAdvancedFilters() {
    const button = this.page.locator('button:has-text("Advanced Filters")');
    const isOpen = await this.page.locator('select[id="priority-filter"]').isVisible();
    
    if (!isOpen) {
      await button.click();
      await this.page.waitForSelector('select[id="priority-filter"]', { timeout: 5000 });
    }
  }

  /**
   * Close advanced filters panel
   */
  async closeAdvancedFilters() {
    const button = this.page.locator('button:has-text("Advanced Filters")');
    const isOpen = await this.page.locator('select[id="priority-filter"]').isVisible();
    
    if (isOpen) {
      await button.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Set search mode (simple or advanced)
   */
  async setSearchMode(mode: 'simple' | 'advanced') {
    await this.openAdvancedFilters();
    
    if (mode === 'simple') {
      await this.page.click('button:has-text("Simple (Title only)")');
    } else {
      await this.page.click('button:has-text("Advanced (All fields)")');
    }
    
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter by priority using advanced filters
   */
  async filterByPriorityAdvanced(priority: 'high' | 'medium' | 'low' | 'all') {
    await this.openAdvancedFilters();
    await this.page.selectOption('select[id="priority-filter"]', priority);
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter by tag using advanced filters
   */
  async filterByTagAdvanced(tagName: string) {
    await this.openAdvancedFilters();
    
    // Find tag option by name
    await this.page.selectOption('select[id="tag-filter"]', { label: tagName });
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter by completion status
   */
  async filterByStatus(status: 'all' | 'incomplete' | 'complete') {
    await this.openAdvancedFilters();
    await this.page.selectOption('select[id="status-filter"]', status);
    await this.page.waitForTimeout(300);
  }

  /**
   * Set date range filter
   */
  async setDateRangeFilter(startDate: string, endDate: string) {
    await this.openAdvancedFilters();
    
    const startInput = this.page.locator('input[aria-label="Date range start"]');
    const endInput = this.page.locator('input[aria-label="Date range end"]');
    
    await startInput.fill(startDate);
    await endInput.fill(endDate);
    
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear date range filter
   */
  async clearDateRangeFilter() {
    await this.openAdvancedFilters();
    
    const clearButton = this.page.locator('button[aria-label="Clear date range"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Click "Clear all filters" button
   */
  async clearAllFilters() {
    const clearButton = this.page.locator('button:has-text("Clear all filters")');
    
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Get results count text
   */
  async getResultsCountText(): Promise<string> {
    const todoHeader = this.page.locator('h2:has-text("Your Todos")');
    return await todoHeader.textContent() || '';
  }

  /**
   * Get number of visible todos
   */
  async getVisibleTodoCount(): Promise<number> {
    const todoItems = this.page.locator('.todo-item, div[class*="bg-white rounded-lg shadow"]').filter({
      hasText: /./,  // Filter for non-empty elements
    });
    
    return await todoItems.count();
  }

  /**
   * Check if "no results" message is visible
   */
  async isNoResultsVisible(): Promise<boolean> {
    return await this.page.locator('text=No todos found matching your filters').isVisible();
  }

  /**
   * Get active filter count badge
   */
  async getActiveFilterCount(): Promise<number> {
    const badge = this.page.locator('button:has-text("Advanced Filters") span[class*="bg-blue"]');
    
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      return parseInt(text || '0', 10);
    }
    
    return 0;
  }

  // ==================== Template Methods ====================

  /**
   * Open the template browser modal
   */
  async openTemplateBrowser() {
    await this.page.click('button:has-text("📋 Templates"), button:has-text("Templates")');
    await this.page.waitForSelector('text=Templates', { state: 'visible' });
  }

  /**
   * Close the template browser modal
   */
  async closeTemplateBrowser() {
    // Click the X button or click outside modal
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector('text=Templates', { state: 'hidden', timeout: 2000 }).catch(() => {
      // If escape doesn't work, try clicking the close button
      return this.page.click('button:has-text("×")');
    });
  }

  /**
   * Save a todo as a template
   */
  async saveAsTemplate(options: {
    todoTitle: string;
    templateName: string;
    category?: 'work' | 'personal' | 'other';
    dueOffsetDays?: number;
  }) {
    // Find the todo item
    const todoItem = this.page.locator(`text=${options.todoTitle}`).first();
    await todoItem.scrollIntoViewIfNeeded();
    
    // Find and click "Save as Template" button within the same parent container
    const container = this.page.locator('div').filter({ hasText: options.todoTitle }).first();
    await container.locator('button:has-text("💾 Save as Template"), button:has-text("Save as Template")').click();
    
    // Wait for modal
    await this.page.waitForSelector('text=Save as Template', { state: 'visible' });
    
    // Fill template form
    await this.page.fill('input[placeholder*="Weekly Report"]', options.templateName);
    
    if (options.category) {
      await this.page.selectOption('select[aria-label="Category"], label:has-text("Category") + select', options.category);
    }
    
    if (options.dueOffsetDays !== undefined) {
      await this.page.fill('input[type="number"]', options.dueOffsetDays.toString());
    }
    
    // Save template
    await this.page.click('button:has-text("Save Template")');
    
    // Wait for modal to close
    await this.page.waitForSelector('text=Save as Template', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Use a template to create a todo
   */
  async useTemplate(templateName: string) {
    await this.openTemplateBrowser();
    
    // Find and click the template card containing the name
    const templateCard = this.page.locator('div').filter({ hasText: templateName }).first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    // Wait for modal to close and todo to be created
    await this.page.waitForTimeout(1000);
  }

  /**
   * Filter templates by category
   */
  async filterTemplatesByCategory(category: 'all' | 'work' | 'personal' | 'other') {
    await this.openTemplateBrowser();
    
    // Click the category button
    const categoryButton = this.page.locator(`button:has-text("${category.charAt(0).toUpperCase() + category.slice(1)}")`).first();
    await categoryButton.click();
    
    // Wait for filter to apply
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit a template
   */
  async editTemplate(options: {
    templateName: string;
    newName?: string;
    newCategory?: 'work' | 'personal' | 'other';
    newDueOffsetDays?: number;
  }) {
    await this.openTemplateBrowser();
    
    // Find the template card
    const templateCard = this.page.locator('div').filter({ hasText: options.templateName }).first();
    
    // Click edit button (pencil emoji)
    await templateCard.locator('button[title="Edit template"], button:has-text("✏️")').click();
    
    // Wait for edit modal
    await this.page.waitForSelector('text=Edit Template', { state: 'visible' });
    
    // Update fields if provided
    if (options.newName) {
      await this.page.fill('input[value]', options.newName);
    }
    
    if (options.newCategory) {
      await this.page.selectOption('select', options.newCategory);
    }
    
    if (options.newDueOffsetDays !== undefined) {
      const offsetInput = this.page.locator('input[type="number"]');
      await offsetInput.fill(options.newDueOffsetDays.toString());
    }
    
    // Save changes
    await this.page.click('button:has-text("Save Changes")');
    
    // Wait for edit modal to close
    await this.page.waitForSelector('text=Edit Template', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateName: string) {
    await this.openTemplateBrowser();
    
    // Find the template card
    const templateCard = this.page.locator('div').filter({ hasText: templateName }).first();
    
    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
    
    // Click delete button (trash emoji)
    await templateCard.locator('button[title="Delete template"], button:has-text("🗑️")').click();
    
    // Wait for deletion
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get the number of templates visible
   */
  async getTemplateCount(): Promise<number> {
    await this.openTemplateBrowser();
    
    const templateCards = this.page.locator('div[class*="border rounded-lg"]').filter({
      has: this.page.locator('button:has-text("Use Template")'),
    });
    
    return await templateCards.count();
  }

  /**
   * Get template preview information
   */
  async getTemplatePreview(templateName: string): Promise<{
    title: string;
    priority: string;
    dueDate: string;
    subtaskCount: number;
  } | null> {
    await this.openTemplateBrowser();
    
    const templateCard = this.page.locator('div').filter({ hasText: templateName }).first();
    
    if (!(await templateCard.isVisible())) {
      return null;
    }
    
    // Extract information from the card
    const titleElement = templateCard.locator('p[class*="text-sm text-gray-600"]').first();
    const title = await titleElement.textContent() || '';
    
    const dueDateElement = templateCard.locator('text=/📅 Due:/');
    const dueDate = await dueDateElement.textContent() || '';
    
    const priorityElement = templateCard.locator('[class*="priority"]').first();
    const priority = (await priorityElement.textContent().catch(() => 'medium')) || 'medium';
    
    const subtaskElement = templateCard.locator('text=/✓ \\d+ subtask/');
    const subtaskText = await subtaskElement.textContent().catch(() => '0 subtasks');
    const subtaskCount = parseInt((subtaskText || '0 subtasks').match(/\\d+/)?.[0] || '0', 10);
    
    return {
      title,
      priority,
      dueDate,
      subtaskCount,
    };
  }

  /**
   * Check if a template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    await this.openTemplateBrowser();
    
    const templateCard = this.page.locator('div').filter({ hasText: templateName }).first();
    return await templateCard.isVisible();
  }

  /**
   * Check if "no templates" message is visible
   */
  async isNoTemplatesVisible(): Promise<boolean> {
    await this.openTemplateBrowser();
    return await this.page.locator('text=No templates yet').isVisible();
  }

  // ==================== Export/Import Methods ====================

  /**
   * Export data to JSON file
   * Returns the download object for verification
   */
  async exportData() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('button:has-text("📥 Export Data"), button:has-text("Export Data")');
    const download = await downloadPromise;
    return download;
  }

  /**
   * Import data from a JSON file
   * @param jsonData The data object to import
   * @param shouldConfirm Whether to confirm the import (default: true)
   */
  async importData(jsonData: any, shouldConfirm: boolean = true) {
    // Create a temporary file
    const fs = await import('fs/promises');
    const path = await import('path');
    const tempFile = path.join(__dirname, `temp-import-${Date.now()}.json`);
    
    await fs.writeFile(tempFile, JSON.stringify(jsonData));

    try {
      // Click import button
      await this.page.click('button:has-text("📤 Import Data"), button:has-text("Import Data")');
      
      // Wait for modal
      await this.page.waitForSelector('text=Import Data', { state: 'visible' });
      
      // Select file
      await this.page.setInputFiles('input[type="file"]', tempFile);
      
      // Wait for preview to load
      await this.page.waitForTimeout(1000);
      
      if (shouldConfirm) {
        // Confirm import
        await this.page.click('button:has-text("Confirm Import")');
        
        // Wait for completion
        await this.page.waitForTimeout(1500);
      }
    } finally {
      // Cleanup temp file
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  /**
   * Get import preview information
   */
  async getImportPreview(): Promise<{
    valid: boolean;
    todosCount?: number;
    tagsCount?: number;
    templatesCount?: number;
    errors?: string[];
  }> {
    // Wait for preview to appear
    await this.page.waitForTimeout(1000);
    
    const validationErrors = this.page.locator('text=Validation Errors');
    if (await validationErrors.isVisible()) {
      // Extract error messages
      const errorList = this.page.locator('ul li[class*="text-red"]');
      const errorCount = await errorList.count();
      const errors: string[] = [];
      
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorList.nth(i).textContent();
        if (errorText) {
          errors.push(errorText.replace('❌', '').trim());
        }
      }
      
      return {
        valid: false,
        errors,
      };
    }
    
    // Extract preview counts
    const previewSection = this.page.locator('text=Import Preview');
    if (await previewSection.isVisible()) {
      const contentText = await this.page.locator('ul').first().textContent();
      
      // Parse numbers from preview text
      const todosMatch = contentText?.match(/(\d+)\s+todo/);
      const tagsMatch = contentText?.match(/(\d+)\s+new tag/);
      const templatesMatch = contentText?.match(/(\d+)\s+template/);
      
      return {
        valid: true,
        todosCount: todosMatch ? parseInt(todosMatch[1], 10) : 0,
        tagsCount: tagsMatch ? parseInt(tagsMatch[1], 10) : 0,
        templatesCount: templatesMatch ? parseInt(templatesMatch[1], 10) : 0,
      };
    }
    
    return {
      valid: false,
      errors: ['No preview found'],
    };
  }

  /**
   * Check if import modal is visible
   */
  async isImportModalVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("📤 Import Data"), h2:has-text("Import Data")').isVisible();
  }

  /**
   * Close import modal
   */
  async closeImportModal() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a valid export data structure for testing
   */
  createExportData(options: {
    todos?: any[];
    tags?: any[];
    templates?: any[];
  }): any {
    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: 1,
      data: {
        todos: options.todos || [],
        tags: options.tags || [],
        templates: options.templates || [],
      },
      metadata: {
        total_todos: options.todos?.length || 0,
        total_tags: options.tags?.length || 0,
        total_templates: options.templates?.length || 0,
        total_subtasks: options.todos?.flatMap(t => t.subtasks || []).length || 0,
      },
    };
  }

  /**
   * Verify exported file content
   */
  async verifyExportContent(download: any): Promise<{
    version: string;
    todosCount: number;
    tagsCount: number;
    templatesCount: number;
  }> {
    const fs = await import('fs/promises');
    const downloadPath = await download.path();
    
    if (!downloadPath) {
      throw new Error('Download path not found');
    }
    
    const content = await fs.readFile(downloadPath, 'utf-8');
    const data = JSON.parse(content);
    
    return {
      version: data.version,
      todosCount: data.data.todos?.length || 0,
      tagsCount: data.data.tags?.length || 0,
      templatesCount: data.data.templates?.length || 0,
    };
  }
  // ===========================
  // Calendar View Helpers (PRP-10)
  // ===========================

  /**
   * Navigate to calendar view
   */
  async navigateToCalendar() {
    await this.page.goto('/calendar');
    await this.page.waitForSelector('[data-testid="calendar-grid"]', { timeout: 5000 });
  }

  /**
   * Navigate to a specific month
   * @param year Year (e.g., 2026)
   * @param month Month (1-12)
   */
  async navigateToMonth(year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    await this.page.goto(`/calendar?month=${monthStr}`);
    await this.page.waitForSelector('[data-testid="calendar-grid"]', { timeout: 5000 });
  }

  /**
   * Click a calendar date cell
   * @param dateString Date in YYYY-MM-DD format
   */
  async clickCalendarDate(dateString: string) {
    await this.page.click(`[data-testid="calendar-day-${dateString}"]`);
    await this.page.waitForSelector('[data-testid="date-detail-modal"]', { timeout: 2000 });
  }

  /**
   * Get calendar cell element
   * @param dateString Date in YYYY-MM-DD format
   */
  async getCalendarCell(dateString: string) {
    return this.page.locator(`[data-testid="calendar-day-${dateString}"]`);
  }

  /**
   * Get todo count for a specific date
   * @param dateString Date in YYYY-MM-DD format
   */
  async getTodoCountForDate(dateString: string): Promise<number> {
    const cell = await this.getCalendarCell(dateString);
    const countBadge = cell.locator('.text-gray-600.bg-white\\/80');
    
    if (await countBadge.isVisible()) {
      const text = await countBadge.textContent();
      return parseInt(text || '0', 10);
    }
    
    return 0;
  }

  /**
   * Check if holiday is visible on a date
   * @param dateString Date in YYYY-MM-DD format
   * @param holidayName Expected holiday name
   */
  async isHolidayVisible(dateString: string, holidayName?: string): Promise<boolean> {
    const holidayElement = this.page.locator(`[data-testid="holiday-${dateString}"]`);
    const isVisible = await holidayElement.isVisible();
    
    if (!isVisible || !holidayName) {
      return isVisible;
    }
    
    const text = await holidayElement.textContent();
    return text?.includes(holidayName) || false;
  }

  /**
   * Open date detail modal for a specific date
   * @param dateString Date in YYYY-MM-DD format
   */
  async openDateDetailModal(dateString: string) {
    await this.clickCalendarDate(dateString);
  }

  /**
   * Close date detail modal
   */
  async closeDateDetailModal() {
    await this.page.click('[data-testid="close-modal"]');
    await this.page.waitForSelector('[data-testid="date-detail-modal"]', { 
      state: 'hidden', 
      timeout: 2000 
    });
  }

  /**
   * Navigate to previous month
   */
  async navigateToPreviousMonth() {
    await this.page.click('[data-testid="prev-month"]');
    await this.page.waitForTimeout(500); // Wait for calendar to update
  }

  /**
   * Navigate to next month
   */
  async navigateToNextMonth() {
    await this.page.click('[data-testid="next-month"]');
    await this.page.waitForTimeout(500); // Wait for calendar to update
  }

  /**
   * Click "Today" button to navigate to current month
   */
  async clickTodayButton() {
    await this.page.click('[data-testid="today-button"]');
    await this.page.waitForTimeout(500); // Wait for calendar to update
  }

  /**
   * Get current displayed month from header
   */
  async getCurrentMonth(): Promise<string> {
    const monthHeader = this.page.locator('[data-testid="current-month"]');
    return (await monthHeader.textContent()) || '';
  }

  /**
   * Toggle todo completion in date detail modal
   * @param todoId Todo ID
   */
  async toggleTodoInModal(todoId: number) {
    await this.page.click(`[data-testid="todo-checkbox-${todoId}"]`);
    await this.page.waitForTimeout(500); // Wait for API call
  }

  /**
   * Get heat map intensity class for a date
   * @param dateString Date in YYYY-MM-DD format
   */
  async getHeatMapIntensity(dateString: string): Promise<string> {
    const cell = await this.getCalendarCell(dateString);
    const classList = await cell.getAttribute('class');
    
    if (!classList) return '';
    
    if (classList.includes('bg-blue-300')) return 'high';
    if (classList.includes('bg-blue-200')) return 'medium-high';
    if (classList.includes('bg-blue-100')) return 'medium';
    if (classList.includes('bg-gray-100')) return 'low';
    
    return 'none';
  }

  /**
   * Check if date is highlighted as today
   * @param dateString Date in YYYY-MM-DD format
   */
  async isDateToday(dateString: string): Promise<boolean> {
    const cell = await this.getCalendarCell(dateString);
    const classList = await cell.getAttribute('class');
    return classList?.includes('ring-2 ring-blue-500') || false;
  }

  /**
   * Get all visible calendar dates
   */
  async getAllCalendarDates(): Promise<string[]> {
    const cells = this.page.locator('[data-date]');
    const count = await cells.count();
    const dates: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const date = await cells.nth(i).getAttribute('data-date');
      if (date) dates.push(date);
    }
    
    return dates;
  }
}
