/**
 * Database Layer - Single Source of Truth
 * 
 * This file contains all database interfaces and CRUD operations.
 * Uses better-sqlite3 (synchronous SQLite library - no async/await needed).
 * Database file: todos.db in project root.
 */

import Database from 'better-sqlite3';
import { getSingaporeNow, formatSingaporeDate } from './timezone';
import type { Priority, PriorityConfig } from './constants';
import { getRandomTagColor } from './constants';

// Use /tmp for Railway deployment, fallback to local for development
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/todos.db' : 'todos.db';
const db = new Database(dbPath);

console.log('Database initialized at:', dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ============================================================================
// Type Definitions
// ============================================================================

// Re-export types for external use
export type { Priority, PriorityConfig };
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TemplateCategory = 'work' | 'personal' | 'other';

export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  due_date: string;
  priority: Priority;
  completed: number;
  completed_at: string | null;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
}

export interface TodoWithRelations extends Todo {
  subtasks?: Subtask[];
  tags?: Tag[];
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TagWithCount extends Tag {
  usage_count: number;  // Number of todos using this tag
}

export interface TodoTag {
  todo_id: number;
  tag_id: number;
  created_at: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  category: TemplateCategory | null;
  title: string;
  priority: Priority;
  due_offset_days: number;
  subtasks_json: string | null;
  created_at: string;
}

export interface TemplateWithSubtasks extends Template {
  subtasks: Array<{ title: string; position: number }>;
}

/**
 * Parse template subtasks from JSON
 */
export function parseTemplateSubtasks(template: Template): TemplateWithSubtasks {
  let subtasks: Array<{ title: string; position: number }> = [];
  
  if (template.subtasks_json) {
    try {
      subtasks = JSON.parse(template.subtasks_json);
    } catch (error) {
      console.error('Failed to parse template subtasks:', error);
    }
  }

  return { ...template, subtasks };
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  is_recurring: number;
  created_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

// Re-export utility functions and constants from shared constants file
export { calculateProgress, TAG_COLORS, getRandomTagColor } from './constants';

// ============================================================================
// Priority Configuration
// ============================================================================

// Re-export priority configuration from shared constants file
export { PRIORITY_CONFIGS } from './constants';

/**
 * Validate priority value and return valid Priority or default to 'medium'
 */
export function validatePriority(priority?: string | null): Priority {
  const valid: Priority[] = ['high', 'medium', 'low'];
  if (!priority || !valid.includes(priority as Priority)) {
    return 'medium';
  }
  return priority as Priority;
}

// ============================================================================
// Recurrence Configuration
// ============================================================================

// Re-export recurrence configuration from shared constants file
export type { RecurrenceConfig } from './constants';
export { RECURRENCE_CONFIGS } from './constants';

/**
 * Validate recurrence pattern and return valid RecurrencePattern or null
 */
export function validateRecurrence(pattern?: string | null): RecurrencePattern | null {
  const valid: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!pattern || !valid.includes(pattern as RecurrencePattern)) {
    return null;
  }
  return pattern as RecurrencePattern;
}

// ============================================================================
// Reminder Configuration
// ============================================================================

// Re-export constants from shared constants file
export type { ReminderOption } from './constants';
export { REMINDER_OPTIONS } from './constants';

/**
 * Validate reminder minutes and return valid value or null
 */
export function validateReminderMinutes(minutes?: number | null): number | null {
  if (minutes === null || minutes === undefined) return null;
  
  const validOptions = [15, 30, 60, 120, 1440, 2880, 10080];
  if (!validOptions.includes(minutes)) {
    return null;
  }
  
  return minutes;
}

// ============================================================================
// Database Schema Initialization
// ============================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (todo_id, tag_id),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_offset_days INTEGER NOT NULL DEFAULT 0,
    subtasks_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create indexes for better performance
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
    CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
    CREATE INDEX IF NOT EXISTS idx_authenticators_credential_id ON authenticators(credential_id);
    CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
  `);
} catch (error) {
  // Indexes might already exist
}

// ============================================================================
// Database Migrations (PRP-07: Template System)
// ============================================================================

// Migrate templates table from old schema to new schema
try {
  // Check if old column exists
  const columns = db.prepare("PRAGMA table_info(templates)").all() as any[];
  const hasOldSchema = columns.some((col: any) => col.name === 'title_template');
  
  if (hasOldSchema) {
    console.log('Migrating templates table to new schema...');
    
    // SQLite doesn't support renaming columns directly, so we need to recreate the table
    db.exec(`
      -- Create new templates table with correct schema
      CREATE TABLE templates_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        due_offset_days INTEGER NOT NULL DEFAULT 0,
        subtasks_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Copy data from old table, renaming columns
      INSERT INTO templates_new (id, user_id, name, category, title, priority, due_offset_days, subtasks_json, created_at)
      SELECT id, user_id, name, NULL as category, title_template as title, priority, due_date_offset_days as due_offset_days, subtasks_json, created_at
      FROM templates;
      
      -- Drop old table
      DROP TABLE templates;
      
      -- Rename new table
      ALTER TABLE templates_new RENAME TO templates;
      
      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
      CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    `);
    
    console.log('Migration completed successfully');
  }
} catch (error) {
  console.error('Migration error (may be already migrated):', error);
}

// ============================================================================
// User CRUD Operations
// ============================================================================

export const userDB = {
  /**
   * Create a new user
   */
  create(username: string, displayName: string): User {
    const stmt = db.prepare(`
      INSERT INTO users (username, display_name)
      VALUES (?, ?)
    `);
    const result = stmt.run(username, displayName);
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find user by ID
   */
  findById(id: number): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  },

  /**
   * Find user by username
   */
  findByUsername(username: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | null;
  },

  /**
   * Get all users
   */
  findAll(): User[] {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return stmt.all() as User[];
  },

  /**
   * Delete a user (cascades to todos, authenticators, etc.)
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Authenticator CRUD Operations
// ============================================================================

export const authenticatorDB = {
  /**
   * Create a new authenticator for a user
   */
  create(data: {
    user_id: number;
    credential_id: string;
    public_key: string;
    counter: number;
    transports?: string;
  }): Authenticator {
    const stmt = db.prepare(`
      INSERT INTO authenticators (user_id, credential_id, public_key, counter, transports)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id,
      data.credential_id,
      data.public_key,
      data.counter,
      data.transports || null
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find authenticator by ID
   */
  findById(id: number): Authenticator | null {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE id = ?');
    return stmt.get(id) as Authenticator | null;
  },

  /**
   * Find authenticator by credential ID
   */
  findByCredentialId(credentialId: string): Authenticator | null {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE credential_id = ?');
    return stmt.get(credentialId) as Authenticator | null;
  },

  /**
   * Find all authenticators for a user
   */
  findByUser(userId: number): Authenticator[] {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Authenticator[];
  },

  /**
   * Update authenticator counter (for WebAuthn replay protection)
   */
  updateCounter(id: number, counter: number): void {
    const stmt = db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?');
    stmt.run(counter, id);
  },

  /**
   * Delete an authenticator
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM authenticators WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Todo CRUD Operations
// ============================================================================

export const todoDB = {
  /**
   * Create a new todo
   */
  create(data: {
    user_id: number;
    title: string;
    due_date: string;
    priority?: Priority;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
  }): Todo {
    const stmt = db.prepare(`
      INSERT INTO todos (user_id, title, due_date, priority, recurrence_pattern, reminder_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id,
      data.title.trim(),
      data.due_date,
      data.priority || 'medium',
      data.recurrence_pattern || null,
      data.reminder_minutes || null
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find todo by ID
   */
  findById(id: number): Todo | null {
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
    return stmt.get(id) as Todo | null;
  },

  /**
   * Find all todos for a user with optional filters
   */
  findByUser(
    userId: number,
    options?: {
      includeCompleted?: boolean;
      priority?: Priority;
      tagId?: number;
    }
  ): TodoWithRelations[] {
    let query = 'SELECT DISTINCT t.* FROM todos t';
    const params: any[] = [userId];

    // Join with tags if filtering by tag
    if (options?.tagId) {
      query += ' INNER JOIN todo_tags tt ON t.id = tt.todo_id';
      query += ' WHERE t.user_id = ? AND tt.tag_id = ?';
      params.push(options.tagId);
    } else {
      query += ' WHERE t.user_id = ?';
    }

    // Filter by completion status
    if (!options?.includeCompleted) {
      query += ' AND t.completed = 0';
    }

    // Filter by priority
    if (options?.priority) {
      query += ' AND t.priority = ?';
      params.push(options.priority);
    }

    // Sort: incomplete first, then by priority (high→medium→low), then by due date
    query += ` 
      ORDER BY 
        t.completed ASC,
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END ASC,
        t.due_date ASC
    `;

    const stmt = db.prepare(query);
    const todos = stmt.all(...params) as Todo[];

    // Attach subtasks and tags
    return todos.map(todo => ({
      ...todo,
      subtasks: subtaskDB.findByTodo(todo.id),
      tags: this.getTags(todo.id),
    }));
  },

  /**
   * Update a todo
   */
  update(
    id: number,
    data: Partial<{
      title: string;
      due_date: string;
      priority: Priority;
      completed: number;
      completed_at: string | null;
      recurrence_pattern: RecurrencePattern | null;
      reminder_minutes: number | null;
      last_notification_sent: string | null;
    }>
  ): Todo | null {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  },

  /**
   * Delete a todo (cascades to subtasks and tag relationships)
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
    stmt.run(id);
  },

  /**
   * Get tags for a todo
   */
  getTags(todoId: number): Tag[] {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.name
    `);
    return stmt.all(todoId) as Tag[];
  },

  /**
   * Add a tag to a todo
   */
  addTag(todoId: number, tagId: number): void {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO todo_tags (todo_id, tag_id)
      VALUES (?, ?)
    `);
    stmt.run(todoId, tagId);
  },

  /**
   * Remove a tag from a todo
   */
  removeTag(todoId: number, tagId: number): void {
    const stmt = db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?');
    stmt.run(todoId, tagId);
  },

  /**
   * Get todos due for reminder notification
   */
  getDueForReminder(): Todo[] {
    const now = formatSingaporeDate(getSingaporeNow());
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE completed = 0 
        AND reminder_minutes IS NOT NULL
        AND (last_notification_sent IS NULL OR last_notification_sent < datetime('now', '-1 hour'))
        AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= ?
      ORDER BY due_date ASC
    `);
    return stmt.all(now) as Todo[];
  },

  /**
   * Create next recurring instance
   * Copies tags and subtasks from parent
   */
  createRecurringInstance(parentTodo: Todo): Todo {
    if (!parentTodo.recurrence_pattern) {
      throw new Error('Todo is not recurring');
    }

    // Import calculateNextDueDate dynamically to avoid circular dependency
    const { calculateNextDueDate } = require('./recurrence');
    const nextDueDate = calculateNextDueDate(
      parentTodo.due_date,
      parentTodo.recurrence_pattern
    );

    // Create next todo
    const nextTodo = this.create({
      user_id: parentTodo.user_id,
      title: parentTodo.title,
      due_date: nextDueDate,
      priority: parentTodo.priority,
      recurrence_pattern: parentTodo.recurrence_pattern,
      reminder_minutes: parentTodo.reminder_minutes ?? null,
    });

    // Copy tags (many-to-many)
    const copyTagsStmt = db.prepare(`
      INSERT INTO todo_tags (todo_id, tag_id)
      SELECT ?, tag_id FROM todo_tags WHERE todo_id = ?
    `);
    copyTagsStmt.run(nextTodo.id, parentTodo.id);

    // Copy subtasks
    const subtasks = subtaskDB.findByTodo(parentTodo.id);
    subtasks.forEach(subtask => {
      subtaskDB.create({
        todo_id: nextTodo.id,
        title: subtask.title,
        position: subtask.position,
      });
    });

    return nextTodo;
  },

  /**
   * Get all recurring todos (incomplete)
   */
  findRecurringByUser(userId: number): Todo[] {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
        AND recurrence_pattern IS NOT NULL
        AND completed = 0
      ORDER BY due_date ASC
    `);
    return stmt.all(userId) as Todo[];
  },
};

// ============================================================================
// Subtask CRUD Operations
// ============================================================================

export const subtaskDB = {
  /**
   * Create a new subtask
   */
  create(data: {
    todo_id: number;
    title: string;
    position: number;
  }): Subtask {
    const stmt = db.prepare(`
      INSERT INTO subtasks (todo_id, title, position)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.todo_id, data.title.trim(), data.position);
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find subtask by ID
   */
  findById(id: number): Subtask | null {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE id = ?');
    return stmt.get(id) as Subtask | null;
  },

  /**
   * Find all subtasks for a todo
   */
  findByTodo(todoId: number): Subtask[] {
    const stmt = db.prepare(`
      SELECT * FROM subtasks 
      WHERE todo_id = ? 
      ORDER BY position ASC, created_at ASC
    `);
    return stmt.all(todoId) as Subtask[];
  },

  /**
   * Update a subtask
   */
  update(
    id: number,
    data: Partial<{
      title: string;
      completed: number;
      position: number;
    }>
  ): Subtask | null {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  },

  /**
   * Delete a subtask
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
    stmt.run(id);
  },

  /**
   * Get completion progress for a todo
   */
  getProgress(todoId: number): { total: number; completed: number; percentage: number } {
    const subtasks = this.findByTodo(todoId);
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.completed === 1).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percentage };
  },
};

// ============================================================================
// Tag CRUD Operations
// ============================================================================

export const tagDB = {
  /**
   * Create a new tag
   */
  create(data: {
    user_id: number;
    name: string;
    color?: string;
  }): Tag {
    const stmt = db.prepare(`
      INSERT INTO tags (user_id, name, color)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id,
      data.name.trim(),
      data.color || getRandomTagColor()
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find tag by ID
   */
  findById(id: number): Tag | null {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id) as Tag | null;
  },

  /**
   * Find all tags for a user
   */
  findByUser(userId: number): Tag[] {
    const stmt = db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC');
    return stmt.all(userId) as Tag[];
  },

  /**
   * Find all tags for a user with usage counts
   */
  findByUserWithCount(userId: number): TagWithCount[] {
    const stmt = db.prepare(`
      SELECT 
        tags.*,
        COUNT(todo_tags.todo_id) as usage_count
      FROM tags
      LEFT JOIN todo_tags ON tags.id = todo_tags.tag_id
      WHERE tags.user_id = ?
      GROUP BY tags.id
      ORDER BY tags.name ASC
    `);
    return stmt.all(userId) as TagWithCount[];
  },

  /**
   * Find tag by user and name (for duplicate check)
   */
  findByUserAndName(userId: number, name: string): Tag | null {
    const stmt = db.prepare(`
      SELECT * FROM tags 
      WHERE user_id = ? AND name = ?
    `);
    return stmt.get(userId, name) as Tag | null;
  },

  /**
   * Update a tag
   */
  update(
    id: number,
    data: Partial<{
      name: string;
      color: string;
    }>
  ): Tag | null {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  },

  /**
   * Delete a tag (removes all todo associations)
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Template CRUD Operations
// ============================================================================

export const templateDB = {
  /**
   * Create a new template
   */
  create(data: {
    user_id: number;
    name: string;
    category?: TemplateCategory | null;
    title: string;
    priority?: Priority;
    due_offset_days?: number;
    subtasks_json?: string;
  }): Template {
    const stmt = db.prepare(`
      INSERT INTO templates (user_id, name, category, title, priority, due_offset_days, subtasks_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id,
      data.name.trim(),
      data.category || null,
      data.title.trim(),
      data.priority || 'medium',
      data.due_offset_days || 0,
      data.subtasks_json || null
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find template by ID
   */
  findById(id: number): Template | null {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    return stmt.get(id) as Template | null;
  },

  /**
   * Find all templates for a user
   */
  findByUser(userId: number): Template[] {
    const stmt = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY category ASC, name ASC');
    return stmt.all(userId) as Template[];
  },

  /**
   * Find templates by category
   */
  findByCategory(userId: number, category: TemplateCategory): Template[] {
    const stmt = db.prepare(`
      SELECT * FROM templates 
      WHERE user_id = ? AND category = ?
      ORDER BY name ASC
    `);
    return stmt.all(userId, category) as Template[];
  },

  /**
   * Get all templates with parsed subtasks
   */
  findByUserWithSubtasks(userId: number): TemplateWithSubtasks[] {
    const templates = this.findByUser(userId);
    return templates.map(t => parseTemplateSubtasks(t));
  },

  /**
   * Update a template
   */
  update(
    id: number,
    data: Partial<{
      name: string;
      category: TemplateCategory | null;
      title: string;
      priority: Priority;
      due_offset_days: number;
      subtasks_json: string;
    }>
  ): Template | null {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  },

  /**
   * Delete a template
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Holiday CRUD Operations
// ============================================================================

export const holidayDB = {
  /**
   * Create a new holiday
   */
  create(data: {
    date: string;
    name: string;
    is_recurring?: number;
  }): Holiday {
    const stmt = db.prepare(`
      INSERT INTO holidays (date, name, is_recurring)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.date,
      data.name.trim(),
      data.is_recurring || 0
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * Find holiday by ID
   */
  findById(id: number): Holiday | null {
    const stmt = db.prepare('SELECT * FROM holidays WHERE id = ?');
    return stmt.get(id) as Holiday | null;
  },

  /**
   * Find holiday by date
   */
  findByDate(date: string): Holiday | null {
    const stmt = db.prepare('SELECT * FROM holidays WHERE date = ?');
    return stmt.get(date) as Holiday | null;
  },

  /**
   * Get all holidays in a date range
   */
  findInRange(startDate: string, endDate: string): Holiday[] {
    const stmt = db.prepare(`
      SELECT * FROM holidays 
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    return stmt.all(startDate, endDate) as Holiday[];
  },

  /**
   * Get all holidays
   */
  findAll(): Holiday[] {
    const stmt = db.prepare('SELECT * FROM holidays ORDER BY date ASC');
    return stmt.all() as Holiday[];
  },

  /**
   * Delete a holiday
   */
  delete(id: number): void {
    const stmt = db.prepare('DELETE FROM holidays WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Export Database Instance (for advanced queries)
// ============================================================================

export { db };
