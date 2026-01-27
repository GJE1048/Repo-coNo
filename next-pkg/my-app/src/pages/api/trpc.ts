import { createTRPCRouter } from '@trpc/server';
import { appRouter } from '../../../my-app/trpc/routers/_app';

export const trpcRouter = createTRPCRouter()
  .merge('app.', appRouter);

export type AppRouter = typeof trpcRouter;