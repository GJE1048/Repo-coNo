import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "@/db";
import { aiShorthandRecords, blocks, documents, users, workspaces } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { addAdminLog, clearAdminLogs, listAdminLogs } from "@/lib/admin-log";

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
const getDocumentDetailInput = z.object({
  id: z.string().min(1),
});

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

const getAIShorthandRecordsInput = z
  .object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
  })
  .optional();

const getAIShorthandDetailInput = z.object({
  id: z.string().min(1),
});

const deleteAIShorthandRecordInput = z.object({
  id: z.string().min(1),
});

const getAdminLogsInput = z
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

const getActor = (ctx: { adminUser?: string | null }) => ctx.adminUser ?? "admin";

export const adminRouter = createTRPCRouter({
  getUsers: adminProcedure.input(getUsersInput).query(async ({ input, ctx }) => {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const search = input?.search?.trim();

    const { data, totalCount } = await (await clerkClient()).users.getUserList({
      limit,
      offset: (page - 1) * limit,
      ...(search ? { query: search } : {}),
    });

    await addAdminLog({
      actor: getActor(ctx),
      action: "user.list",
      targetType: "user",
      detail: `page=${page} limit=${limit}${search ? ` search=${search}` : ""}`,
      metadata: { page, limit, search },
    });

    return {
      data: data.map(toUserResponse),
      total: totalCount,
    };
  }),
  createUser: adminProcedure.input(createUserInput).mutation(async ({ input, ctx }) => {
    const password = input.password?.trim();
    const user = await (await clerkClient()).users.createUser({
      emailAddress: [input.email],
      username: normalizeOptionalString(input.username),
      password: password || undefined,
      firstName: normalizeOptionalString(input.firstName),
      lastName: normalizeOptionalString(input.lastName),
      skipPasswordRequirement: !password,
    });

    await addAdminLog({
      actor: getActor(ctx),
      action: "user.create",
      targetType: "user",
      targetId: user.id,
      detail: `email=${input.email}`,
    });
    return toUserResponse(user);
  }),
  updateUser: adminProcedure.input(updateUserInput).mutation(async ({ input, ctx }) => {
    const password = input.password?.trim();
    const user = await (await clerkClient()).users.updateUser(input.userId, {
      username: normalizeOptionalString(input.username),
      firstName: normalizeOptionalString(input.firstName),
      lastName: normalizeOptionalString(input.lastName),
      password: password || undefined,
    });

    const updates = [
      input.username ? "username" : null,
      input.firstName ? "firstName" : null,
      input.lastName ? "lastName" : null,
      password ? "password" : null,
    ].filter(Boolean);
    await addAdminLog({
      actor: getActor(ctx),
      action: "user.update",
      targetType: "user",
      targetId: input.userId,
      detail: updates.length ? `fields=${updates.join(",")}` : null,
    });
    return toUserResponse(user);
  }),
  deleteUser: adminProcedure.input(deleteUserInput).mutation(async ({ input, ctx }) => {
    await (await clerkClient()).users.deleteUser(input.userId);
    await addAdminLog({
      actor: getActor(ctx),
      action: "user.delete",
      targetType: "user",
      targetId: input.userId,
    });
    return { id: input.userId };
  }),
  getDashboardData: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 6);
    fromDate.setHours(0, 0, 0, 0);

    let docStats: { totalDocuments: number | null; activeDocuments: number | null } | undefined;
    let workspaceStats: { workspaceCount: number | null } | undefined;
    let chartRows: { day: string; total: number }[] = [];

    try {
      [docStats] = await db
        .select({
          totalDocuments: sql<number>`count(*)`,
          activeDocuments: sql<number>`sum(case when ${documents.isArchived} = false then 1 else 0 end)`,
        })
        .from(documents);
    } catch (error) {
      console.error("Dashboard stats query failed:", error);
    }

    try {
      [workspaceStats] = await db
        .select({
          workspaceCount: sql<number>`count(*)`,
        })
        .from(workspaces);
    } catch (error) {
      console.error("Dashboard workspace query failed:", error);
    }

    const clerkSummary = await (await clerkClient()).users.getUserList({
      limit: 1,
      offset: 0,
    });

    try {
      chartRows = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${documents.createdAt}), 'YYYY-MM-DD')`,
          total: sql<number>`count(*)`,
        })
        .from(documents)
        .where(sql`${documents.createdAt} >= ${fromDate}`)
        .groupBy(sql`date_trunc('day', ${documents.createdAt})`)
        .orderBy(sql`date_trunc('day', ${documents.createdAt})`);
    } catch (error) {
      console.error("Dashboard chart query failed:", error);
    }

    const chartMap = new Map(chartRows.map((row) => [row.day, Number(row.total)]));
    const chartData = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(fromDate);
      date.setDate(fromDate.getDate() + index);
      const label = date.toISOString().slice(5, 10);
      const key = date.toISOString().slice(0, 10);
      return {
        name: label,
        total: chartMap.get(key) ?? 0,
      };
    });

    await addAdminLog({
      actor: getActor(ctx),
      action: "dashboard.view",
      targetType: "dashboard",
    });

    return {
      stats: {
        totalUsers: clerkSummary.totalCount,
        totalDocuments: Number(docStats?.totalDocuments ?? 0),
        activeDocuments: Number(docStats?.activeDocuments ?? 0),
        workspaceCount: Number(workspaceStats?.workspaceCount ?? 0),
      },
      chartData,
    };
  }),
  getDocuments: adminProcedure.input(getDocumentsInput).query(async ({ input, ctx }) => {
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

    await addAdminLog({
      actor: getActor(ctx),
      action: "document.list",
      targetType: "document",
      detail: `page=${page} limit=${limit}${search ? ` search=${search}` : ""}`,
      metadata: { page, limit, search },
    });

    return {
      data,
      total: Number(count?.total ?? 0),
    };
  }),
  getDocumentDetail: adminProcedure.input(getDocumentDetailInput).query(async ({ input, ctx }) => {
    const [document] = await db
      .select({
        id: documents.id,
        title: documents.title,
        workspaceId: documents.workspaceId,
        ownerId: documents.ownerId,
        isArchived: documents.isArchived,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        workspace: {
          id: workspaces.id,
          name: workspaces.name,
        },
      })
      .from(documents)
      .leftJoin(workspaces, eq(documents.workspaceId, workspaces.id))
      .where(eq(documents.id, input.id));

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
    }

    const documentBlocks = await db
      .select({
        id: blocks.id,
        type: blocks.type,
        content: blocks.content,
        position: blocks.position,
        createdAt: blocks.createdAt,
        updatedAt: blocks.updatedAt,
      })
      .from(blocks)
      .where(eq(blocks.documentId, input.id))
      .orderBy(asc(blocks.position));

    await addAdminLog({
      actor: getActor(ctx),
      action: "document.view",
      targetType: "document",
      targetId: input.id,
    });

    return {
      document,
      blocks: documentBlocks,
    };
  }),
  updateDocument: adminProcedure.input(updateDocumentInput).mutation(async ({ input, ctx }) => {
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

    let action = "document.update";
    if (typeof input.isArchived === "boolean") {
      action = input.isArchived ? "document.archive" : "document.unarchive";
    } else if (input.title) {
      action = "document.rename";
    }
    const detail =
      typeof input.isArchived === "boolean"
        ? `isArchived=${input.isArchived}`
        : input.title
          ? `title=${input.title}`
          : null;
    await addAdminLog({
      actor: getActor(ctx),
      action,
      targetType: "document",
      targetId: input.id,
      detail,
    });
    return updated;
  }),
  deleteDocument: adminProcedure.input(deleteDocumentInput).mutation(async ({ input, ctx }) => {
    const [deleted] = await db
      .delete(documents)
      .where(eq(documents.id, input.id))
      .returning({ id: documents.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
    }

    await addAdminLog({
      actor: getActor(ctx),
      action: "document.delete",
      targetType: "document",
      targetId: input.id,
    });
    return deleted;
  }),
  getAIShorthandRecords: adminProcedure
    .input(getAIShorthandRecordsInput)
    .query(async ({ input, ctx }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const search = input?.search?.trim();
      const normalizedSearch = search?.toLowerCase();
      const searchFilter = normalizedSearch
        ? sql`(
            lower(${aiShorthandRecords.title}) like ${`%${normalizedSearch}%`}
            or lower(${users.username}) like ${`%${normalizedSearch}%`}
            or lower(${users.clerkId}) like ${`%${normalizedSearch}%`}
          )`
        : undefined;

      let count: { total: number } | undefined;
      let data: {
        id: string;
        title: string;
        userId: string;
        status: string;
        date: Date;
        duration: number;
        createdAt: Date;
        updatedAt: Date;
        user: { id: string | null; username: string | null; clerkId: string | null } | null;
      }[] = [];

      try {
        let countQuery = db
          .select({
            total: sql<number>`count(*)`,
          })
          .from(aiShorthandRecords)
          .leftJoin(users, eq(aiShorthandRecords.userId, users.id));
        if (searchFilter) {
          countQuery = countQuery.where(searchFilter);
        }
        [count] = await countQuery;

        let recordsQuery = db
          .select({
            id: aiShorthandRecords.id,
            title: aiShorthandRecords.title,
            userId: aiShorthandRecords.userId,
            status: aiShorthandRecords.status,
            date: aiShorthandRecords.date,
            duration: aiShorthandRecords.duration,
            createdAt: aiShorthandRecords.createdAt,
            updatedAt: aiShorthandRecords.updatedAt,
            user: {
              id: users.id,
              username: users.username,
              clerkId: users.clerkId,
            },
          })
          .from(aiShorthandRecords)
          .leftJoin(users, eq(aiShorthandRecords.userId, users.id));
        if (searchFilter) {
          recordsQuery = recordsQuery.where(searchFilter);
        }
        data = await recordsQuery
          .orderBy(desc(aiShorthandRecords.createdAt))
          .limit(limit)
          .offset((page - 1) * limit);
      } catch (error) {
        console.error("AI shorthand list query failed:", error);
      }

      await addAdminLog({
        actor: getActor(ctx),
        action: "ai_shorthand.list",
        targetType: "ai_shorthand",
        detail: `page=${page} limit=${limit}${search ? ` search=${search}` : ""}`,
        metadata: { page, limit, search },
      });

      return {
        data,
        total: Number(count?.total ?? 0),
      };
    }),
  getAIShorthandDetail: adminProcedure
    .input(getAIShorthandDetailInput)
    .query(async ({ input, ctx }) => {
      const [record] = await db
        .select({
          id: aiShorthandRecords.id,
          title: aiShorthandRecords.title,
          userId: aiShorthandRecords.userId,
          status: aiShorthandRecords.status,
          date: aiShorthandRecords.date,
          duration: aiShorthandRecords.duration,
          audioUrl: aiShorthandRecords.audioUrl,
          transcript: aiShorthandRecords.transcript,
          summary: aiShorthandRecords.summary,
          notes: aiShorthandRecords.notes,
          createdAt: aiShorthandRecords.createdAt,
          updatedAt: aiShorthandRecords.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            clerkId: users.clerkId,
          },
        })
        .from(aiShorthandRecords)
        .leftJoin(users, eq(aiShorthandRecords.userId, users.id))
        .where(eq(aiShorthandRecords.id, input.id));

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI Shorthand record not found" });
      }

      await addAdminLog({
        actor: getActor(ctx),
        action: "ai_shorthand.view",
        targetType: "ai_shorthand",
        targetId: input.id,
      });

      return record;
    }),
  deleteAIShorthandRecord: adminProcedure
    .input(deleteAIShorthandRecordInput)
    .mutation(async ({ input, ctx }) => {
      const [deleted] = await db
        .delete(aiShorthandRecords)
        .where(eq(aiShorthandRecords.id, input.id))
        .returning({ id: aiShorthandRecords.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI Shorthand record not found" });
      }

      await addAdminLog({
        actor: getActor(ctx),
        action: "ai_shorthand.delete",
        targetType: "ai_shorthand",
        targetId: input.id,
      });

      return deleted;
    }),
  logAdminLogin: adminProcedure.mutation(async ({ ctx }) => {
    await addAdminLog({
      actor: getActor(ctx),
      action: "admin.login",
      targetType: "admin",
    });
    return { ok: true };
  }),
  logAdminLogout: adminProcedure.mutation(async ({ ctx }) => {
    await addAdminLog({
      actor: getActor(ctx),
      action: "admin.logout",
      targetType: "admin",
    });
    return { ok: true };
  }),
  getAdminLogs: adminProcedure.input(getAdminLogsInput).query(async ({ input }) => {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const search = input?.search?.trim();
    const { data, total } = await listAdminLogs({
      offset: (page - 1) * limit,
      limit,
      search,
    });
    return { data, total };
  }),
  clearAdminLogs: adminProcedure.mutation(async ({ ctx }) => {
    await clearAdminLogs();
    await addAdminLog({
      actor: getActor(ctx),
      action: "log.clear",
      targetType: "log",
    });
    return { ok: true };
  }),
});
