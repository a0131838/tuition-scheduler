import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { assertSessionCanRestore } from "@/lib/session-restore-conflict";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
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

  let refundMinutes = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({ where: { sessionId_studentId: { sessionId, studentId } } });
      if (!existing || existing.status !== "EXCUSED") throw new Error("Lesson is no longer cancelled / 课程已不处于取消状态，请刷新");
      await assertSessionCanRestore(tx, sessionId, studentId, isStrictSuperAdmin(user));
      if (existing.deductedCount > 0) throw new Error("Count-based cancellation requires package review / 次数课包取消请先核对课包记录");
      refundMinutes = existing.deductedMinutes;
      const packageId = existing.packageId;
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
          note: existing.note,
        },
      });
      await tx.auditLog.create({ data: {
        actorEmail: user.email, actorName: user.name, actorRole: user.role,
        module: "SCHEDULE", action: "SESSION_RESTORED", entityType: "Session", entityId: sessionId,
        meta: { studentId, previousStatus: existing.status, previousNote: existing.note, refundedMinutes: refundMinutes },
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (e: any) {
    return bad(e?.code === "P2034" ? "Schedule changed; refresh and retry / 课表已变化，请刷新后重试" : e?.message ?? "Restore failed", 409);
  }

  return Response.json({ ok: true, status: "UNMARKED", refundedMinutes: refundMinutes });
}
