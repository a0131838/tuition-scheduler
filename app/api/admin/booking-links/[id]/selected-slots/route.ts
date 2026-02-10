import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: linkId } = await params;
  if (!linkId) return bad("Missing link id");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const teacherId = String(body?.teacherId ?? "");
  const startAtRaw = String(body?.startAt ?? "");
  const endAtRaw = String(body?.endAt ?? "");
  const checked = !!body?.checked;
  if (!teacherId || !startAtRaw || !endAtRaw) return bad("Invalid slot payload");

  const startAt = new Date(startAtRaw);
  const endAt = new Date(endAtRaw);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return bad("Invalid slot time");
  }

  const teacherInLink = await prisma.studentBookingLinkTeacher.findFirst({
    where: { linkId, teacherId },
    select: { id: true },
  });
  if (!teacherInLink) return bad("Teacher not in link", 409);

  if (checked) {
    await prisma.studentBookingLinkSelectedSlot.upsert({
      where: { linkId_teacherId_startAt_endAt: { linkId, teacherId, startAt, endAt } },
      update: {},
      create: { linkId, teacherId, startAt, endAt },
    });
  } else {
    await prisma.studentBookingLinkSelectedSlot.deleteMany({
      where: { linkId, teacherId, startAt, endAt },
    });
  }

  return Response.json({ ok: true, checked });
}

