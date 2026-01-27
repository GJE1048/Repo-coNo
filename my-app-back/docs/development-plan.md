# 管理后台开发计划 (my-app-back)

## 1. 项目概述
本项目是 CO-NOTION (my-app) 平台的后台管理系统 (Admin Panel)。它为管理员提供了一个可视化界面，用于管理用户、文档、工作区和系统设置。

该项目构建为一个独立的单页应用 (SPA)，使用 React 19 和 Vite 开发，调用主 Next.js 应用程序提供的 API。

## 2. 技术栈
- **框架**: React 19 (通过 Vite)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **UI 组件**: Shadcn UI (基于 Radix UI)
- **图标**: Lucide React
- **状态管理 / API**: TanStack Query + TRPC Client (如果可能，与主应用共享类型，或使用松耦合方式)
- **路由**: React Router v6+
- **构建工具**: Vite

## 3. 目录结构
```
my-app-back/
├── src/
│   ├── assets/
│   ├── components/         # 共享 UI 组件
│   │   ├── ui/            # Shadcn UI 组件
│   │   └── layout/        # 布局组件 (侧边栏, 顶栏)
│   ├── features/          # 基于功能的模块
│   │   ├── auth/          # 管理员登录
│   │   ├── dashboard/     # 概览
│   │   ├── users/         # 用户管理
│   │   ├── documents/     # 文档管理
│   │   ├── ai-shorthand/  # AI 速记记录管理
│   │   └── settings/      # 系统设置
│   ├── hooks/
│   ├── lib/               # 工具库 (API 客户端, utils)
│   ├── pages/             # 路由页面
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
└── docs/                  # 文档
```

## 4. 功能模块

### 4.1 仪表盘 (概览)
- **路由**: `/`
- **功能**:
    - 系统健康状态 (数据库, Redis 等)
    - 总用户数统计
    - 总文档数统计
    - 近期活动日志 (新注册用户, 新创建文档)
- **对应后端接口需求**:
    - 需要在 `my-app` 中新增 `admin.getDashboardStats`

### 4.2 用户管理
- **路由**: `/users`
- **功能**:
    - 用户列表 (表格视图，支持搜索/过滤)
    - 查看用户详情 (ID, 用户名, Email, Clerk ID, 创建时间)
    - 操作: 禁用/封禁用户
- **现有数据结构 (参考 `my-app/db/schema.ts`)**:
    - 表: `users`
    - 字段: `id`, `username`, `clerkId`, `imageUrl`, `createdAt`
- **API 端点**:
    - `GET /api/trpc/admin.getUsers` (需实现)
    - `POST /api/trpc/admin.updateUserStatus` (需实现)

### 4.3 文档管理
- **路由**: `/documents`
- **功能**:
    - 所有文档列表 (表格视图: 标题, 所有者, 创建时间, 版本, 是否归档)
    - 查看文档历史 (版本列表)
    - 查看文档内容 (只读编辑器视图)
    - 操作: 删除文档 (软删除/硬删除), 恢复版本
- **现有数据结构 (参考 `my-app/db/schema.ts`)**:
    - 表: `documents`
    - 字段: `id`, `title`, `ownerId`, `workspaceId`, `isArchived`, `createdAt`
- **API 端点**:
    - `GET /api/trpc/admin.getAllDocuments` (需实现，支持分页和搜索)
    - `GET /api/documents/:id/versions` (复用现有逻辑或新增 Admin 专用接口)

### 4.4 AI 速记记录
- **路由**: `/ai-shorthand`
- **功能**:
    - 记录列表 (表格视图: 标题, 用户, 状态, 创建时间)
    - 查看转录文本 & 摘要
    - 操作: 删除记录
- **现有接口 (参考 `my-app/app/api/ai-shorthand/route.ts`)**:
    - 目前 API 是基于 Next.js App Router 的 REST API (`GET /api/ai-shorthand`)，且仅限查询当前登录用户。
    - **需求**: 需要新增 `admin` tRPC 路由或 Admin 专用 REST API 来获取所有用户的记录。

### 4.5 系统设置
- **路由**: `/settings`
- **功能**:
    - WordPress 集成状态监控
    - 功能开关 (Feature Flags)

## 5. API 集成策略

目前的 `my-app` 后端 TRPC 路由 (`appRouter`) 设计为面向终端用户 (基于 `ctx.user.id` 进行数据隔离)。
为了支持此管理后台，我们需要在 `my-app` 中进行以下改造：

1.  **新增 Admin 路由**: 在 `my-app` 中创建一个新的 `admin` 路由分支 (例如 `admin.getUsers`, `admin.getAllDocuments`)。
    *   该路由下的 procedure 应该绕过 `ctx.user.id` 的限制，允许查询所有数据。
2.  **鉴权机制**:
    *   实现管理员权限验证。可以通过检查 Clerk 用户的 `publicMetadata` 中的 `role` 字段，或者维护一个管理员 ID 白名单。
    *   创建一个 `adminProcedure` 中间件，用于验证调用者是否为管理员。
3.  **CORS 配置**:
    *   确保 `my-app` 允许来自管理后台域名 (例如 `http://localhost:5173`) 的跨域请求。

### 建议的 Admin Router 结构 (在 `my-app` 中)
```typescript
// trpc/routers/admin.ts
export const adminRouter = createTRPCRouter({
  getStats: adminProcedure.query(async ({ ctx }) => {
    // 统计逻辑
  }),
  getUsers: adminProcedure.input(z.object({
    page: z.number().default(1),
    limit: z.number().default(10),
    search: z.string().optional()
  })).query(async ({ ctx, input }) => {
    // 查询所有用户
  }),
  // ...
});

// trpc/routers/_app.ts
export const appRouter = createTRPCRouter({
  // ... 现有路由
  admin: adminRouter, // 挂载 admin 路由
});
```

## 6. 开发路线图

1.  **阶段 1: 基础搭建 (进行中)**
    *   [x] 初始化 Vite 项目
    *   [x] 配置 Tailwind CSS v4
    *   [x] 搭建基础布局 (Sidebar, Header)
    *   [x] 创建静态 Mock 页面 (Dashboard, Tickets/Users)

2.  **阶段 2: 后端接口准备 (需在 `my-app` 中执行)**
    *   [ ] 定义 `adminProcedure` (鉴权)
    *   [ ] 实现 `admin.getStats` (仪表盘数据)
    *   [ ] 实现 `admin.getUsers` (用户列表)
    *   [ ] 实现 `admin.getAllDocuments` (文档列表)
    *   [ ] 配置 CORS

3.  **阶段 3: 前端数据对接**
    *   [ ] 配置 tRPC Client (指向 `my-app` 后端地址)
    *   [ ] 将 Dashboard 页面替换为真实数据
    *   [ ] 将 User 页面替换为真实数据
    *   [ ] 实现分页和搜索功能

4.  **阶段 4: 高级功能**
    *   [ ] 文档详情查看与管理
    *   [ ] AI 速记记录管理
    *   [ ] 系统设置与功能开关

## 7. 逐步去静态化
目前项目中的页面 (`Dashboard.tsx`, `Tickets.tsx`) 使用了硬编码的静态数据 (`const tickets = [...]`)。
接下来的目标是：
1.  定义 TypeScript 类型接口 (interface) 匹配后端 DB Schema。
2.  使用 React Query (TanStack Query) 或 tRPC hooks 替换静态数组。
3.  在后端 API 未就绪时，可以使用 Mock Service Worker (MSW) 或简单的 API 模拟函数过渡，但最终目标是直连 `my-app`。
