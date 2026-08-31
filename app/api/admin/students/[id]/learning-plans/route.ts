import { requireLearningEvidenceUser } from "@/lib/student-learning-evidence-access";
import { logAudit } from "@/lib/audit-log";
import { parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { loadStudentLearningEvidence } from "@/lib/student-learning-evidence-data";

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function parseReviewDate(value: unknown) {
  const raw = text(value, 20);
  return raw ? parseBusinessDateEnd(raw) : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireLearningEvidenceUser();
  const { id: studentId } = await params;
  const body = await req.json().catch(() => null);
  const title = text(body?.title, 160);
  const goals = text(body?.goals, 6000);
  if (!title || !goals) return Response.json({ ok: false, message: "Title and learning goals are required." }, { status: 400 });

  const evidence = await loadStudentLearningEvidence({
    studentId,
    from: text(body?.from, 20),
    to: text(body?.to, 20),
    courseId: text(body?.courseId, 120) || null,
  });
  if (!evidence) return Response.json({ ok: false, message: "Student not found." }, { status: 404 });

  const reviewDueAt = parseReviewDate(body?.reviewDueAt);
  const plan = await prisma.studentLearningPlan.create({
    data: {
      studentId,
      title,
      periodStart: evidence.range.from,
      periodEnd: evidence.range.to,
      evidenceSnapshotJson: {
        sessionCount: evidence.snapshot.sessionCount,
        feedbackCount: evidence.snapshot.feedbackCount,
        feedbackCoveragePercent: evidence.snapshot.feedbackCoveragePercent,
        attendance: evidence.snapshot.attendance,
        homeworkTrackingCount: evidence.snapshot.homeworkTrackingCount,
        gaps: evidence.snapshot.gaps,
        focusAreas: evidence.snapshot.focusAreas,
        nextSteps: evidence.snapshot.nextSteps,
      },
      goals,
      teacherActions: text(body?.teacherActions, 4000) || null,
      studentActions: text(body?.studentActions, 4000) || null,
      parentActions: text(body?.parentActions, 4000) || null,
      reviewDueAt,
      createdByUserId: actor.id,
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });
  await logAudit({
    actor,
    module: "STUDENT_LEARNING_EVIDENCE",
    action: "CREATE_PLAN_DRAFT",
    entityType: "StudentLearningPlan",
    entityId: plan.id,
    meta: { studentId, from: evidence.range.from.toISOString(), to: evidence.range.to.toISOString(), feedbackCount: evidence.snapshot.feedbackCount },
  });
  return Response.json({ ok: true, plan });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireLearningEvidenceUser();
  const { id: studentId } = await params;
  const body = await req.json().catch(() => null);
  const planId = text(body?.planId, 120);
  if (!planId) return Response.json({ ok: false, message: "Plan ID is required." }, { status: 400 });
  const current = await prisma.studentLearningPlan.findFirst({ where: { id: planId, studentId }, select: { id: true, status: true } });
  if (!current) return Response.json({ ok: false, message: "Plan draft not found." }, { status: 404 });
  if (current.status === "APPROVED") return Response.json({ ok: true, alreadyApproved: true });

  const plan = await prisma.studentLearningPlan.update({
    where: { id: current.id },
    data: { status: "APPROVED", approvedByUserId: actor.id, approvedAt: new Date() },
    select: { id: true, status: true, approvedAt: true },
  });
  await logAudit({
    actor,
    module: "STUDENT_LEARNING_EVIDENCE",
    action: "APPROVE_PLAN",
    entityType: "StudentLearningPlan",
    entityId: plan.id,
    meta: { studentId },
  });
  return Response.json({ ok: true, plan });
}
