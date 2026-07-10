import { prisma } from "@/lib/prisma";
import { bad, bearerToken, ok } from "../../_lib";

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return bad("Unauthorized", 401);
  await prisma.parentPortalSession.deleteMany({ where: { token } });
  return ok({});
}
