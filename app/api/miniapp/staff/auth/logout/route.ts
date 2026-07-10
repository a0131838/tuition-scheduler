import { prisma } from "@/lib/prisma";
import { bearerToken, ok } from "@/app/api/miniapp/_lib";

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (token) await prisma.staffMiniappSession.deleteMany({ where: { token } });
  return ok({ loggedOut: true });
}
