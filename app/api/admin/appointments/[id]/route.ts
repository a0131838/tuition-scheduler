import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: appointmentId } = await params;
  if (!appointmentId) return bad("Missing appointmentId");

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) return bad("Appointment not found", 404);

  const sessionMatch = await prisma.session.findFirst({
    where: {
      startAt: appt.startAt,
      endAt: appt.endAt,
      OR: [{ teacherId: appt.teacherId }, { teacherId: null, class: { teacherId: appt.teacherId } }],
    },
    select: { id: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id: appt.id } });
      if (sessionMatch) {
        await tx.session.delete({ where: { id: sessionMatch.id } });
      }
    });
  } catch (e: any) {
    return bad(String(e?.message ?? "Delete failed"), 500);
  }

  return Response.json({ ok: true, deletedSession: Boolean(sessionMatch) });
}

