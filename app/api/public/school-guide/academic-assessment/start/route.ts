import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACADEMIC_ASSESSMENT_AGE_BANDS,
  ACADEMIC_ASSESSMENT_PATHS,
  ACADEMIC_ASSESSMENT_STATUS,
  ACADEMIC_ASSESSMENT_VERSION,
  chooseLeastUsedForm,
  formIdsForAge,
  generateSessionToken,
  generateStudentCode,
  initialQuestionIds,
  isAssessmentProduct,
  normalizeAssessmentCode,
  parallelRetestLimitReached,
  recentParallelFormExclusions,
  sha256,
  validateAssessmentProductAge,
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

function lockedPathMatches(codePath: string | null, requestedPath: string) {
  if (!codePath || codePath === requestedPath) return true;
  if (codePath === "INTERNATIONAL" && requestedPath === "INTERNATIONAL_ENGLISH") return true;
  if (codePath === "MOE_AEIS" && ["AEIS_PRIMARY", "AEIS_SECONDARY"].includes(requestedPath)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return NextResponse.json({ ok: false, message: "尝试次数过多，请稍后再试。" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const rawCode = normalizeAssessmentCode(body?.code);
  const requestToken = cleanText(body?.requestToken, 128);
  const retestSessionToken = cleanText(body?.retestSessionToken, 128);
  const requestedAgeBand = cleanText(body?.ageBand, 20);
  const requestedTargetPath = cleanText(body?.targetPath, 30);
  const directSelfServe = !rawCode && !requestToken && !retestSessionToken;
  const requestedStudentNickname = cleanText(body?.studentNickname, 60);
  if (cleanText(body?.consent, 10) !== "yes") {
    return NextResponse.json({ ok: false, message: "开始前需要家长或监护人确认资料使用授权。" }, { status: 400 });
  }
  if (directSelfServe && !requestedStudentNickname) {
    return NextResponse.json({ ok: false, message: "请填写学生昵称，方便保存进度并避免短期内重复同一套题。" }, { status: 400 });
  }
  if (!ACADEMIC_ASSESSMENT_AGE_BANDS.includes(requestedAgeBand as never)) {
    return NextResponse.json({ ok: false, message: "请选择正确的年龄段。" }, { status: 400 });
  }
  if (!ACADEMIC_ASSESSMENT_PATHS.includes(requestedTargetPath as never)) {
    return NextResponse.json({ ok: false, message: "请选择目标路径。" }, { status: 400 });
  }
  if (!validateAssessmentProductAge(requestedTargetPath, requestedAgeBand)) {
    const message = requestedAgeBand === "3–5岁"
      ? "3–5岁不使用在线CEFR或AEIS卷，请由老师安排一对一观察评估。"
      : "当前年龄段与所选测评不匹配，请重新选择。";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
  if (requestedTargetPath === "DSA" && ["3–5岁", "6–8岁"].includes(requestedAgeBand)) {
    return NextResponse.json({ ok: false, message: "当前年龄段没有已配置的DSA试测卷，请选择其他路径或联系老师。" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const retestSource = retestSessionToken
        ? await tx.schoolGuideAssessmentSession.findUnique({
          where: { sessionTokenHash: sha256(retestSessionToken) },
          select: {
            id: true, status: true, studentNickname: true, ageBand: true, currentGrade: true,
            targetPath: true, languageBackground: true, formId: true, createdAt: true,
          },
        })
        : null;
      if (retestSessionToken && (!retestSource || !["AWAITING_REVIEW", "COMPLETED"].includes(retestSource.status))) {
        throw new Error("INVALID_RETEST");
      }
      if (retestSource && (retestSource.ageBand !== requestedAgeBand || retestSource.targetPath !== requestedTargetPath)) {
        throw new Error("RETEST_MISMATCH");
      }
      const assessmentRequest = requestToken
        ? await tx.schoolGuideAssessmentRequest.findUnique({ where: { publicTokenHash: sha256(requestToken) }, select: { id: true, status: true } })
        : null;
      const legacyCode = assessmentRequest
        ? await tx.schoolGuideAssessmentCode.findUnique({ where: { assessmentRequestId: assessmentRequest.id } })
        : rawCode ? await tx.schoolGuideAssessmentCode.findUnique({ where: { codeHash: sha256(rawCode) } }) : null;
      const code = retestSource
        ? await tx.schoolGuideAssessmentCode.create({
          data: {
            codeHash: sha256(generateSessionToken()),
            codeHint: "RETEST",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            maxUses: 1,
            ageBand: retestSource.ageBand,
            targetPath: retestSource.targetPath,
            studentNickname: retestSource.studentNickname,
            note: `平行卷复测，来源会话 ${retestSource.id}`,
            createdByName: "公开自助复测",
            createdByEmail: "public-assessment@system.local",
          },
        })
        : directSelfServe
        ? await tx.schoolGuideAssessmentCode.create({
          data: {
            codeHash: sha256(generateSessionToken()),
            codeHint: "FREE",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            maxUses: 1,
            ageBand: requestedAgeBand,
            targetPath: requestedTargetPath,
            studentNickname: requestedStudentNickname,
            note: "公开自助测评内部凭证",
            createdByName: "公开自助测评",
            createdByEmail: "public-assessment@system.local",
          },
        })
        : legacyCode;
      if (!code || code.status !== "ACTIVE") throw new Error("INVALID_CODE");
      if (assessmentRequest && ["DECLINED", "CLOSED"].includes(assessmentRequest.status)) throw new Error("INVALID_CODE");
      if (code.expiresAt < new Date()) throw new Error("EXPIRED_CODE");
      if (code.usedCount >= code.maxUses) throw new Error("USED_CODE");
      if (code.ageBand && code.ageBand !== requestedAgeBand) throw new Error("AGE_MISMATCH");
      if (!lockedPathMatches(code.targetPath, requestedTargetPath)) throw new Error("PATH_MISMATCH");

      const studentNickname = cleanText(retestSource?.studentNickname || body?.studentNickname || code.studentNickname, 60);

      const formIds = formIdsForAge(requestedAgeBand);
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
            targetPath: requestedTargetPath,
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          select: { id: true, formId: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        }) : Promise.resolve([]),
      ]);
      if (retestSource && parallelRetestLimitReached(previousSessions.map((row) => row.createdAt))) {
        throw new Error("RETEST_LIMIT");
      }
      const counts = Object.fromEntries(recent.map((row) => [row.formId, row._count._all]));
      const excludedForms = recentParallelFormExclusions(previousSessions, formIds);
      const formId = chooseLeastUsedForm(requestedAgeBand, counts, excludedForms);
      const previousSession = retestSource || previousSessions[0] || null;
      const sessionToken = generateSessionToken();
      const questionIds = initialQuestionIds(formId, requestedTargetPath);
      if (!questionIds.length) throw new Error("PRODUCT_QUESTIONS_MISSING");
      const session = await tx.schoolGuideAssessmentSession.create({
        data: {
          accessCodeId: code.id,
          sessionTokenHash: sha256(sessionToken),
          studentCode: generateStudentCode(),
          studentNickname: studentNickname || null,
          ageBand: requestedAgeBand,
          currentGrade: cleanText(retestSource?.currentGrade || body?.currentGrade, 40) || null,
          targetPath: requestedTargetPath,
          languageBackground: cleanText(retestSource?.languageBackground || body?.languageBackground, 160) || null,
          formId,
          formVariant: formId.slice(-1),
          bankVersion: ACADEMIC_ASSESSMENT_VERSION,
          route: isAssessmentProduct(requestedTargetPath) ? "product-v2" : null,
          questionIds,
          answers: requestedTargetPath === "INTERNATIONAL_ENGLISH" ? {
            __ITEP_SECTION_META__: {
              value: "",
              durationSeconds: 0,
              updatedAt: new Date().toISOString(),
              autoScore: null,
              sectionStartedAt: { GRAMMAR: new Date().toISOString() },
            },
          } : {},
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
          meta: { ageBand: requestedAgeBand, targetPath: requestedTargetPath, formId, bankVersion: ACADEMIC_ASSESSMENT_VERSION, sourceStatus: ACADEMIC_ASSESSMENT_STATUS, sourceMode: retestSource ? "PARALLEL_RETEST" : directSelfServe ? "DIRECT_SELF_SERVE" : "CONTROLLED_CODE", assessmentRequestId: code.assessmentRequestId || null, isRetest: Boolean(previousSession), previousSessionId: previousSession?.id || null, recommendedIntervalDays: 30 },
        },
      });
      return { session, sessionToken };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true, sessionToken: result.sessionToken, session: publicSessionView(result.session) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      INVALID_CODE: "测评凭证无效，请刷新页面后重试。",
      EXPIRED_CODE: "评估码已过期，请联系老师或顾问重新领取。",
      USED_CODE: "评估码已使用；如需继续，请使用原设备上的“继续测评”。",
      AGE_MISMATCH: "所选年龄段与评估码不一致，请联系发码员工核对。",
      PATH_MISMATCH: "所选目标路径与评估码不一致，请联系发码员工核对。",
      PRODUCT_QUESTIONS_MISSING: "当前测评产品的试题配置不完整，请联系老师。",
      INVALID_RETEST: "这次测评尚未提交，或原记录已经失效，暂时不能开始平行卷复测。",
      RETEST_MISMATCH: "复测必须沿用同一学生、年龄段和测评方向。",
      RETEST_LIMIT: "24小时内已完成或开始3套平行卷。为避免记忆题目影响结果，请等待老师复核或次日再测。",
    };
    if (messages[code]) return NextResponse.json({ ok: false, message: messages[code] }, { status: 409 });
    throw error;
  }
}
