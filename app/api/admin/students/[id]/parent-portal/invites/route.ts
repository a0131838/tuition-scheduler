import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createParentBindInvite } from "@/lib/parent-portal";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function inviteDto(invite: {
  id: string;
  token: string;
  studentId: string;
  createdBy: string | null;
  expiresAt: Date | null;
  usedAt: Date | null;
  usedById: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: invite.id,
    token: invite.token,
    studentId: invite.studentId,
    createdBy: invite.createdBy,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    usedAt: invite.usedAt ? invite.usedAt.toISOString() : null,
    usedById: invite.usedById,
    isActive: invite.isActive,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
    miniappPath: `/pages/bind/index?token=${encodeURIComponent(invite.token)}`,
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) return bad("Student not found", 404);

  const invites = await prisma.parentBindInvite.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({ ok: true, invites: invites.map(inviteDto) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id: studentId } = await params;
  const body = await req.json().catch(() => ({}));
  const deactivateOld = body?.deactivateOld !== false;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) return bad("Student not found", 404);

  if (deactivateOld) {
    await prisma.parentBindInvite.updateMany({
      where: { studentId, isActive: true, usedAt: null },
      data: { isActive: false },
    });
  }

  const invite = await createParentBindInvite({
    studentId,
    createdBy: admin.email,
    expiresAt: null,
  });

  return Response.json({ ok: true, invite: inviteDto(invite) });
}
