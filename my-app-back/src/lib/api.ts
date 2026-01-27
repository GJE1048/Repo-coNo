import type { User, Document, AIShorthandRecord, DashboardStats } from '../types';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client'; // 👈 只需要 httpBatchLink
import { QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';
import { getAdminAuthHeaders } from './auth';
import type { AppRouter } from '../../../my-app/trpc/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const trpcClient = trpc.createClient({
  // ✅ 全局 transformer 可保留（但非必需）
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      // 👇 关键：显式指定 transformer
      transformer: superjson, // ←←← 添加这一行！
      fetch(url, options) {
        const headers = new Headers(options?.headers);
        const adminHeaders = getAdminAuthHeaders();
        Object.entries(adminHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });
        return fetch(url, {
          ...options,
          credentials: 'include',
          headers,
        } as RequestInit); // 👈 建议加上 as RequestInit 避免 body 类型问题
      },
    }),
  ],
});
// export const trpcClient = trpc.createClient({
//   // transformer: superjson,
//   links: [
//         // ✅ 关键：用 splitLink 区分 batch 和 single
//         splitLink({
//           condition(op) {
//             // 只有当有多个操作时才 batch
//             return op.context.batch !== false && op.queries.length > 1;
//           },
//           true: httpBatchLink({
//             url: '/api/trpc',
//             transformer: superjson,
//             fetch(url, options) {
//               return fetch(url, {
//                 ...options,
//                 credentials: 'include',
//               });
//             },
//           }),
//           false: httpLink({
//             url: '/api/trpc',
//             transformer: superjson,
//             fetch(url, options) {
//               return fetch(url, {
//                 ...options,
//                 credentials: 'include',
//               });
//             },
//           }),
//         }),
//       ],
// });


// Mock Data
const MOCK_USERS: User[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `user-${i + 1}`,
  username: `user${i + 1}`,
  clerkId: `clerk_user_${i + 1}`,
  imageUrl: `https://ui-avatars.com/api/?name=User+${i + 1}`,
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
}));

const MOCK_DOCUMENTS: Document[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `doc-${i + 1}`,
  title: `Document ${i + 1}`,
  ownerId: `user-${Math.floor(Math.random() * 20) + 1}`,
  workspaceId: `ws-${Math.floor(Math.random() * 5) + 1}`,
  isArchived: Math.random() > 0.8,
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  updatedAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
}));

const MOCK_AI_RECORDS: AIShorthandRecord[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `ai-${i + 1}`,
  userId: `user-${Math.floor(Math.random() * 20) + 1}`,
  title: `Meeting Note ${i + 1}`,
  date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  duration: Math.floor(Math.random() * 3600),
  status: Math.random() > 0.2 ? 'completed' : 'processing',
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  updatedAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
}));

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    await delay(500);
    return {
      totalUsers: MOCK_USERS.length,
      totalDocuments: MOCK_DOCUMENTS.length,
      activeDocuments: MOCK_DOCUMENTS.filter(d => !d.isArchived).length,
      workspaceCount: 12,
    };
  },

  getUsers: async (page = 1, limit = 10, search = ''): Promise<{ data: User[]; total: number }> => {
    await delay(600);
    let filtered = MOCK_USERS;
    if (search) {
      filtered = filtered.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
    }
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
    };
  },

  getDocuments: async (page = 1, limit = 10, search = ''): Promise<{ data: Document[]; total: number }> => {
    await delay(700);
    let filtered = MOCK_DOCUMENTS;
    if (search) {
      filtered = filtered.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
    }
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
    };
  },

  getAIShorthandRecords: async (page = 1, limit = 10): Promise<{ data: AIShorthandRecord[]; total: number }> => {
    await delay(600);
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      data: MOCK_AI_RECORDS.slice(start, end),
      total: MOCK_AI_RECORDS.length,
    };
  },
};
