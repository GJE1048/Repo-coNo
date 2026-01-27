import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "@/db";
import { documents, workspaces } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const getUsersInput = z
  .object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
  })
  .optional();

const getDocumentsInput = z
  .object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
  })
  .optional();

const createUserInput = z.object({
  email: z.string().email(),
  username: z.string().trim().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

const updateUserInput = z.object({
  userId: z.string().min(1),
  username: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  password: z.string().min(8).optional(),
});

const deleteUserInput = z.object({
  userId: z.string().min(1),
});

const updateDocumentInput = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).optional(),
  isArchived: z.boolean().optional(),
});

const deleteDocumentInput = z.object({
  id: z.string().min(1),
});

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

const normalizeOptionalString = (value?: string) => {
  const next = value?.trim();
  return next ? next : undefined;
};

const toUserResponse = (user: {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
  imageUrl: string;
  createdAt: number | Date;
}) => ({
  id: user.id,
  username: resolveUsername(user),
  clerkId: user.id,
  imageUrl: user.imageUrl,
  createdAt: new Date(user.createdAt).toISOString(),
});

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
      data: data.map(toUserResponse),
      total: totalCount,
    };
  }),
  createUser: adminProcedure.input(createUserInput).mutation(async ({ input }) => {
    const password = input.password?.trim();
    const user = await (await clerkClient()).users.createUser({
      emailAddress: [input.email],
      username: normalizeOptionalString(input.username),
      password: password || undefined,
      firstName: normalizeOptionalString(input.firstName),
      lastName: normalizeOptionalString(input.lastName),
      skipPasswordRequirement: !password,
    });

    return toUserResponse(user);
  }),
  updateUser: adminProcedure.input(updateUserInput).mutation(async ({ input }) => {
    const password = input.password?.trim();
    const user = await (await clerkClient()).users.updateUser(input.userId, {
      username: normalizeOptionalString(input.username),
      firstName: normalizeOptionalString(input.firstName),
      lastName: normalizeOptionalString(input.lastName),
      password: password || undefined,
    });

    return toUserResponse(user);
  }),
  deleteUser: adminProcedure.input(deleteUserInput).mutation(async ({ input }) => {
    await (await clerkClient()).users.deleteUser(input.userId);
    return { id: input.userId };
  }),
  getDocuments: adminProcedure.input(getDocumentsInput).query(async ({ input }) => {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const search = input?.search?.trim();
    const titleFilter = search
      ? sql`lower(${documents.title}) like ${`%${search.toLowerCase()}%`}`
      : undefined;

    let countQuery = db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(documents);
    if (titleFilter) {
      countQuery = countQuery.where(titleFilter);
    }
    const [count] = await countQuery;

    let documentsQuery = db
      .select({
        id: documents.id,
        title: documents.title,
        workspaceId: documents.workspaceId,
        isArchived: documents.isArchived,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        workspace: {
          id: workspaces.id,
          name: workspaces.name,
        },
      })
      .from(documents)
      .leftJoin(workspaces, eq(documents.workspaceId, workspaces.id));
    if (titleFilter) {
      documentsQuery = documentsQuery.where(titleFilter);
    }
    const data = await documentsQuery
      .orderBy(desc(documents.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data,
      total: Number(count?.total ?? 0),
    };
  }),
  updateDocument: adminProcedure.input(updateDocumentInput).mutation(async ({ input }) => {
    const updates: { title?: string; isArchived?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (input.title) updates.title = input.title;
    if (typeof input.isArchived === "boolean") updates.isArchived = input.isArchived;

    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, input.id))
      .returning({ id: documents.id });

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
    }

    return updated;
  }),
  deleteDocument: adminProcedure.input(deleteDocumentInput).mutation(async ({ input }) => {
    const [deleted] = await db
      .delete(documents)
      .where(eq(documents.id, input.id))
      .returning({ id: documents.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
    }

    return deleted;
  }),
});
