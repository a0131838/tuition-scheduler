import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  var prismaObserverGuardInstalled: boolean | undefined;
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

if (!global.prismaObserverGuardInstalled) {
  prisma.$use(async (params, next) => {
    const writeActions = new Set([
      "create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany", "executeRaw", "executeRawUnsafe",
    ]);
    if (!writeActions.has(params.action) || params.model === "AuthSession") return next(params);

    try {
      const requestHeaders = await headers();
      if (requestHeaders.get("x-observer-mode") === "1") {
        throw new Error("Observer account is read-only / 观察者账号不能修改系统数据");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Observer account is read-only")) throw error;
      // Scripts, workers and build-time code do not have a request header context.
    }
    return next(params);
  });
  global.prismaObserverGuardInstalled = true;
}

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
