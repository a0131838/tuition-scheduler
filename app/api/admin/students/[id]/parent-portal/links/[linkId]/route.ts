import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function boolOrUndefined(v: unknown) {
  return typeof v === "boolean" ? v : undefined;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  await requireAdmin();
  const { id: studentId, linkId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const link = await prisma.parentStudentLink.findUnique({
    where: { id: linkId },
    select: { id: true, studentId: true },
  });
  if (!link || link.studentId !== studentId) return bad("Parent link not found", 404);

  const data = {
    relationship: typeof (body as any).relationship === "string" ? (body as any).relationship.trim().slice(0, 40) || null : undefined,
    isPrimary: boolOrUndefined((body as any).isPrimary),
    canViewSchedule: boolOrUndefined((body as any).canViewSchedule),
    canViewFeedback: boolOrUndefined((body as any).canViewFeedback),
    canViewFinance: boolOrUndefined((body as any).canViewFinance),
    canViewReports: boolOrUndefined((body as any).canViewReports),
    canCreateRequests: boolOrUndefined((body as any).canCreateRequests),
  };

  const updated = await prisma.parentStudentLink.update({
    where: { id: linkId },
    data,
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          phoneCountry: true,
          wechatOpenId: true,
          status: true,
        },
      },
    },
  });

  return Response.json({ ok: true, link: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  await requireAdmin();
  const { id: studentId, linkId } = await params;

  const link = await prisma.parentStudentLink.findUnique({
    where: { id: linkId },
    select: { id: true, studentId: true },
  });
  if (!link || link.studentId !== studentId) return bad("Parent link not found", 404);

  await prisma.parentStudentLink.delete({ where: { id: linkId } });
  return Response.json({ ok: true });
}
