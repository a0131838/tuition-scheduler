import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: appointmentId } = await params;
  if (!appointmentId) return bad("Missing appointmentId");

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { student: true, teacher: true },
  });
  if (!appt) return bad("Appointment not found", 404);

  try {
    await prisma.appointment.delete({ where: { id: appointmentId } });
  } catch (e: any) {
    return bad(String(e?.message ?? "Cancel failed"), 500);
  }

  const label = `${appt.startAt.toISOString()}-${appt.endAt.toISOString()} | ${appt.teacher?.name ?? ""} | ${appt.student?.name ?? ""}`;
  return Response.json({ ok: true, message: `Appointment cancelled: ${label}` });
}

