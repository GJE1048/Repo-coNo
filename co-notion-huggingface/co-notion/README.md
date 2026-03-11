---
title: co-notion
emoji: 📝
colorFrom: indigo
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# CO-NOTION

CO-NOTION 是一个面向团队的协作文档平台，提供基于 Block 的编辑体验、实时协作、工作区管理与 AI 辅助能力。

## 特性
- Block 结构的文档编辑与组织
- Yjs CRDT 实时协作与光标/在线状态
- Clerk 登录与用户同步
- tRPC + Drizzle + PostgreSQL 数据层
- WebSocket 实时通知与协作刷新
- S3 文件上传与资源托管（可选）
- Upstash Redis 缓存与限流（可选）
- AI 聊天/摘要与语音速记（可选）
- WordPress OAuth 集成（可选）

## 技术栈
Next.js 16 (App Router), React 19, TypeScript, tRPC, Drizzle ORM, PostgreSQL, Clerk,
Yjs, ws, Tailwind CSS, Upstash Redis, AWS S3。

## 快速开始
1) 安装依赖
```bash
pnpm install
```

2) 配置环境变量  
创建 `.env.local`（示例占位符，按需填写）：
```bash
# 必填：数据库
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# 必填：Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_SIGNING_SECRET="whsec_..."

# 推荐：应用基础配置
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 可选：协作与实时服务
NEXT_PUBLIC_REALTIME_SERVER_WS_URL="ws://localhost:4000"
REALTIME_SERVER_HTTP_URL="http://localhost:4000/events/document-operations"
REALTIME_SERVER_PORT=4000

NEXT_PUBLIC_YJS_SERVER_WS_URL="ws://localhost:1234"
PORT=1234

# 可选：安全
ENCRYPTION_KEY="32_chars_length_key__________"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change_me"

# 可选：缓存/限流
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# 可选：文件上传
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET_NAME="your-bucket"

# 可选：AI
SILICONFLOW_API_KEY="sk_..."
SILICONFLOW_BASE_URL="https://api.siliconflow.cn"
SILICONFLOW_MODEL="Qwen/Qwen3-8B"
FUNASR_STT_BASE_URL="http://localhost:5001"

# 可选：WordPress
WORDPRESS_CLIENT_ID="..."
WORDPRESS_CLIENT_SECRET="..."
```

3) 数据库迁移
```bash
pnpm db:migrate
```

4) 启动开发环境
```bash
pnpm dev
```

如需完整实时协作体验，另开终端启动：
```bash
pnpm dev:ws
pnpm dev:yjs
```

默认端口：
- Next.js: `3000`
- 实时通知服务: `4000`
- Yjs 协作服务: `1234`

## 常用脚本
- `pnpm dev` 启动前端开发服务器
- `pnpm build` / `pnpm start` 构建与生产启动（`pnpm start:next` 可用原生 Next.js 服务器）
- `pnpm lint` 代码检查
- `pnpm db:migrate` 运行迁移
- `pnpm db:generate` 生成迁移文件
- `pnpm db:push` 推送 schema 到数据库
- `pnpm dev:ws` 启动实时通知 WebSocket
- `pnpm dev:yjs` 启动 Yjs 协作服务

## 目录结构
- `app/` Next.js App Router 入口与 API 路由
- `modules/` 业务模块（文档、工作区、用户等）
- `db/` 数据库 schema 与访问封装
- `drizzle/` 迁移文件
- `realtime/` 实时通知调用
- `scripts/` 数据库与服务脚本
- `public/` 静态资源

## Hugging Face Spaces 部署（Docker）
本项目包含 WebSocket 与 Yjs 协作服务，建议使用 **Docker Space** 将所有服务合并到同一端口。

### 1) Space 配置
README 顶部已添加 Space 元信息（`sdk: docker` 与 `app_port: 7860`），Hugging Face 将按该端口对外提供服务。

### 2) 环境变量（Space Secrets）
至少配置以下项（其余按需要添加）：
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`（例如：`https://<your-space>.hf.space`）
- `NEXT_PUBLIC_REALTIME_SERVER_WS_URL`（例如：`wss://<your-space>.hf.space/ws`）
- `REALTIME_SERVER_HTTP_URL`（例如：`https://<your-space>.hf.space/events/document-operations`）
- `NEXT_PUBLIC_YJS_SERVER_WS_URL`（例如：`wss://<your-space>.hf.space/yjs`）

### 3) 构建与启动
Dockerfile 已配置 `pnpm build` 后由 `server.mjs` 统一承载：
- Next.js HTTP 服务
- `/ws` 实时通知 WebSocket
- `/yjs/<documentId>` Yjs 协作 WebSocket

## 文档
详细设计与使用说明见 `app/docs/`，建议从以下入口开始：
- `app/docs/architecture.md`
- `app/docs/development/setup.md`
- `app/docs/user-manual/getting-started.md`

---

## 简历可用描述（前端方向）

### 项目概述（一段话）
面向团队的协作文档平台，提供 Block 编辑、工作区管理、实时协作、AI 辅助与内容发布能力；前端基于 Next.js App Router 构建，配合 tRPC 与 WebSocket 实现高响应的协作体验。

### 主要职责与产出
- 负责核心文档编辑体验与协作交互的前端实现（Block 编辑、光标/在线状态、协作者提示等）。
- 设计并落地多工作区/文档列表的交互流程与状态管理（最近文档、共享文档、模板、标签/搜索等）。
- 对接 tRPC 接口与数据库读写流程，完成文档 CRUD、权限控制与操作日志的前端联动。
- 集成实时服务（WebSocket + Yjs），处理同步、冲突合并与弱网恢复等场景。
- 推进性能与体验优化：长文档分页加载、缓存命中策略、乐观更新、加载态优化。
- 统一 UI 组件与设计规范，落地复杂编辑器/侧边栏/弹窗等高复用交互。
- 负责工程化与质量保障：TypeScript 规范、ESLint、可维护目录结构与文档化沉淀。

### 核心模块（可列在简历项目经历中）
- 文档编辑器模块：Block 树结构编辑、拖拽/插入、历史操作与版本。
- 实时协作模块：Yjs CRDT + WebSocket 同步、在线状态与协作指示。
- 文档管理模块：工作区/文件夹/标签、共享与权限管理、搜索与筛选。
- AI 助手与语音速记模块：文档摘要、问答、文本润色、语音转写。
- 内容发布/集成模块：WordPress OAuth 登录与发布工作流（可选）。

### 技术栈（简历版）
Next.js 16 (App Router), React 19, TypeScript, tRPC, Drizzle ORM, PostgreSQL, Clerk,
Yjs, WebSocket, Tailwind CSS, Upstash Redis, AWS S3。

### 关键词（可选精简版）
协作文档、CRDT、实时同步、Block 编辑器、工作区与权限、性能优化、前端工程化。
