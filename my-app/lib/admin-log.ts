import "server-only";

export type AdminLogEntry = {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
  createdAt: Date;
};

type AdminLogStore = {
  entries: AdminLogEntry[];
};

const getStore = () => {
  const globalStore = globalThis as typeof globalThis & {
    __adminLogStore?: AdminLogStore;
  };
  if (!globalStore.__adminLogStore) {
    globalStore.__adminLogStore = { entries: [] };
  }
  return globalStore.__adminLogStore;
};

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const addAdminLog = (entry: Omit<AdminLogEntry, "id" | "createdAt"> & { createdAt?: Date }) => {
  const store = getStore();
  const nextEntry: AdminLogEntry = {
    id: createId(),
    createdAt: entry.createdAt ?? new Date(),
    ...entry,
  };
  store.entries.unshift(nextEntry);
  if (store.entries.length > 500) {
    store.entries = store.entries.slice(0, 500);
  }
  return nextEntry;
};

export const listAdminLogs = (params?: {
  offset?: number;
  limit?: number;
  search?: string;
}) => {
  const store = getStore();
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 50;
  const search = params?.search?.trim().toLowerCase();
  const filtered = search
    ? store.entries.filter((entry) => {
        const haystack = [
          entry.actor,
          entry.action,
          entry.targetType,
          entry.targetId ?? "",
          entry.detail ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
    : store.entries;
  return {
    total: filtered.length,
    data: filtered.slice(offset, offset + limit),
  };
};

export const clearAdminLogs = () => {
  const store = getStore();
  store.entries = [];
};
