import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  if (!sessionId) return bad("Missing sessionId");

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
    select: { status: true, deductedMinutes: true, packageId: true },
  });

  // Nothing to restore, treat as ok.
  if (!existing || existing.status !== "EXCUSED") {
    return Response.json({ ok: true, status: "UNMARKED", refundedMinutes: 0 });
  }

  const refundMinutes = existing.deductedMinutes ?? 0;
  const packageId = existing.packageId ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      if (refundMinutes > 0 && packageId) {
        await tx.coursePackage.update({
          where: { id: packageId },
          data: { remainingMinutes: { increment: refundMinutes } },
        });
        await tx.packageTxn.create({
          data: {
            packageId,
            kind: "ROLLBACK",
            deltaMinutes: refundMinutes,
            sessionId,
            note: `Restore cancel. studentId=${studentId}`,
          },
        });
      }

      await tx.attendance.update({
        where: { sessionId_studentId: { sessionId, studentId } },
        data: {
          status: "UNMARKED",
          excusedCharge: false,
          deductedMinutes: 0,
          note: null,
        },
      });
    });
  } catch (e: any) {
    return bad(e?.message ?? "Restore failed", 500);
  }

  return Response.json({ ok: true, status: "UNMARKED", refundedMinutes: refundMinutes });
}

