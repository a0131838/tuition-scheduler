import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCareEngagement } from "@/lib/care-access";
import { buildCareEvidenceFileResponse } from "@/lib/care-evidence-files";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const row = await prisma.careAttachment.findUnique({
    where: { id },
    select: { engagementId: true, filePath: true, originalFileName: true, mimeType: true },
  });
  if (!row) return new Response("Not Found", { status: 404 });
  if (!(await canAccessCareEngagement(user, row.engagementId))) return new Response("Forbidden", { status: 403 });

  return buildCareEvidenceFileResponse(req, {
    filePath: row.filePath,
    originalFileName: path.basename(row.originalFileName || "evidence-file"),
    mimeType: row.mimeType,
  });
}
