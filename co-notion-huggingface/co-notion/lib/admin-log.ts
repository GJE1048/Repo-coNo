import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs } from "@/db/schema";

export type AdminLogEntry = {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

export const addAdminLog = async (
  entry: Omit<AdminLogEntry, "id" | "createdAt"> & { createdAt?: Date },
) => {
  try {
    const [log] = await db
      .insert(adminLogs)
      .values({
        actor: entry.actor,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        detail: entry.detail ?? null,
        metadata: entry.metadata ?? {},
        createdAt: entry.createdAt ?? new Date(),
      })
      .returning();

    return log;
  } catch (error) {
    console.error("Failed to write admin log:", error);
    return null;
  }
};

export const listAdminLogs = async (params?: {
  offset?: number;
  limit?: number;
  search?: string;
}) => {
  try {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 50;
    const search = params?.search?.trim().toLowerCase();
    const filter = search
      ? sql`(
          lower(${adminLogs.actor}) like ${`%${search}%`}
          or lower(${adminLogs.action}) like ${`%${search}%`}
          or lower(${adminLogs.targetType}) like ${`%${search}%`}
          or lower(coalesce(${adminLogs.targetId}, '')) like ${`%${search}%`}
          or lower(coalesce(${adminLogs.detail}, '')) like ${`%${search}%`}
        )`
      : undefined;

    let countQuery = db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(adminLogs);
    if (filter) {
      countQuery = countQuery.where(filter);
    }
    const [count] = await countQuery;

    let logsQuery = db
      .select({
        id: adminLogs.id,
        actor: adminLogs.actor,
        action: adminLogs.action,
        targetType: adminLogs.targetType,
        targetId: adminLogs.targetId,
        detail: adminLogs.detail,
        metadata: adminLogs.metadata,
        createdAt: adminLogs.createdAt,
      })
      .from(adminLogs);
    if (filter) {
      logsQuery = logsQuery.where(filter);
    }
    const data = await logsQuery
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      total: Number(count?.total ?? 0),
      data,
    };
  } catch (error) {
    console.error("Failed to fetch admin logs:", error);
    return { total: 0, data: [] };
  }
};

export const clearAdminLogs = async () => {
  try {
    await db.delete(adminLogs);
  } catch (error) {
    console.error("Failed to clear admin logs:", error);
  }
};
