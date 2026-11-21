import { packageModeFromNote, packageModeSupportsClass, pickPreferredActivePackage } from "@/lib/package-mode";
import { resolveLessonCancellation, resolveCancellationDeduction } from "@/lib/lesson-cancellation-policy";
import { recordSchedulingChange } from "@/lib/scheduling-change-history";
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
  if (user.role === "FINANCE") return bad("Finance cancellation records are read only / 财务仅可查询取消记录", 403);
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  let policy;
  try { policy = resolveLessonCancellation({ requestedBy: body?.requestedBy, charge: body?.charge, note: body?.note }); }
  catch (error) { return bad(error instanceof Error ? error.message : "Invalid cancellation", 400); }
  const { charge, note, requestedBy } = policy;
  const ticketId = String(body?.ticketId ?? "").trim();
  const ticketActionId = String(body?.ticketActionId ?? "").trim();

  if (!sessionId) return bad("Missing sessionId");
  if (Boolean(ticketId) !== Boolean(ticketActionId)) return bad("Invalid ticket action context", 409);

  let desiredDeductedMinutes = 0;
  let desiredDeductedCount = 0;
  try {
    await prisma.$transaction(async (tx) => {
      if (ticketId) {
        await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { studentId: true } });
        if (ticket?.studentId !== studentId) throw new TicketSchedulingActionContextError("Ticket belongs to another student / 工单与学生不一致");
      }
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${sessionId} FOR UPDATE`;
      const session = await tx.session.findFirst({
        where: { id: sessionId, ...sessionBelongsToStudentWhere(studentId) },
        select: { id: true, studentId: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true, capacity: true } } },
      });
      if (!session) throw new TicketSchedulingActionContextError("Lesson not found for this student / 未找到属于该学生的课程");
      const durationMin = Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000));
      const existing = await tx.attendance.findUnique({where:{sessionId_studentId:{sessionId,studentId}}});
      let packageId = existing?.packageId ?? null;
      let resolved = {units:0,deductedMinutes:0,deductedCount:0};
      const previousUnits = (existing?.deductedCount || 0) > 0 ? existing!.deductedCount : existing?.deductedMinutes || 0;
      if(charge) {
        const candidates = await tx.coursePackage.findMany({where:{AND:[coursePackageAccessibleByStudent(studentId),coursePackageMatchesCourse(session.class.courseId),{status:"ACTIVE"},{validFrom:{lte:session.startAt}},{OR:[{validTo:null},{validTo:{gte:session.startAt}}]}]},orderBy:[{updatedAt:"desc"},{createdAt:"asc"}]});
        const isGroup = session.class.capacity !== 1;
        const eligible = candidates.map(pkg=>{
          const mode = pkg.type === "MONTHLY" ? "MONTHLY" as const : packageModeFromNote(pkg.note);
          const deduction = resolveCancellationDeduction(mode,durationMin);
          return {...pkg,mode,deduction};
        }).filter(pkg=>(pkg.mode==="MONTHLY" || packageModeSupportsClass(pkg.mode,isGroup)) && (pkg.mode==="MONTHLY" || (pkg.remainingMinutes||0)+(pkg.id===existing?.packageId?previousUnits:0)>=pkg.deduction.units));
        const picked = (packageId ? eligible.find(pkg=>pkg.id===packageId) : null) || pickPreferredActivePackage(eligible,isGroup);
        if(!picked) throw new TicketSchedulingActionContextError("No eligible package for this cancellation / 没有可用于本次取消扣课的有效课包");
        if(packageId && previousUnits>0 && packageId!==picked.id) throw new TicketSchedulingActionContextError("Review the original deduction package first / 请先核对原扣课课包");
        packageId = picked.id; resolved = picked.deduction;
      }
      desiredDeductedMinutes = resolved.deductedMinutes;
      desiredDeductedCount = resolved.deductedCount;
      if(body?.mode === "preview") return;
      if(body?.expectedDeductedMinutes !== undefined && (body.expectedDeductedMinutes !== desiredDeductedMinutes || body.expectedDeductedCount !== desiredDeductedCount)) throw new TicketSchedulingActionContextError("Deduction changed since preview; review again / 预检后扣课数量已变化，请重新核对");
      const delta = resolved.units - previousUnits;
      if(delta!==0) {
        if(!packageId) throw new TicketSchedulingActionContextError("Original package missing / 缺少原课包，请核对");
        if(delta>0) {
          const changed=await tx.coursePackage.updateMany({where:{id:packageId,remainingMinutes:{gte:delta}},data:{remainingMinutes:{decrement:delta}}});
          if(changed.count!==1) throw new TicketSchedulingActionContextError("Package balance changed / 课包余额已变化，请刷新核对");
        } else await tx.coursePackage.update({where:{id:packageId},data:{remainingMinutes:{increment:-delta}}});
        await tx.packageTxn.create({data:{packageId,kind:delta>0?"DEDUCT":"ROLLBACK",deltaMinutes:-delta,sessionId,note:`Cancel ${delta>0?"charge":"rollback"}. studentId=${studentId}`}});
      }

      await tx.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        create: {
          sessionId,
          studentId,
          status: "EXCUSED",
          deductedCount: desiredDeductedCount,
          deductedMinutes: desiredDeductedMinutes,
          packageId: charge ? packageId : null,
          note: note || "Canceled",
          excusedCharge: charge,
          cancellationRequestedBy: requestedBy,
          cancellationReason: note,
          waiveDeduction: !charge,
          waiveReason: charge ? null : "Cancellation without deduction",
        },
        update: {
          status: "EXCUSED",
          deductedCount: desiredDeductedCount,
          deductedMinutes: desiredDeductedMinutes,
          packageId: charge ? packageId : null,
          note: note || "Canceled",
          excusedCharge: charge,
          cancellationRequestedBy: requestedBy,
          cancellationReason: note,
          waiveDeduction: !charge,
          waiveReason: charge ? null : "Cancellation without deduction",
        },
      });
      await recordSchedulingChange(tx, {
        actor: user, action: "SESSION_CANCELLED", sessionId, classId: session.classId,
        before: { startAt: session.startAt.toISOString(), endAt: session.endAt.toISOString() },
        after: { status: charge ? "Cancelled - charged" : "Cancelled - no charge" },
        reason: `${requestedBy}: ${note}`, source: "WEB",
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
    deductedCount: desiredDeductedCount,
    ticketActionApplied: Boolean(ticketId && ticketActionId),
  });
}
