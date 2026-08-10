import { getCurrentUser } from "@/lib/auth";
import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX } from "@/lib/business-file-storage";
import { prisma } from "@/lib/prisma";
import { signSharedDocS3DownloadUrl } from "@/lib/shared-doc-storage";
import { canReadTeacherTrainingMaterial } from "@/lib/teacher-training-materials";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!(await canReadTeacherTrainingMaterial(user, id))) return new Response("Forbidden", { status: 403 });

  const row = await prisma.sharedDocument.findUnique({
    where: { id },
    select: { filePath: true, originalFileName: true, mimeType: true },
  });
  if (!row) return new Response("Not Found", { status: 404 });

  const fileName = path.basename(row.originalFileName || "training-material");
  const download = new URL(req.url).searchParams.get("download") === "1";
  const signedUrl = await signSharedDocS3DownloadUrl({
    filePath: row.filePath,
    contentType: row.mimeType,
    originalFileName: fileName,
    download,
  });
  if (signedUrl) return Response.redirect(signedUrl, 302);

  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.sharedDocs,
    relativePath: row.filePath,
    originalFileName: fileName,
    fallbackFileName: "training-material",
    contentType: row.mimeType,
  });
}
