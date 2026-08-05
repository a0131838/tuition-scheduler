import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACADEMIC_ASSESSMENT_AGE_BANDS,
  ACADEMIC_ASSESSMENT_PATHS,
  ACADEMIC_ASSESSMENT_STATUS,
  ACADEMIC_ASSESSMENT_VERSION,
  chooseLeastUsedForm,
  generateSessionToken,
  generateStudentCode,
  initialQuestionIds,
  normalizeAssessmentCode,
  sha256,
} from "@/lib/school-guide-academic-assessment";
import { cleanText, publicSessionView } from "../_lib";

const hits = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 12) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return NextResponse.json({ ok: false, message: "尝试次数过多，请稍后再试。" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const rawCode = normalizeAssessmentCode(body?.code);
  const requestToken = cleanText(body?.requestToken, 128);
  const requestedAgeBand = cleanText(body?.ageBand, 20);
  const requestedTargetPath = cleanText(body?.targetPath, 30);
  if (cleanText(body?.consent, 10) !== "yes") {
    return NextResponse.json({ ok: false, message: "开始前需要家长或监护人确认资料使用授权。" }, { status: 400 });
  }
  if (!rawCode && !requestToken) return NextResponse.json({ ok: false, message: "请输入评估码，或从申请进度中开始测评。" }, { status: 400 });
  if (!ACADEMIC_ASSESSMENT_AGE_BANDS.includes(requestedAgeBand as never)) {
    return NextResponse.json({ ok: false, message: "请选择正确的年龄段。" }, { status: 400 });
  }
  if (!ACADEMIC_ASSESSMENT_PATHS.includes(requestedTargetPath as never)) {
    return NextResponse.json({ ok: false, message: "请选择目标路径。" }, { status: 400 });
  }
  if (requestedTargetPath === "DSA" && ["3–5岁", "6–8岁"].includes(requestedAgeBand)) {
    return NextResponse.json({ ok: false, message: "当前年龄段没有已配置的DSA试测卷，请选择其他路径或联系老师。" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const assessmentRequest = requestToken
        ? await tx.schoolGuideAssessmentRequest.findUnique({ where: { publicTokenHash: sha256(requestToken) }, select: { id: true, status: true } })
        : null;
      const code = assessmentRequest
        ? await tx.schoolGuideAssessmentCode.findUnique({ where: { assessmentRequestId: assessmentRequest.id } })
        : await tx.schoolGuideAssessmentCode.findUnique({ where: { codeHash: sha256(rawCode) } });
      if (!code || code.status !== "ACTIVE") throw new Error("INVALID_CODE");
      if (assessmentRequest && ["DECLINED", "CLOSED"].includes(assessmentRequest.status)) throw new Error("INVALID_CODE");
      if (code.expiresAt < new Date()) throw new Error("EXPIRED_CODE");
      if (code.usedCount >= code.maxUses) throw new Error("USED_CODE");
      if (code.ageBand && code.ageBand !== requestedAgeBand) throw new Error("AGE_MISMATCH");
      if (code.targetPath && code.targetPath !== requestedTargetPath) throw new Error("PATH_MISMATCH");

      const studentNickname = cleanText(body?.studentNickname || code.studentNickname, 60);

      const formIds = ["A", "B", "C"].map((variant) => {
        const codeByAge: Record<string, string> = { "3–5岁": "A35", "6–8岁": "A68", "9–11岁": "A911", "12–14岁": "A1214", "15–17岁": "A1517" };
        return `CORE-${codeByAge[requestedAgeBand]}-${variant}`;
      });
      const [recent, previousSessions] = await Promise.all([
        tx.schoolGuideAssessmentSession.groupBy({
          by: ["formId"],
          where: { formId: { in: formIds } },
          _count: { _all: true },
        }),
        studentNickname ? tx.schoolGuideAssessmentSession.findMany({
          where: {
            studentNickname: { equals: studentNickname, mode: "insensitive" },
            ageBand: requestedAgeBand,
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          select: { formId: true },
        }) : Promise.resolve([]),
      ]);
      const counts = Object.fromEntries(recent.map((row) => [row.formId, row._count._all]));
      const excludedForms = [...new Set(previousSessions.map((row) => row.formId))];
      if (excludedForms.length >= 3) throw new Error("RETEST_REQUIRES_APPROVAL");
      const formId = chooseLeastUsedForm(requestedAgeBand, counts, excludedForms);
      const sessionToken = generateSessionToken();
      const questionIds = initialQuestionIds(formId);
      const session = await tx.schoolGuideAssessmentSession.create({
        data: {
          accessCodeId: code.id,
          sessionTokenHash: sha256(sessionToken),
          studentCode: generateStudentCode(),
          studentNickname: studentNickname || null,
          ageBand: requestedAgeBand,
          currentGrade: cleanText(body?.currentGrade, 40) || null,
          targetPath: requestedTargetPath,
          languageBackground: cleanText(body?.languageBackground, 160) || null,
          formId,
          formVariant: formId.slice(-1),
          bankVersion: ACADEMIC_ASSESSMENT_VERSION,
          questionIds,
          answers: {},
          currentQuestionId: questionIds[0] || null,
        },
      });
      await tx.schoolGuideAssessmentCode.update({
        where: { id: code.id },
        data: { usedCount: { increment: 1 }, status: code.usedCount + 1 >= code.maxUses ? "USED" : "ACTIVE" },
      });
      if (code.assessmentRequestId) {
        await tx.schoolGuideAssessmentRequest.update({
          where: { id: code.assessmentRequestId },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          actorEmail: "public-assessment@system.local",
          actorName: session.studentCode,
          actorRole: "PUBLIC",
          module: "SCHOOL_GUIDE_ASSESSMENT",
          action: "START",
          entityType: "SchoolGuideAssessmentSession",
          entityId: session.id,
          meta: { ageBand: requestedAgeBand, targetPath: requestedTargetPath, formId, bankVersion: ACADEMIC_ASSESSMENT_VERSION, sourceStatus: ACADEMIC_ASSESSMENT_STATUS, assessmentRequestId: code.assessmentRequestId || null },
        },
      });
      return { session, sessionToken };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true, sessionToken: result.sessionToken, session: publicSessionView(result.session) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      INVALID_CODE: "评估码无效，请向老师或顾问核对。",
      EXPIRED_CODE: "评估码已过期，请联系老师或顾问重新领取。",
      USED_CODE: "评估码已使用；如需继续，请使用原设备上的“继续测评”。",
      AGE_MISMATCH: "所选年龄段与评估码不一致，请联系发码员工核对。",
      PATH_MISMATCH: "所选目标路径与评估码不一致，请联系发码员工核对。",
      RETEST_REQUIRES_APPROVAL: "90天内三套平行卷均已使用，请联系老师人工批准后再测。",
    };
    if (messages[code]) return NextResponse.json({ ok: false, message: messages[code] }, { status: 409 });
    throw error;
  }
}
