import { createTRPCRouter } from '@trpc/server';
import { userRouter } from './user';
import { documentRouter } from './document';
import { aiShorthandRouter } from './aiShorthand';

export const appRouter = createTRPCRouter({
  users: userRouter,
  documents: documentRouter,
  aiShorthand: aiShorthandRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;