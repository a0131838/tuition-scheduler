import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  createLearningReportAttendanceSnapshot,
  learningReportPeriodLabel,
  parseLearningReportAttendanceSnapshot,
} from "./learning-report-attendance";
import { formatBusinessDateOnly } from "./date-only";
import { parseReportDraft } from "./midterm-report";
import { parseFinalReportDraft } from "./final-report";
import { renewalParentFields, parseRenewalSnapshot } from "./renewal-progress-report";
import {
  parentReportFields,
  parentSourceHash,
  validateParentReportContent,
  type ParentReportKind,
  type ParentReportSource,
} from "./learning-report-parent-content";
import { translateParentReport } from "./learning-report-parent-ai";
export class ParentReportError extends Error {
  constructor(
    public code: string,
    public status = 409,
  ) {
    super(code);
  }
}
export async function loadParentReportSource(
  kind: ParentReportKind,
  id: string,
  db: Prisma.TransactionClient = prisma,
) {
  if (kind === "RENEWAL") {
    const row = await db.renewalProgressReport.findUnique({
      where: { id },
      include: { student: true, teacher: true, package: { include: { course: true } } },
    });
    if (!row) throw new ParentReportError("NOT_FOUND", 404);
    const snapshot = parseRenewalSnapshot(row.snapshotJson);
    const hours = (minutes: number) => `${Number((minutes / 60).toFixed(2))}h`;
    const packageValue = snapshot.packageType === "MONTHLY"
      ? `Monthly package valid until ${snapshot.validTo ? formatBusinessDateOnly(new Date(snapshot.validTo)) : "date not set"} at assignment. Later renewals are excluded from this snapshot.`
      : `Package total ${hours(snapshot.totalMinutes)}; remaining ${hours(snapshot.remainingMinutes)} at assignment. Later top-ups are excluded from this snapshot.`;
    const source: ParentReportSource = {
      version: 1, kind, reportId: id,
      student: snapshot.studentName || row.student.name, teacher: snapshot.teacherName || row.teacher.name,
      course: snapshot.courseName || row.package.course.name, subject: "",
      date: formatBusinessDateOnly(row.submittedAt ?? row.assignedAt),
      periodZh: `${snapshot.sessionCount} 节实际出勤课次 · ${hours(snapshot.attendedMinutes)}；快照截至 ${formatBusinessDateOnly(new Date(snapshot.capturedAt || row.assignedAt))}`,
      periodEn: `${snapshot.sessionCount} attended sessions · ${hours(snapshot.attendedMinutes)}; snapshot as at ${formatBusinessDateOnly(new Date(snapshot.capturedAt || row.assignedAt))}`,
      level: "", score: "", target: "",
      fields: [
        { key: "packageSnapshot", labelZh: "指派时课包情况", labelEn: "Package at assignment", sectionZh: "报告范围", sectionEn: "Report scope", value: packageValue },
        ...renewalParentFields(row.reportJson),
      ],
    };
    return { row, source, hash: parentSourceHash(source) };
  }
  const row =
    kind === "MIDTERM"
      ? await db.midtermReport.findUnique({
          where: { id },
          include: {
            student: true,
            teacher: true,
            course: true,
            subject: true,
          },
        })
      : await db.finalReport.findUnique({
          where: { id },
          include: {
            student: true,
            teacher: true,
            course: true,
            subject: true,
            reportPeriod: { select: { startsAt: true, endsAt: true } },
          },
        });
  if (!row || row.status === "EXEMPT")
    throw new ParentReportError("NOT_FOUND", 404);
  const period = "reportPeriod" in row ? row.reportPeriod : null;
  const attendance =
    parseLearningReportAttendanceSnapshot(row.reportJson) ??
    (await createLearningReportAttendanceSnapshot({
      packageId: row.packageId,
      studentId: row.studentId,
      teacherId: row.teacherId,
      subjectId: row.subjectId,
      fromAt: period?.startsAt,
      throughAt: period?.endsAt ?? row.submittedAt ?? row.assignedAt,
    }, db));
  const raw =
    kind === "FINAL"
      ? {
          ...((row.reportJson as object) || {}),
          recommendedNextStep:
            (row as any).recommendation ??
            (row.reportJson as any)?.recommendedNextStep,
        }
      : row.reportJson;
  const draft =
    kind === "MIDTERM" ? parseReportDraft(raw) : parseFinalReportDraft(raw);
  const source: ParentReportSource = {
    version: 1,
    kind,
    reportId: id,
    student: row.student.name,
    teacher: row.teacher.name,
    course: row.course.name,
    subject: row.subject?.name || "",
    date: formatBusinessDateOnly(row.submittedAt ?? row.assignedAt),
    periodZh: learningReportPeriodLabel(
      attendance,
      row.reportPeriodLabel,
      "ZH",
    ),
    periodEn: learningReportPeriodLabel(
      attendance,
      row.reportPeriodLabel,
      "EN",
    ),
    level:
      kind === "MIDTERM"
        ? (row as any).examTargetStatus || ""
        : (row as any).finalLevel || "",
    score: row.overallScore == null ? "" : String(row.overallScore),
    target:
      kind === "MIDTERM"
        ? (draft as ReturnType<typeof parseReportDraft>).targetLevelScore
        : "",
    fields: parentReportFields(kind, raw),
  };
  if (kind === "FINAL" && (draft as any).recommendedNextStep) {
    const steps: Record<string, [string, string]> = {
      CONTINUE_CURRENT: ["继续当前课程", "Continue current course"],
      MOVE_TO_NEXT_LEVEL: ["进入下一阶段", "Move to next level"],
      CHANGE_FOCUS: ["调整课程方向", "Change focus"],
      PAUSE_AFTER_COMPLETION: ["结课后暂缓继续", "Pause after completion"],
      COURSE_COMPLETED: ["课程已完成", "Course completed"],
    };
    const step = steps[(draft as any).recommendedNextStep];
    if (step)
      source.fields.push({
        key: "recommendedNextStep",
        labelZh: "老师建议的下一步",
        labelEn: "Recommended next step",
        sectionZh: "下一阶段怎么学",
        sectionEn: "Next steps",
        value: step[0] + " / " + step[1],
      });
  }
  return { row, source, hash: parentSourceHash(source) };
}
export async function currentParentEdition(kind: ParentReportKind, id: string) {
  const current = await loadParentReportSource(kind, id);
  const edition = await prisma.learningReportParentEdition.findUnique({
    where: {
      kind_reportId_sourceHash: {
        kind,
        reportId: id,
        sourceHash: current.hash,
      },
    },
  });
  return { ...current, edition };
}
export async function generateParentEdition(
  kind: ParentReportKind,
  id: string,
  actor: string,
  options: {
    regenerate?: boolean;
    translate?: typeof translateParentReport;
    defer?: (work: () => Promise<void>) => void;
  } = {},
) {
  const { row, source, hash } = await loadParentReportSource(kind, id);
  if (row.archivedAt || !["SUBMITTED", "FORWARDED", "APPROVED", "DELIVERED"].includes(row.status))
    throw new ParentReportError("SAVE_AND_SUBMIT_FIRST");
  if (
    !source.fields.some(
      (f) =>
        ![
          "warningNote",
          "assessmentTool",
          "examName",
          "targetLevelScore",
        ].includes(f.key) &&
        !f.key.startsWith("examMetric") &&
        !f.key.endsWith("Level"),
    )
  )
    throw new ParentReportError("EMPTY_REPORT");
  const where = {
    kind_reportId_sourceHash: { kind, reportId: id, sourceHash: hash },
  };
  let edition = await prisma.learningReportParentEdition.findUnique({ where });
  if (
    edition?.status === "READY" &&
    (!options.regenerate || edition.reviewedAt)
  )
    return edition;
  const lease = new Date(Date.now() - 180000),
    generationId = randomUUID();
  if (!edition) {
    try {
      edition = await prisma.learningReportParentEdition.create({
        data: {
          kind,
          reportId: id,
          ...(kind === "MIDTERM"
            ? { midtermReportId: id }
            : kind === "FINAL" ? { finalReportId: id } : { renewalProgressReportId: id }),
          sourceHash: hash,
          sourceJson: source as any,
          generationId,
          generatedBy: actor,
        },
      });
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2002"
      )
        throw e;
      return prisma.learningReportParentEdition.findUniqueOrThrow({ where });
    }
  } else {
    if (edition.status === "GENERATING" && edition.updatedAt > lease)
      return edition;
    const claimed = await prisma.learningReportParentEdition.updateMany({
      where: {
        id: edition.id,
        updatedAt: edition.updatedAt,
        OR: [
          { status: "FAILED" },
          ...(options.regenerate
            ? [{ status: "READY", reviewedAt: null }]
            : []),
          { status: "GENERATING", updatedAt: { lt: lease } },
        ],
      },
      data: {
        status: "GENERATING",
        generationId,
        errorCode: null,
        generatedBy: actor,
        reviewedAt: null,
        reviewedBy: null,
      },
    });
    if (!claimed.count)
      return prisma.learningReportParentEdition.findUniqueOrThrow({ where });
  }
  const editionId = edition.id;
  const run = async () => {
    try {
      const result = await (options.translate || translateParentReport)(
        source.fields,
      );
      const latest = await loadParentReportSource(kind, id);
      if (latest.hash !== hash) throw new ParentReportError("SOURCE_CHANGED");
      const written = await prisma.learningReportParentEdition.updateMany({
        where: { id: editionId, generationId, status: "GENERATING" },
        data: {
          status: "READY",
          contentJson: result.content as any,
          model: result.model,
          errorCode: null,
        },
      });
      if (written.count)
        await prisma.auditLog.create({
          data: {
            actorEmail: actor,
            module: "LEARNING_REPORT",
            action: "GENERATE_PARENT_EDITION",
            entityType: kind,
            entityId: id,
            meta: {
              editionId: editionId,
              sourceHash: hash,
              model: result.model,
            },
          },
        });
    } catch (error) {
      const code =
        error instanceof ParentReportError
          ? error.code
          : error instanceof Error && /^AI_[A-Z_]+$/.test(error.message)
            ? error.message
            : "AI_UNAVAILABLE";
      await prisma.learningReportParentEdition.updateMany({
        where: { id: editionId, generationId, status: "GENERATING" },
        data: { status: "FAILED", errorCode: code },
      });
    }
  };
  if (options.defer) options.defer(run);
  else await run();
  return prisma.learningReportParentEdition.findUniqueOrThrow({ where });
}
export async function reviewParentEdition(
  kind: ParentReportKind,
  id: string,
  editionId: string,
  actor: string,
) {
  const prepared = await currentParentEdition(kind, id);
  if (
    !prepared.edition ||
    prepared.edition.id !== editionId ||
    prepared.edition.status !== "READY"
  )
    throw new ParentReportError("SOURCE_CHANGED");
  if (
    prepared.edition.reviewedAt &&
    prepared.edition.pdfZh &&
    prepared.edition.pdfEn &&
    prepared.edition.pdfBilingual
  )
    return prepared.edition;
  const content = validateParentReportContent(
    prepared.edition.contentJson,
    prepared.source.fields,
  );
  const { renderParentLearningReportPdf } = await import(
    "./learning-report-parent-pdf"
  );
  const pdfZh = await renderParentLearningReportPdf(
    prepared.source,
    content,
    "ZH",
    true,
  );
  const pdfEn = await renderParentLearningReportPdf(
    prepared.source,
    content,
    "EN",
    true,
  );
  const pdfBilingual = await renderParentLearningReportPdf(
    prepared.source,
    content,
    "BILINGUAL",
    true,
  );
  return prisma.$transaction(async (tx) => {
    if (kind === "MIDTERM")
      await tx.$queryRaw`SELECT "id" FROM "MidtermReport" WHERE "id"=${id} FOR UPDATE`;
    else if (kind === "FINAL")
      await tx.$queryRaw`SELECT "id" FROM "FinalReport" WHERE "id"=${id} FOR UPDATE`;
    else
      await tx.$queryRaw`SELECT "id" FROM "RenewalProgressReport" WHERE "id"=${id} FOR UPDATE`;
    const current = await loadParentReportSource(kind, id, tx);
    const edition = await tx.learningReportParentEdition.findUnique({
      where: { id: editionId },
    });
    if (
      !edition ||
      edition.kind !== kind ||
      edition.reportId !== id ||
      edition.sourceHash !== current.hash ||
      edition.status !== "READY" ||
      current.row.archivedAt ||
      !["SUBMITTED", "FORWARDED", "APPROVED", "DELIVERED"].includes(current.row.status)
    )
      throw new ParentReportError("SOURCE_CHANGED");
    const saved = await tx.learningReportParentEdition.update({
      where: { id: edition.id },
      data: {
        reviewedAt: new Date(),
        reviewedBy: actor,
        pdfZh,
        pdfEn,
        pdfBilingual,
      },
    });
    await tx.auditLog.create({
      data: {
        actorEmail: actor,
        module: "LEARNING_REPORT",
        action: "CONFIRM_PARENT_EDITION",
        entityType: kind,
        entityId: id,
        meta: { editionId: edition.id, sourceHash: current.hash },
      },
    });
    return saved;
  });
}
