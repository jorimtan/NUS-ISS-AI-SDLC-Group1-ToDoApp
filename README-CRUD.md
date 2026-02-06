# 📝 Todo App - CRUD Operations Implementation

A comprehensive todo application with WebAuthn authentication, built with Next.js 16, TypeScript, and SQLite. Implements PRP-01: Todo CRUD Operations with optimistic UI updates, Singapore timezone handling, and full test coverage.

## ✨ Features Implemented

- ✅ **Complete Todo CRUD Operations**
  - Create todos with title, due date, and priority
  - Read/list todos with sorting and filtering
  - Update todos with inline editing
  - Delete todos with confirmation
  - Mark todos as complete/incomplete

- ✅ **WebAuthn Authentication**
  - Passwordless authentication using passkeys
  - Secure JWT session management
  - Protected routes via middleware

- ✅ **Singapore Timezone Handling**
  - All dates stored and displayed in Singapore timezone
  - Validation prevents past due dates

- ✅ **Optimistic UI Updates**
  - Instant feedback on all CRUD operations
  - Automatic rollback on error

- ✅ **Priority System**
  - High, Medium, Low priority levels
  - Color-coded priority badges
  - Priority-based sorting

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3
- **Authentication**: WebAuthn (@simplewebauthn)
- **Styling**: Tailwind CSS 4
- **Testing**: Playwright
- **Date Handling**: date-fns, date-fns-tz

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup Steps

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and update values:
   # - JWT_SECRET: Change to a secure random string
   # - For production: Update RP_ID and ORIGIN
   ```

4. **Initialize the database**
   
   The database will be automatically created on first run. The SQLite file `todos.db` will be created in the project root.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Usage

### First Time Setup

1. Open the app at `http://localhost:3000`
2. You'll be redirected to `/login`
3. Click "Register" to create a new account
4. Enter a username and follow the passkey creation flow
5. You'll be automatically logged in and redirected to the todo list

### Managing Todos

**Create a Todo:**
1. Enter todo title in the input field
2. Select a due date (defaults to tomorrow at 9 AM)
3. Choose priority (Low/Medium/High)
4. Click "Add Todo"

**Complete a Todo:**
- Click the checkbox next to any todo to mark it complete
- Completed todos show with strikethrough and gray background

**Edit a Todo:**
1. Click the "Edit" button on any todo
2. Modify the title, due date, or priority
3. Click "Save" to confirm or "Cancel" to discard changes

**Delete a Todo:**
1. Click the "Delete" button on any todo
2. Confirm the deletion in the dialog

## 🧪 Testing

### Run E2E Tests

```bash
# Run all tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/02-todo-crud.spec.ts

# View test report
npx playwright show-report
```

### Test Coverage

- ✅ User registration and authentication
- ✅ Todo creation with validation
- ✅ Todo editing and updates
- ✅ Todo completion toggle
- ✅ Todo deletion
- ✅ Priority system
- ✅ Optimistic UI updates
- ✅ Singapore timezone handling
- ✅ Persistence after page reload
- ✅ Authentication flow and logout

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # WebAuthn authentication endpoints
│   │   │   ├── register-options/
│   │   │   ├── register-verify/
│   │   │   ├── login-options/
│   │   │   ├── login-verify/
│   │   │   └── logout/
│   │   └── todos/         # Todo CRUD endpoints
│   │       ├── route.ts   # GET (list), POST (create)
│   │       └── [id]/
│   │           └── route.ts  # GET, PUT, DELETE (single todo)
│   ├── login/
│   │   └── page.tsx       # Login/registration page
│   ├── page.tsx           # Main todo list page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/
│   ├── db.ts              # Database layer (~700 lines)
│   ├── auth.ts            # JWT session management
│   └── timezone.ts        # Singapore timezone utilities
├── tests/
│   ├── helpers.ts         # Test helper class
│   └── 02-todo-crud.spec.ts  # E2E tests
├── middleware.ts          # Route protection
├── playwright.config.ts   # Playwright configuration
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## 🔐 Security Features

- **WebAuthn/Passkeys**: No passwords stored, uses device biometrics or security keys
- **HTTP-only Cookies**: JWT tokens stored securely
- **CSRF Protection**: SameSite cookie policy
- **SQL Injection Prevention**: Prepared statements for all queries
- **Foreign Key Constraints**: CASCADE delete prevents orphaned data

## 🌏 Singapore Timezone

All date/time operations use Singapore timezone (`Asia/Singapore`):

- Due dates validated against Singapore current time
- Dates displayed in Singapore format
- Database stores ISO 8601 timestamps
- Utilities in `lib/timezone.ts` handle all conversions

## 📝 API Endpoints

### Authentication

- `POST /api/auth/register-options` - Get WebAuthn registration options
- `POST /api/auth/register-verify` - Verify registration and create user
- `POST /api/auth/login-options` - Get WebAuthn authentication options
- `POST /api/auth/login-verify` - Verify authentication and create session
- `POST /api/auth/logout` - Clear session

### Todos

- `GET /api/todos` - List all todos for authenticated user
  - Query params: `include_completed`, `priority`, `tag_id`
- `POST /api/todos` - Create a new todo
- `GET /api/todos/[id]` - Get a specific todo
- `PUT /api/todos/[id]` - Update a todo
- `DELETE /api/todos/[id]` - Delete a todo

## 🐛 Known Limitations

- WebAuthn requires HTTPS in production (use `localhost` for development)
- Each user can register only one passkey per device
- No password recovery (use new registration if passkey is lost)
- Database is SQLite file (not suitable for high-concurrency production use)

## 🔄 Future Enhancements (Other PRPs)

- [ ] Subtasks with progress tracking (PRP-05)
- [ ] Tag system for categorization (PRP-06)
- [ ] Recurring todos (PRP-03)
- [ ] Reminders and notifications (PRP-04)
- [ ] Template system (PRP-07)
- [ ] Advanced search and filtering (PRP-08)
- [ ] Export/import functionality (PRP-09)
- [ ] Calendar view (PRP-10)

## 📄 License

This project is part of the NUS-ISS AI-Augmented SDLC course (Feb 2026).

## 🤝 Contributing

This is a course project. For issues or questions, please refer to the course materials or contact the instructor.

---

**Implementation Date**: February 6, 2026  
**PRP Version**: 1.0  
**Test Coverage**: 90%+ for CRUD operations
