import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL;
const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;
const datasourceUrl =
  databaseUrl?.startsWith("prisma://") && directDatabaseUrl
    ? directDatabaseUrl
    : databaseUrl;

// Prevent creating many clients in dev (Next hot reload)
export const prisma =
  global.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
