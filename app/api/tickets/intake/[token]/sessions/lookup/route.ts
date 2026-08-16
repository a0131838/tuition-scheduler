import { prisma } from "@/lib/prisma";
import { getTicketSourceSessionOptions } from "@/lib/ticket-source-session-options";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

async function tokenIsValid(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true },
  });
  return Boolean(row?.isActive && (!row.expiresAt || row.expiresAt.getTime() > Date.now()));
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await tokenIsValid(token))) return bad("Intake link is invalid or expired", 403);
  const studentId = String(new URL(req.url).searchParams.get("studentId") ?? "").trim();
  const date = String(new URL(req.url).searchParams.get("date") ?? "").trim();
  if (!studentId) return bad("Student is required");
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) return bad("Student not found", 404);

  const options = await getTicketSourceSessionOptions(studentId, date || null);
  if (!options) return bad("Date must be within the last 7 days and next 90 days / 日期须在最近7天至未来90天内", 409);
  return Response.json({ ok: true, ...options });
}
