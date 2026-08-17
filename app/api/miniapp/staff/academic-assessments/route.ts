import { NextResponse } from "next/server";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { prisma } from "@/lib/prisma";
import {
  ACADEMIC_ASSESSMENT_AGE_BANDS,
  ACADEMIC_ASSESSMENT_PATHS,
  ACADEMIC_ASSESSMENT_STATUS,
  ACADEMIC_ASSESSMENT_VERSION,
  generateAssessmentCode,
  normalizeAssessmentCode,
  sha256,
  validateAssessmentProductAge,
} from "@/lib/school-guide-academic-assessment";

function clean(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function canAccess(role: string) {
  return ["ADMIN", "CS", "SALES", "TEACHER"].includes(role);
}

function canIssue(role: string) {
  return ["ADMIN", "CS", "SALES"].includes(role);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canAccess(auth.user.role)) return NextResponse.json({ ok: false, message: "没有评估工作台权限。" }, { status: 403 });
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const [sessions, codes, awaitingCount, auditLogs, requestOpenCount] = await Promise.all([
    prisma.schoolGuideAssessmentSession.findMany({
      where: { status: { in: ["AWAITING_REVIEW", "COMPLETED"] } },
      orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        studentCode: true,
        studentNickname: true,
        ageBand: true,
        targetPath: true,
        formVariant: true,
        status: true,
        confidence: true,
        overallScore: true,
        overallBand: true,
        submittedAt: true,
        reviewedAt: true,
      },
    }),
    prisma.schoolGuideAssessmentCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, codeHint: true, status: true, expiresAt: true, usedCount: true, maxUses: true, ageBand: true, targetPath: true, studentNickname: true, createdByName: true, createdAt: true },
    }),
    prisma.schoolGuideAssessmentSession.count({ where: { status: "AWAITING_REVIEW" } }),
    prisma.auditLog.findMany({
      where: { module: "SCHOOL_GUIDE_ASSESSMENT" },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, actorName: true, actorRole: true, action: true, entityType: true, entityId: true, meta: true, createdAt: true },
    }),
    canIssue(auth.user.role)
      ? prisma.schoolGuideAssessmentRequest.count({ where: { status: { notIn: ["CLOSED", "DECLINED", "INTERPRETED"] } } })
      : Promise.resolve(0),
  ]);
  return NextResponse.json({
    ok: true,
    capabilities: { canIssue: canIssue(auth.user.role), canReview: ["ADMIN", "TEACHER"].includes(auth.user.role) },
    bank: { version: ACADEMIC_ASSESSMENT_VERSION, status: ACADEMIC_ASSESSMENT_STATUS },
    awaitingCount,
    requestOpenCount,
    sessions,
    codes,
    auditLogs,
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canIssue(auth.user.role)) return NextResponse.json({ ok: false, message: "只有管理、教务或顾问可以发放评估码。" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const action = clean(body?.action, 20) || "issue";
  if (action === "revoke") {
    const id = clean(body?.id, 80);
    const code = await prisma.schoolGuideAssessmentCode.findUnique({ where: { id } });
    if (!code) return NextResponse.json({ ok: false, message: "评估码不存在。" }, { status: 404 });
    if (code.usedCount > 0) return NextResponse.json({ ok: false, message: "已经开始使用的评估码不能撤销，请通过日志发起人工纠正。" }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      await tx.schoolGuideAssessmentCode.update({ where: { id }, data: { status: "REVOKED", assessmentRequestId: null } });
      if (code.assessmentRequestId) {
        await tx.schoolGuideAssessmentRequest.update({ where: { id: code.assessmentRequestId }, data: { status: "READY_TO_ISSUE", codeIssuedAt: null } });
      }
      await tx.auditLog.create({ data: { actorEmail: auth.user.email, actorName: auth.user.name, actorRole: auth.user.role, module: "SCHOOL_GUIDE_ASSESSMENT", action: "CODE_REVOKE", entityType: "SchoolGuideAssessmentCode", entityId: id, meta: { codeHint: code.codeHint, assessmentRequestId: code.assessmentRequestId || null } } });
    });
    return NextResponse.json({ ok: true, message: "评估码已撤销。" });
  }

  const ageBand = clean(body?.ageBand, 20);
  const targetPath = clean(body?.targetPath, 30);
  if (ageBand && !ACADEMIC_ASSESSMENT_AGE_BANDS.includes(ageBand as never)) return NextResponse.json({ ok: false, message: "年龄段不正确。" }, { status: 400 });
  if (targetPath && !ACADEMIC_ASSESSMENT_PATHS.includes(targetPath as never)) return NextResponse.json({ ok: false, message: "目标路径不正确。" }, { status: 400 });
  if (ageBand && targetPath && !validateAssessmentProductAge(targetPath, ageBand)) return NextResponse.json({ ok: false, message: ageBand === "3–5岁" ? "3–5岁请改为老师一对一观察评估。" : "年龄段与测评产品不匹配。" }, { status: 400 });
  const rawCode = generateAssessmentCode();
  const normalized = normalizeAssessmentCode(rawCode);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const created = await prisma.$transaction(async (tx) => {
    const code = await tx.schoolGuideAssessmentCode.create({
      data: {
        codeHash: sha256(normalized),
        codeHint: normalized.slice(-4),
        expiresAt,
        ageBand: ageBand || null,
        targetPath: targetPath || null,
        studentNickname: clean(body?.studentNickname, 60) || null,
        note: clean(body?.note, 500) || null,
        createdByUserId: auth.user.id,
        createdByName: auth.user.name,
        createdByEmail: auth.user.email,
      },
    });
    await tx.auditLog.create({
      data: {
        actorEmail: auth.user.email,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        module: "SCHOOL_GUIDE_ASSESSMENT",
        action: "CODE_ISSUE",
        entityType: "SchoolGuideAssessmentCode",
        entityId: code.id,
        meta: { codeHint: code.codeHint, ageBand: ageBand || null, targetPath: targetPath || null, expiresAt: expiresAt.toISOString(), bankVersion: ACADEMIC_ASSESSMENT_VERSION },
      },
    });
    return code;
  });
  return NextResponse.json({ ok: true, code: rawCode, id: created.id, expiresAt, message: "评估码已生成，有效期14天且默认只能使用一次。" });
}
