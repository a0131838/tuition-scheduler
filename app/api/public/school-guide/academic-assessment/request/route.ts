import { NextRequest, NextResponse } from "next/server";
import { allocateLeadNo, normalizeLeadText } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import {
  ASSESSMENT_REQUEST_NEEDS,
  ASSESSMENT_REQUEST_OPEN_STATUSES,
  ASSESSMENT_REQUEST_OWNER_EMAIL,
  ASSESSMENT_REQUEST_OWNER_NAME,
  assessmentRequestStatusFromSession,
  assessmentRequestStatusMeta,
  buildAssessmentRequestSummary,
  generateAssessmentRequestNo,
  generateAssessmentRequestToken,
} from "@/lib/school-guide-assessment-request";
import {
  ACADEMIC_ASSESSMENT_AGE_BANDS,
  ACADEMIC_ASSESSMENT_PATHS,
  sha256,
} from "@/lib/school-guide-academic-assessment";

const requestHits = new Map<string, number[]>();

function allowRequest(ip: string) {
  const now = Date.now();
  const recent = (requestHits.get(ip) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 6) return false;
  recent.push(now);
  requestHits.set(ip, recent);
  return true;
}

function text(value: unknown, max: number) {
  return normalizeLeadText(value, max);
}

function parentView(request: any) {
  const session = request.issuedCode?.sessions?.[0] || null;
  const derived = assessmentRequestStatusFromSession(session?.status);
  const status = ["INTERPRETED", "CLOSED", "DECLINED"].includes(request.status)
    ? request.status
    : derived || request.status;
  const meta = assessmentRequestStatusMeta(status);
  return {
    requestNo: request.requestNo,
    status,
    statusLabel: meta.label,
    currentStep: meta.step,
    nextAction: meta.nextAction,
    studentNickname: request.studentNickname,
    ageBand: request.ageBand,
    currentGrade: request.currentGrade || "",
    targetPath: request.targetPath,
    preferredTestDate: request.preferredTestDate || "",
    ownerName: "入学顾问",
    canStart: status === "CODE_ISSUED" && request.issuedCode?.status === "ACTIVE" && request.issuedCode.usedCount === 0,
    canRefresh: true,
    hasSession: Boolean(session),
    updatedAt: request.updatedAt,
  };
}

async function requestByToken(token: string) {
  if (!token) return null;
  return prisma.schoolGuideAssessmentRequest.findUnique({
    where: { publicTokenHash: sha256(token) },
    include: {
      issuedCode: {
        select: {
          status: true,
          usedCount: true,
          sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        },
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const body = await req.json().catch(() => null);
  const action = text(body?.action, 20) || "create";

  if (action === "status") {
    const token = text(body?.requestToken, 128);
    const request = await requestByToken(token);
    if (!request) return NextResponse.json({ ok: false, message: "申请记录不存在或凭证已失效。" }, { status: 401 });
    return NextResponse.json({ ok: true, request: parentView(request) });
  }

  if (!allowRequest(ip)) return NextResponse.json({ ok: false, message: "提交过于频繁，请稍后再试。" }, { status: 429 });

  const parentName = text(body?.parentName, 80);
  const studentNickname = text(body?.studentNickname, 80);
  const parentWechat = text(body?.parentWechat, 80);
  const parentPhone = "";
  const ageBand = text(body?.ageBand, 20);
  const currentGrade = text(body?.currentGrade, 40);
  const targetPath = text(body?.targetPath, 30);
  const preferredTestDate = text(body?.preferredTestDate, 10);
  const needType = text(body?.needType, 80);
  const note = text(body?.note, 800);
  const consent = text(body?.consent, 10);
  if (!parentName || !studentNickname || !parentWechat || consent !== "yes") {
    return NextResponse.json({ ok: false, message: "请填写家长称呼、学生昵称和微信号，并确认授权。" }, { status: 400 });
  }
  if (!ACADEMIC_ASSESSMENT_AGE_BANDS.includes(ageBand as never)) {
    return NextResponse.json({ ok: false, message: "请选择正确的年龄段。" }, { status: 400 });
  }
  if (!ACADEMIC_ASSESSMENT_PATHS.includes(targetPath as never)) {
    return NextResponse.json({ ok: false, message: "请选择目标路径。" }, { status: 400 });
  }
  if (!ASSESSMENT_REQUEST_NEEDS.includes(needType as never)) {
    return NextResponse.json({ ok: false, message: "请选择本次最想解决的问题。" }, { status: 400 });
  }
  if (targetPath === "DSA" && ["3–5岁", "6–8岁"].includes(ageBand)) {
    return NextResponse.json({ ok: false, message: "当前年龄段没有已配置的DSA试测卷，请选择其他方向或联系顾问。" }, { status: 400 });
  }
  if (preferredTestDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredTestDate)) {
    return NextResponse.json({ ok: false, message: "希望测试日期格式不正确。" }, { status: 400 });
  }

  const publicToken = generateAssessmentRequestToken();
  const summary = buildAssessmentRequestSummary({ ageBand, currentGrade, targetPath, needType, preferredTestDate, note });
  const now = new Date();
  const nextActionDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const existingRequest = await prisma.schoolGuideAssessmentRequest.findFirst({
    where: {
      status: { in: [...ASSESSMENT_REQUEST_OPEN_STATUSES] },
      OR: [
        ...(parentWechat ? [{ parentWechat: { equals: parentWechat, mode: "insensitive" as const } }] : []),
        ...(parentPhone ? [{ parentPhone: { equals: parentPhone, mode: "insensitive" as const } }] : []),
      ],
    },
    include: { lead: true, issuedCode: { select: { status: true, usedCount: true, sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } } },
    orderBy: { updatedAt: "desc" },
  });

  if (existingRequest) {
    const submittedToken = text(body?.requestToken, 128);
    const ownsExistingRequest = Boolean(submittedToken) && sha256(submittedToken) === existingRequest.publicTokenHash;
    if (!ownsExistingRequest) {
      await prisma.$transaction(async (tx) => {
        await tx.leadFollowUp.create({ data: { leadId: existingRequest.leadId, actorName: "学校指南公开表单", actorRole: "PUBLIC", channel: "微信小程序表单", content: `${summary}\n系统识别到同一联系方式已有开放申请，未重新发放查看凭证。`, nextAction: "联系家长并核对原评估码申请", nextActionDue, nextStatus: existingRequest.lead.status, intentLevelAfter: existingRequest.lead.intentLevel } });
        await tx.lead.update({ where: { id: existingRequest.leadId }, data: { latestSummary: summary, nextAction: "联系家长并核对原评估码申请", nextActionDue } });
        await tx.auditLog.create({ data: { actorEmail: "public-assessment-request@system.local", actorName: existingRequest.requestNo, actorRole: "PUBLIC", module: "SCHOOL_GUIDE_ASSESSMENT", action: "REQUEST_DUPLICATE_CONTACT", entityType: "SchoolGuideAssessmentRequest", entityId: existingRequest.id, meta: { leadId: existingRequest.leadId, status: existingRequest.status } } });
      });
      return NextResponse.json({
        ok: true,
        duplicate: true,
        requestToken: "",
        request: {
          requestNo: "",
          status: "DUPLICATE",
          statusLabel: "已有开放申请",
          currentStep: 1,
          nextAction: "该联系方式已有申请。为保护学生资料，请等待顾问联系，或回到原设备查看进度。",
          studentNickname: "",
          ageBand: "",
          currentGrade: "",
          targetPath: "",
          preferredTestDate: "",
          ownerName: "入学顾问",
          canStart: false,
          canRefresh: false,
          hasSession: false,
          redacted: true,
          updatedAt: null,
        },
      });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.schoolGuideAssessmentRequest.update({
        where: { id: existingRequest.id },
        data: {
          parentName,
          studentNickname,
          parentWechat: parentWechat || null,
          parentPhone: parentPhone || null,
          currentGrade: currentGrade || null,
          preferredTestDate: preferredTestDate || null,
          needType,
          note: note || null,
        },
        include: { issuedCode: { select: { status: true, usedCount: true, sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } } },
      });
      await tx.leadFollowUp.create({
        data: {
          leadId: existingRequest.leadId,
          actorName: "学校指南公开表单",
          actorRole: "PUBLIC",
          channel: "微信小程序表单",
          content: `${summary}\n家长重新提交了同一开放申请。`,
          nextAction: "联系家长并确认是否适合发放评估码",
          nextActionDue,
          nextStatus: existingRequest.lead.status,
          intentLevelAfter: existingRequest.lead.intentLevel,
        },
      });
      await tx.lead.update({ where: { id: existingRequest.leadId }, data: { latestSummary: summary, nextAction: "联系家长并确认是否适合发放评估码", nextActionDue } });
      await tx.auditLog.create({ data: { actorEmail: "public-assessment-request@system.local", actorName: request.requestNo, actorRole: "PUBLIC", module: "SCHOOL_GUIDE_ASSESSMENT", action: "REQUEST_REFRESH", entityType: "SchoolGuideAssessmentRequest", entityId: request.id, meta: { leadId: request.leadId, status: request.status } } });
      return request;
    });
    return NextResponse.json({ ok: true, duplicate: true, requestToken: submittedToken, request: parentView(updated) });
  }

  const duplicateLead = await prisma.lead.findFirst({
    where: {
      isArchived: false,
      status: { notIn: ["Won", "Lost"] },
      OR: [
        ...(parentWechat ? [{ parentWechat: { equals: parentWechat, mode: "insensitive" as const } }] : []),
        ...(parentPhone ? [{ parentPhone: { equals: parentPhone, mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const created = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.findFirst({ where: { email: { equals: ASSESSMENT_REQUEST_OWNER_EMAIL, mode: "insensitive" } }, select: { id: true, name: true } });
    let lead = duplicateLead;
    if (!lead) {
      const leadNo = await allocateLeadNo(tx);
      lead = await tx.lead.create({
        data: {
          leadNo,
          sourceType: "官网/表单",
          sourcePlatform: "新加坡学校指南",
          sourceDetail: "微信小程序 · 入学准备度测评码申请",
          parentName,
          parentWechat: parentWechat || null,
          parentPhone: parentPhone || null,
          studentName: studentNickname,
          grade: currentGrade || null,
          target: targetPath,
          needs: summary,
          intentLevel: "Warm",
          status: "New Lead",
          ownerUserId: owner?.id || null,
          ownerName: owner?.name || ASSESSMENT_REQUEST_OWNER_NAME,
          assignedSalesName: owner?.name || ASSESSMENT_REQUEST_OWNER_NAME,
          nextAction: "联系家长并确认是否适合发放评估码",
          nextActionDue,
          latestSummary: summary,
          createdByName: "学校指南评估码申请",
        },
      });
    } else {
      lead = await tx.lead.update({ where: { id: lead.id }, data: { latestSummary: summary, nextAction: "联系家长并确认是否适合发放评估码", nextActionDue } });
    }
    const request = await tx.schoolGuideAssessmentRequest.create({
      data: {
        requestNo: generateAssessmentRequestNo(now),
        publicTokenHash: sha256(publicToken),
        leadId: lead.id,
        parentName,
        studentNickname,
        parentWechat: parentWechat || null,
        parentPhone: parentPhone || null,
        ageBand,
        currentGrade: currentGrade || null,
        targetPath,
        preferredTestDate: preferredTestDate || null,
        needType,
        note: note || null,
        ownerUserId: owner?.id || null,
        ownerName: owner?.name || ASSESSMENT_REQUEST_OWNER_NAME,
      },
    });
    await tx.leadFollowUp.create({ data: { leadId: lead.id, actorName: "学校指南公开表单", actorRole: "PUBLIC", channel: "微信小程序表单", content: summary, nextAction: "联系家长并确认是否适合发放评估码", nextActionDue, nextStatus: lead.status, intentLevelAfter: lead.intentLevel } });
    await tx.auditLog.create({ data: { actorEmail: "public-assessment-request@system.local", actorName: request.requestNo, actorRole: "PUBLIC", module: "SCHOOL_GUIDE_ASSESSMENT", action: "REQUEST_CREATE", entityType: "SchoolGuideAssessmentRequest", entityId: request.id, meta: { leadId: lead.id, ageBand, targetPath, needType } } });
    return tx.schoolGuideAssessmentRequest.findUniqueOrThrow({ where: { id: request.id }, include: { issuedCode: { select: { status: true, usedCount: true, sessions: { take: 1, select: { status: true } } } } } });
  });

  return NextResponse.json({ ok: true, duplicate: Boolean(duplicateLead), requestToken: publicToken, request: parentView(created) });
}
