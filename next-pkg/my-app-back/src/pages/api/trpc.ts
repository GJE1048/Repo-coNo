import { initTRPC } from '@trpc/server';
import { createContext } from './context'; // Adjust the import based on your context setup
import { appRouter } from '../../../my-app/trpc/routers/_app'; // Adjust the path as necessary

const t = initTRPC.create();

export const trpc = t.create({
  router: appRouter,
  createContext,
});

// Export the API handler
export default trpc.createNextApiHandler();