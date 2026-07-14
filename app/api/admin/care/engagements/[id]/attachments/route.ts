import { getCurrentUser } from "@/lib/auth";
import { canAccessCareEngagement } from "@/lib/care-access";
import { deleteCareEvidenceFile, storeCareEvidenceFile } from "@/lib/care-evidence-files";
import { createCareAttachment } from "@/lib/care-management";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!(await canAccessCareEngagement(user, id))) return jsonError("Forbidden", 403);

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Invalid form data", 400);
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return jsonError("Evidence file is required", 400);

  let stored: Awaited<ReturnType<typeof storeCareEvidenceFile>> | null = null;
  try {
    stored = await storeCareEvidenceFile(file, id);
    const attachment = await createCareAttachment({
      actor: user,
      engagementId: id,
      activityId: form.get("activityId"),
      taskId: form.get("taskId"),
      category: form.get("category"),
      occurredAt: form.get("occurredAt"),
      title: form.get("title") || stored.originalFileName,
      sourceLabel: form.get("sourceLabel"),
      note: form.get("note"),
      audience: form.get("audience"),
      ...stored,
    });
    return Response.json({ ok: true, id: attachment.id }, { status: 201 });
  } catch (error) {
    if (stored) await deleteCareEvidenceFile(stored.filePath).catch(() => false);
    return jsonError(error instanceof Error ? error.message : "Upload failed", 400);
  }
}
