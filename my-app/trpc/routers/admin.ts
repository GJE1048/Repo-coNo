import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";

const getUsersInput = z
  .object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
  })
  .optional();

const resolveUsername = (user: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
  id: string;
}) => {
  if (user.username) return user.username;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  const primaryEmail =
    user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (primaryEmail) return primaryEmail;
  return user.id;
};

export const adminRouter = createTRPCRouter({
  getUsers: adminProcedure.input(getUsersInput).query(async ({ input }) => {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const search = input?.search?.trim();

    const { data, totalCount } = await (await clerkClient()).users.getUserList({
      limit,
      offset: (page - 1) * limit,
      ...(search ? { query: search } : {}),
    });

    return {
      data: data.map((user) => ({
        id: user.id,
        username: resolveUsername(user),
        clerkId: user.id,
        imageUrl: user.imageUrl,
        createdAt: new Date(user.createdAt).toISOString(),
      })),
      total: totalCount,
    };
  }),
});
