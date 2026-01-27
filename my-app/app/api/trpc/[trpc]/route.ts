import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
// const handler = (req: Request) =>
//   fetchRequestHandler({
//     endpoint: '/api/trpc',
//     req,
//     router: appRouter,
//     createContext: createTRPCContext,
//   });
// export { handler as GET, handler as POST };
 

// ✅ 添加 CORS 头的辅助函数
const setCorsHeaders = (res: Response) => {
  res.headers.set('Access-Control-Allow-Origin', 'http://localhost:5173'); // 允许 Vite 前端
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export const OPTIONS = () => {
  // 处理预检请求（preflight）
  const response = new Response(null, { status: 204 });
  setCorsHeaders(response);
  return response;
};

const handler = async (req: Request) => {
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

  // 给所有响应加上 CORS 头
  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };