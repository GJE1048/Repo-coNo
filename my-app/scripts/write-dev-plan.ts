import fs from 'fs';
import path from 'path';

const content = `# Admin Panel Development Plan (my-app-back)

## 1. Project Overview
This project is a backend management system (Admin Panel) for the CO-NOTION (my-app) platform. It provides administrators with a visual interface to manage users, documents, workspaces, and system settings.

## 2. Tech Stack
- **Framework**: React 19 (via Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI based)
- **Icons**: Lucide React
- **State Management / API**: TanStack Query + TRPC Client (sharing types with main app if possible, or using loose coupling)
- **Routing**: React Router v6+
- **Build Tool**: Vite

## 3. Directory Structure
\`\`\`
my-app-back/
├── src/
│   ├── assets/
│   ├── components/         # Shared UI components
│   │   ├── ui/            # Shadcn UI components
│   │   └── layout/        # Layout components (Sidebar, Header)
│   ├── features/          # Feature-based modules
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── documents/
│   │   └── workspaces/
│   ├── hooks/
│   ├── lib/               # Utilities (API client, utils)
│   ├── pages/             # Route pages
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
└── docs/                  # Documentation
\`\`\`

## 4. Functional Modules

### 4.1 Dashboard (Home)
- **Overview Stats**:
  - Total Users
  - Total Documents
  - Active Workspaces
  - Storage Usage
- **Recent Activity**: Stream of recent system operations.
- **Charts**: User growth, Document creation trends.

### 4.2 User Management (\`/users\`)
- **User List**: Table view with search and filters.
  - Columns: Avatar, Username, Email (Clerk ID), Created At, Status.
- **User Details**: View user profile, associated workspaces, and document stats.
- **Actions**: Ban user, Delete user (Soft/Hard delete).

### 4.3 Document Management (\`/documents\`)
- **Document List**: Global list of documents.
  - Columns: Title, Owner, Workspace, Status (Archived/Active), Created At.
- **Content Moderation**: Preview document content (read-only).
- **Actions**: Archive document, Delete document, Restore version.

### 4.4 Workspace Management (\`/workspaces\`)
- **Workspace List**: List all workspaces.
  - Columns: Name, Owner, Member Count, Type (Personal/Team).
- **Details**: View workspace members and permissions.

### 4.5 Integration Management (\`/integrations\`)
- **Accounts**: View connected third-party accounts (WordPress, Ghost, etc.).
- **Status**: Check token validity/status.

### 4.6 System Settings (\`/settings\`)
- **General**: System-wide announcements.
- **AI Configuration**: LLM settings (if applicable).

## 5. Backend Integration Strategy
The admin panel will consume the existing Next.js backend API (\`my-app\`).

### Current Status & Gap Analysis
The current \`my-app\` backend TRPC routers are designed for end-users (scoped to \`ctx.user.id\`).
To support this Admin Panel, we will need to:
1.  **Add Admin Procedures**: Create a new \`admin\` router in \`my-app\` (e.g., \`admin.getUsers\`, \`admin.getAllDocuments\`).
2.  **Authentication**: Implement Admin role verification (e.g., via Clerk metadata or a specific whitelist).
3.  **CORS**: Ensure \`my-app\` allows requests from the admin panel origin (e.g., \`http://localhost:5173\`).

### Proposed Admin Router Structure (in \`my-app\`)
\`\`\`typescript
// modules/admin/server/procedures.ts
export const adminRouter = createTRPCRouter({
  getStats: adminProcedure.query(...),
  getUsers: adminProcedure.input(...).query(...),
  getAllDocuments: adminProcedure.input(...).query(...),
  // ...
});
\`\`\`

## 6. Next Steps
1.  Initialize React project with Vite.
2.  Setup Tailwind CSS and basic Layout (Sidebar + Header).
3.  Implement "Dashboard" UI (Mock data first).
4.  Extend \`my-app\` backend with \`admin\` router.
5.  Integrate API.
`;

const targetPath = path.resolve(process.cwd(), '../my-app-back/docs/development-plan.md');
fs.writeFileSync(targetPath, content);
console.log(`Successfully wrote to ${targetPath}`);
