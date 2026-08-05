import { NextResponse } from "next/server";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import {
  assessmentRequestStatusFromSession,
  assessmentRequestStatusMeta,
  buildAssessmentCodeWechatMessage,
} from "@/lib/school-guide-assessment-request";
import {
  ACADEMIC_ASSESSMENT_STATUS,
  ACADEMIC_ASSESSMENT_VERSION,
  generateAssessmentCode,
  normalizeAssessmentCode,
  sha256,
} from "@/lib/school-guide-academic-assessment";

function clean(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function canAccess(role: string) {
  return ["ADMIN", "CS", "SALES"].includes(role);
}

function present(row: any) {
  const session = row.issuedCode?.sessions?.[0] || null;
  const derived = assessmentRequestStatusFromSession(session?.status);
  const status = ["INTERPRETED", "CLOSED", "DECLINED"].includes(row.status) ? row.status : derived || row.status;
  const meta = assessmentRequestStatusMeta(status);
  return {
    id: row.id,
    requestNo: row.requestNo,
    status,
    statusLabel: meta.label,
    currentStep: meta.step,
    nextAction: meta.nextAction,
    parentName: row.parentName,
    studentNickname: row.studentNickname,
    parentWechat: row.parentWechat || "",
    parentPhone: row.parentPhone || "",
    contactText: row.parentWechat || row.parentPhone || "未填联系方式",
    ageBand: row.ageBand,
    currentGrade: row.currentGrade || "",
    targetPath: row.targetPath,
    preferredTestDate: row.preferredTestDate || "",
    needType: row.needType,
    note: row.note || "",
    ownerName: row.ownerName,
    leadId: row.leadId,
    leadNo: row.lead?.leadNo || "",
    codeHint: row.issuedCode?.codeHint || "",
    codeStatus: row.issuedCode?.status || "",
    sessionId: session?.id || "",
    sessionStatus: session?.status || "",
    createdAt: formatBusinessDateTime(row.createdAt),
    updatedAt: formatBusinessDateTime(row.updatedAt),
    contactedAt: row.contactedAt ? formatBusinessDateTime(row.contactedAt) : "",
    codeIssuedAt: row.codeIssuedAt ? formatBusinessDateTime(row.codeIssuedAt) : "",
    interpretedAt: row.interpretedAt ? formatBusinessDateTime(row.interpretedAt) : "",
    declineReason: row.declineReason || "",
  };
}

const include = {
  lead: { select: { leadNo: true, status: true, intentLevel: true } },
  issuedCode: {
    select: {
      id: true,
      codeHint: true,
      status: true,
      usedCount: true,
      expiresAt: true,
      sessions: { orderBy: { createdAt: "desc" as const }, take: 1, select: { id: true, status: true } },
    },
  },
};

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canAccess(auth.user.role)) return NextResponse.json({ ok: false, message: "只有管理、教务或顾问可以处理评估码申请。" }, { status: 403 });
  const url = new URL(req.url);
  const id = clean(url.searchParams.get("id"), 80);
  if (id) {
    const request = await prisma.schoolGuideAssessmentRequest.findUnique({ where: { id }, include });
    if (!request) return NextResponse.json({ ok: false, message: "评估码申请不存在。" }, { status: 404 });
    return NextResponse.json({ ok: true, request: present(request), bank: { version: ACADEMIC_ASSESSMENT_VERSION, status: ACADEMIC_ASSESSMENT_STATUS } });
  }
  const status = clean(url.searchParams.get("status"), 40);
  const q = clean(url.searchParams.get("q"), 80);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 60));
  const rows = await prisma.schoolGuideAssessmentRequest.findMany({
    where: {
      ...(status && status !== "OPEN" ? { status } : status === "OPEN" ? { status: { notIn: ["CLOSED", "DECLINED", "INTERPRETED"] } } : {}),
      ...(q ? { OR: [
        { requestNo: { contains: q, mode: "insensitive" } },
        { parentName: { contains: q, mode: "insensitive" } },
        { studentNickname: { contains: q, mode: "insensitive" } },
        { parentWechat: { contains: q, mode: "insensitive" } },
        { parentPhone: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    include,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });
  const [requested, contacted, ready, issued] = await Promise.all([
    prisma.schoolGuideAssessmentRequest.count({ where: { status: "REQUESTED" } }),
    prisma.schoolGuideAssessmentRequest.count({ where: { status: "CONTACTED" } }),
    prisma.schoolGuideAssessmentRequest.count({ where: { status: "READY_TO_ISSUE" } }),
    prisma.schoolGuideAssessmentRequest.count({ where: { status: { in: ["CODE_ISSUED", "IN_PROGRESS", "AWAITING_REVIEW", "REPORT_READY"] } } }),
  ]);
  return NextResponse.json({ ok: true, requests: rows.map(present), summary: { requested, contacted, ready, issued, open: requested + contacted + ready + issued } });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canAccess(auth.user.role)) return NextResponse.json({ ok: false, message: "只有管理、教务或顾问可以处理评估码申请。" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = clean(body?.id, 80);
  const action = clean(body?.action, 40);
  const request = await prisma.schoolGuideAssessmentRequest.findUnique({ where: { id }, include });
  if (!request) return NextResponse.json({ ok: false, message: "评估码申请不存在。" }, { status: 404 });

  const now = new Date();
  const actionConfig: Record<string, { from: string[]; status: string; message: string }> = {
    mark_contacted: { from: ["REQUESTED"], status: "CONTACTED", message: "已记录联系家长。" },
    mark_ready: { from: ["CONTACTED"], status: "READY_TO_ISSUE", message: "资料已确认，可以发码。" },
    mark_interpreted: { from: ["REPORT_READY"], status: "INTERPRETED", message: "已记录完成人工解读。" },
    close: { from: ["INTERPRETED", "DECLINED"], status: "CLOSED", message: "申请已关闭。" },
  };

  if (action === "decline") {
    const reason = clean(body?.reason, 500);
    if (!reason) return NextResponse.json({ ok: false, message: "请填写暂不适合测试的原因。" }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.schoolGuideAssessmentRequest.update({ where: { id }, data: { status: "DECLINED", declineReason: reason, closedAt: now, closedByUserId: auth.user.id, closedByName: auth.user.name } });
      await tx.leadFollowUp.create({ data: { leadId: request.leadId, actorUserId: auth.user.id, actorName: auth.user.name, actorRole: auth.user.role, channel: "小程序评估工作台", content: `暂不发放评估码：${reason}`, nextAction: "根据原因补充资料或调整评估安排", nextStatus: request.lead.status, intentLevelAfter: request.lead.intentLevel } });
      await tx.auditLog.create({ data: { actorEmail: auth.user.email, actorName: auth.user.name, actorRole: auth.user.role, module: "SCHOOL_GUIDE_ASSESSMENT", action: "REQUEST_DECLINE", entityType: "SchoolGuideAssessmentRequest", entityId: id, meta: { requestNo: request.requestNo, reason } } });
      return row;
    });
    return NextResponse.json({ ok: true, message: "已记录暂不适合测试。", request: present({ ...request, ...updated }) });
  }

  if (action === "issue_code") {
    if (!["CONTACTED", "READY_TO_ISSUE"].includes(request.status)) return NextResponse.json({ ok: false, message: "请先联系家长并确认资料后再发码。" }, { status: 409 });
    if (request.issuedCode) return NextResponse.json({ ok: false, message: "该申请已经生成过评估码。" }, { status: 409 });
    const rawCode = generateAssessmentCode();
    const normalized = normalizeAssessmentCode(rawCode);
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const created = await prisma.$transaction(async (tx) => {
      const code = await tx.schoolGuideAssessmentCode.create({ data: { codeHash: sha256(normalized), codeHint: normalized.slice(-4), expiresAt, ageBand: request.ageBand, targetPath: request.targetPath, studentNickname: request.studentNickname, note: `来自评估码申请 ${request.requestNo}`, createdByUserId: auth.user.id, createdByName: auth.user.name, createdByEmail: auth.user.email, assessmentRequestId: request.id } });
      const row = await tx.schoolGuideAssessmentRequest.update({ where: { id }, data: { status: "CODE_ISSUED", codeIssuedAt: now, readyAt: request.readyAt || now } });
      await tx.lead.update({ where: { id: request.leadId }, data: { nextAction: "跟进家长开始并完成入学准备度测评", nextActionDue: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) } });
      await tx.leadFollowUp.create({ data: { leadId: request.leadId, actorUserId: auth.user.id, actorName: auth.user.name, actorRole: auth.user.role, channel: "小程序评估工作台", content: `已生成一次性评估码，尾号 ${code.codeHint}，有效期14天。`, nextAction: "跟进家长开始并完成入学准备度测评", nextActionDue: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), nextStatus: request.lead.status, intentLevelAfter: request.lead.intentLevel } });
      await tx.auditLog.create({ data: { actorEmail: auth.user.email, actorName: auth.user.name, actorRole: auth.user.role, module: "SCHOOL_GUIDE_ASSESSMENT", action: "REQUEST_CODE_ISSUE", entityType: "SchoolGuideAssessmentRequest", entityId: id, meta: { requestNo: request.requestNo, codeId: code.id, codeHint: code.codeHint, expiresAt: expiresAt.toISOString(), ageBand: request.ageBand, targetPath: request.targetPath } } });
      return { row, code };
    });
    return NextResponse.json({ ok: true, message: "评估码已生成。", code: rawCode, expiresAt, wechatMessage: buildAssessmentCodeWechatMessage({ studentNickname: request.studentNickname, code: rawCode, expiresAt }), request: present({ ...request, ...created.row, issuedCode: { ...created.code, sessions: [] } }) });
  }

  const config = actionConfig[action];
  if (!config) return NextResponse.json({ ok: false, message: "不支持的操作。" }, { status: 400 });
  if (!config.from.includes(request.status)) return NextResponse.json({ ok: false, message: "当前状态不能执行这个操作，请刷新后重试。" }, { status: 409 });
  const data: Record<string, unknown> = { status: config.status };
  if (action === "mark_contacted") Object.assign(data, { contactedAt: now, contactedByUserId: auth.user.id, contactedByName: auth.user.name });
  if (action === "mark_ready") data.readyAt = now;
  if (action === "mark_interpreted") Object.assign(data, { interpretedAt: now, interpretedByUserId: auth.user.id, interpretedByName: auth.user.name });
  if (action === "close") Object.assign(data, { closedAt: now, closedByUserId: auth.user.id, closedByName: auth.user.name });
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.schoolGuideAssessmentRequest.update({ where: { id }, data });
    await tx.leadFollowUp.create({ data: { leadId: request.leadId, actorUserId: auth.user.id, actorName: auth.user.name, actorRole: auth.user.role, channel: "小程序评估工作台", content: config.message, nextAction: config.status === "CONTACTED" ? "确认年龄、目标路径与测试时间" : config.status === "READY_TO_ISSUE" ? "生成并发送一次性评估码" : config.status === "INTERPRETED" ? "按8–12周计划跟进" : "本次评估申请已关闭", nextStatus: request.lead.status, intentLevelAfter: request.lead.intentLevel } });
    await tx.auditLog.create({ data: { actorEmail: auth.user.email, actorName: auth.user.name, actorRole: auth.user.role, module: "SCHOOL_GUIDE_ASSESSMENT", action: `REQUEST_${config.status}`, entityType: "SchoolGuideAssessmentRequest", entityId: id, meta: { requestNo: request.requestNo, previousStatus: request.status } } });
    return row;
  });
  return NextResponse.json({ ok: true, message: config.message, request: present({ ...request, ...updated }) });
}
