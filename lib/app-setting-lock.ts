import { prisma } from "@/lib/prisma";

type AppSettingRow = {
  key: string;
  value: string;
  updatedAt: Date;
};

type AppSettingDb = {
  appSetting: {
    findUnique(args: unknown): Promise<AppSettingRow | null>;
    create(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

export class AppSettingConflictError extends Error {
  constructor(message = "Data changed by another request. Please retry.") {
    super(message);
    this.name = "AppSettingConflictError";
  }
}

export async function loadJsonAppSettingForDb<T>(
  db: AppSettingDb,
  key: string,
  fallback: T,
  sanitize: (input: unknown) => T,
): Promise<{ store: T; updatedAt: Date | null }> {
  const row = await db.appSetting.findUnique({
    where: { key },
    select: { key: true, value: true, updatedAt: true },
  });
  if (!row?.value) return { store: fallback, updatedAt: row?.updatedAt ?? null };
  try {
    return { store: sanitize(JSON.parse(row.value)), updatedAt: row.updatedAt };
  } catch {
    return { store: fallback, updatedAt: row.updatedAt };
  }
}

export async function saveJsonAppSettingForDb<T>(
  db: AppSettingDb,
  key: string,
  store: T,
  expectedUpdatedAt: Date | null,
): Promise<Date> {
  const value = JSON.stringify(store);

  if (!expectedUpdatedAt) {
    try {
      await db.appSetting.create({ data: { key, value } });
    } catch {
      throw new AppSettingConflictError();
    }
    const created = await db.appSetting.findUnique({
      where: { key },
      select: { key: true, value: true, updatedAt: true },
    });
    if (!created) throw new AppSettingConflictError();
    return created.updatedAt;
  }

  const result = await db.appSetting.updateMany({
    where: { key, updatedAt: expectedUpdatedAt },
    data: { value },
  });
  if (result.count !== 1) throw new AppSettingConflictError();

  const updated = await db.appSetting.findUnique({
    where: { key },
    select: { key: true, value: true, updatedAt: true },
  });
  if (!updated) throw new AppSettingConflictError();
  return updated.updatedAt;
}

export async function mutateJsonAppSettingForDb<T>(
  db: AppSettingDb,
  options: {
    key: string;
    fallback: T;
    sanitize: (input: unknown) => T;
    mutate: (store: T) => Promise<void> | void;
    maxRetries?: number;
  },
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const { store, updatedAt } = await loadJsonAppSettingForDb(db, options.key, options.fallback, options.sanitize);
    await options.mutate(store);
    try {
      await saveJsonAppSettingForDb(db, options.key, store, updatedAt);
      return store;
    } catch (error) {
      if (!(error instanceof AppSettingConflictError) || attempt === maxRetries) throw error;
    }
  }

  throw new AppSettingConflictError();
}

export async function mutateJsonAppSetting<T>(options: {
  key: string;
  fallback: T;
  sanitize: (input: unknown) => T;
  mutate: (store: T) => Promise<void> | void;
  maxRetries?: number;
}) {
  return mutateJsonAppSettingForDb(prisma as unknown as AppSettingDb, options);
}
