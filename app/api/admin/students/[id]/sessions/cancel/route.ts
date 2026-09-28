import { Prisma } from "@prisma/client";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { cancellationLedgerEvidence } from "@/lib/cancellation-ledger-evidence";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  applyAdminLinkedTicketSchedulingAction,
  TicketSchedulingActionContextError,
} from "@/lib/ticket-scheduling-action-write";

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
  const charge = Boolean(body?.charge);
  const note = String(body?.note ?? "").trim();
  const ticketId = String(body?.ticketId ?? "").trim();
  const ticketActionId = String(body?.ticketActionId ?? "").trim();

  if (!sessionId) return bad("Missing sessionId");
  if (Boolean(ticketId) !== Boolean(ticketActionId)) return bad("Invalid ticket action context", 409);

  let desiredDeductedMinutes = 0;
  try {
    await prisma.$transaction(async (tx) => {
      if (ticketId) {
        await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { studentId: true } });
        if (ticket?.studentId !== studentId) throw new TicketSchedulingActionContextError("Ticket belongs to another student / 工单与学生不一致");
      }
      const session = await tx.session.findFirst({
        where: { id: sessionId, ...sessionBelongsToStudentWhere(studentId) },
        select: { id: true, studentId: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true } } },
      });
      if (!session) throw new TicketSchedulingActionContextError("Lesson not found for this student / 未找到属于该学生的课程");
      const durationMin = Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000));
      desiredDeductedMinutes = charge ? durationMin : 0;
      const existing = await tx.attendance.findUnique({
        where: { sessionId_studentId: { sessionId, studentId } },
        select: { deductedMinutes: true, packageId: true, deductedCount: true },
      });
      const delta = desiredDeductedMinutes - (existing?.deductedMinutes ?? 0);
      let packageId = existing?.packageId ?? null;
      if (delta !== 0) {
        if (!packageId && delta > 0) {
          const pkg = await tx.coursePackage.findFirst({
            where: {
              AND: [
                coursePackageAccessibleByStudent(studentId),
                coursePackageMatchesCourse(session.class.courseId),
                { type: "HOURS" },
                { status: "ACTIVE" },
                { remainingMinutes: { gte: delta } },
                { validFrom: { lte: session.startAt } },
                { OR: [{ validTo: null }, { validTo: { gte: session.startAt } }] },
              ],
            },
            orderBy: [{ createdAt: "asc" }],
            select: { id: true },
          });
          packageId = pkg?.id ?? null;
        }

        if (!packageId) {
          throw Object.assign(new Error("No active HOURS package"), { code: "NO_ACTIVE_HOURS_PACKAGE" });
        }

        const pkg = await tx.coursePackage.findFirst({
          where: {
            id: packageId,
            AND: [
              coursePackageAccessibleByStudent(studentId),
              coursePackageMatchesCourse(session.class.courseId),
              { status: "ACTIVE" },
              { validFrom: { lte: session.startAt } },
              { OR: [{ validTo: null }, { validTo: { gte: session.startAt } }] },
            ],
          },
          select: { id: true, type: true, remainingMinutes: true },
        });
        if (!pkg) throw Object.assign(new Error("Package not found"), { code: "PKG_NOT_FOUND" });
        if (pkg.type !== "HOURS") throw Object.assign(new Error("Package not HOURS"), { code: "PKG_NOT_HOURS" });
        if (pkg.remainingMinutes == null) {
          throw Object.assign(new Error("Package remaining minutes is null"), { code: "PKG_REMAIN_NULL" });
        }

        if (delta > 0) {
          if (pkg.remainingMinutes < delta) {
            throw Object.assign(new Error("Not enough remaining minutes"), { code: "PKG_NOT_ENOUGH" });
          }
          await tx.coursePackage.update({
            where: { id: packageId },
            data: { remainingMinutes: { decrement: delta } },
          });
          await tx.packageTxn.create({
            data: {
              packageId,
              kind: "DEDUCT",
              deltaMinutes: -delta,
              sessionId,
              note: `Cancel charge. studentId=${studentId}`,
            },
          });
        } else {
          const refund = -delta;
          await tx.coursePackage.update({
            where: { id: packageId },
            data: { remainingMinutes: { increment: refund } },
          });
          await tx.packageTxn.create({
            data: {
              packageId,
              kind: "ROLLBACK",
              deltaMinutes: refund,
              sessionId,
              note: `Cancel rollback. studentId=${studentId}`,
            },
          });
        }
      }

      await tx.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        create: {
          sessionId,
          studentId,
          status: "EXCUSED",
          deductedCount: existing?.deductedCount ?? 0,
          deductedMinutes: desiredDeductedMinutes,
          packageId: desiredDeductedMinutes > 0 ? packageId : null,
          note: note || "Canceled",
          excusedCharge: charge,
        },
        update: {
          status: "EXCUSED",
          deductedMinutes: desiredDeductedMinutes,
          packageId: desiredDeductedMinutes > 0 ? packageId : null,
          note: note || "Canceled",
          excusedCharge: charge,
        },
      });
      // Even without a ticket, a counter change must reconcile with actual ledger entries.
      const evidence = cancellationLedgerEvidence({
        studentId, exclusiveStudentId: session.studentId, durationMinutes: durationMin,
        attendances: await tx.attendance.findMany({ where: { sessionId }, include: { package: { select: { id: true, type: true, note: true } } } }),
        transactions: await tx.packageTxn.findMany({ where: { sessionId } }),
      });
      if (evidence.status !== "VERIFIED") throw new TicketSchedulingActionContextError(evidence.message);
      if (ticketId && ticketActionId) {
        await applyAdminLinkedTicketSchedulingAction(tx, {
          ticketId,
          actionId: ticketActionId,
          actionType: "CANCEL_SESSION",
          sourceSessionId: sessionId,
          resultSessionId: sessionId,
          chargePolicy: charge ? "CHARGE" : "NO_CHARGE",
          resultText: `已处理请假/取消：${formatBusinessDateTime(session.startAt)}；${charge ? "保留扣课" : "不扣课"}。`,
          appliedByUserId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: user.role,
          auditAction: "ADMIN_TICKET_SESSION_CANCEL_APPLIED",
        });
      }
    }, { isolationLevel: "Serializable" });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || (e.code === "P2010" && e.meta?.code === "40001"))) {
      return bad("Records changed. Refresh and retry / 记录已变化，请刷新后重新核对", 409, { code: "CANCELLATION_RETRY" });
    }
    if (e instanceof TicketSchedulingActionContextError) return bad(e.message, 409, { code: "TICKET_ACTION_CONTEXT" });
    const code = String(e?.code ?? "");
    if (code === "NO_ACTIVE_HOURS_PACKAGE") return bad("No active HOURS package", 409, { code });
    if (code === "PKG_NOT_FOUND") return bad("Package not found", 409, { code });
    if (code === "PKG_NOT_HOURS") return bad("Package not HOURS", 409, { code });
    if (code === "PKG_REMAIN_NULL") return bad("Package remaining minutes is null", 409, { code });
    if (code === "PKG_NOT_ENOUGH") return bad("Not enough remaining minutes", 409, { code });
    return bad(e?.message ?? "Cancel failed", 500);
  }

  return Response.json({
    ok: true,
    status: "EXCUSED",
    excusedCharge: charge,
    deductedMinutes: desiredDeductedMinutes,
    ticketActionApplied: Boolean(ticketId && ticketActionId),
  });
}
