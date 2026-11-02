import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import {
  currentParentEdition,
  generateParentEdition,
  reviewParentEdition,
} from "../../lib/learning-report-parent-editions";
import {
  validateParentReportContent,
  type ParentReportField,
} from "../../lib/learning-report-parent-content";
async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
    const u = new URL(process.env[key] || "");
    assert.equal(u.hostname, "127.0.0.1");
    assert.equal(u.port, "55439");
    assert.equal(u.pathname, "/sgt_staff_feedback_test");
  }
  const actor = randomUUID() + "@uat.invalid",
    student = await prisma.student.create({
      data: { name: "Parent report fictional UAT" },
    }),
    teacher = await prisma.teacher.create({
      data: { name: "Parent report UAT" },
    }),
    course = await prisma.course.create({
      data: { name: "Parent report " + randomUUID() },
    });
  const report = await prisma.midtermReport.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      courseId: course.id,
      progressPercent: 50,
      consumedMinutes: 300,
      totalMinutes: 600,
      status: "SUBMITTED",
      submittedAt: new Date("2026-11-02"),
      reportJson: {
        overallSummary: "Learning progress at A2.",
        targetLevelScore: "B1",
      },
    },
  });
  let calls = 0;
  let finish: (() => void) | undefined;
  const translate = async (fields: ParentReportField[]) => {
    calls++;
    return {
      content: validateParentReportContent(
        {
          translations: Object.fromEntries(
            fields.map((f) => [
              f.key,
              /[\u3400-\u9fff]/.test(f.value)
                ? f.value
                : "中文译文：" + f.value,
            ]),
          ),
          summary: [],
        },
        fields,
      ),
      model: "isolated-uat-mock",
    };
  };
  try {
    let entered!: () => void;
    const started = new Promise<void>((r) => (entered = r)),
      gate = new Promise<void>((r) => (finish = r));
    const first = generateParentEdition("MIDTERM", report.id, actor, {
      translate: async (fields) => {
        entered();
        await gate;
        return translate(fields);
      },
    });
    await started;
    const concurrent = await generateParentEdition(
      "MIDTERM",
      report.id,
      actor,
      { translate },
    );
    assert.equal(concurrent.status, "GENERATING");
    finish!();
    const ready = await first;
    assert.equal(ready.status, "READY");
    assert.equal(calls, 1);
    const same = await generateParentEdition("MIDTERM", report.id, actor, {
      translate,
    });
    assert.equal(same.id, ready.id);
    assert.equal(calls, 1);
    const regenerated = await generateParentEdition(
      "MIDTERM",
      report.id,
      actor,
      { translate, regenerate: true },
    );
    assert.equal(regenerated.id, ready.id);
    assert.equal(calls, 2);
    let queued: (() => Promise<void>) | undefined;
    const beforeQueue = calls;
    const pending = await generateParentEdition("MIDTERM", report.id, actor, {
      translate,
      regenerate: true,
      defer: (work) => {
        queued = work;
      },
    });
    assert.equal(pending.status, "GENERATING");
    assert.equal(calls, beforeQueue);
    assert(queued);
    await queued!();
    assert.equal(
      (await currentParentEdition("MIDTERM", report.id)).edition?.status,
      "READY",
    );
    const reviewed = await reviewParentEdition(
      "MIDTERM",
      report.id,
      ready.id,
      actor,
    );
    assert(reviewed.reviewedAt);
    for (const bytes of [reviewed.pdfZh, reviewed.pdfEn, reviewed.pdfBilingual])
      assert.equal(Buffer.from(bytes!).subarray(0, 5).toString(), "%PDF-");
    const frozen = await generateParentEdition("MIDTERM", report.id, actor, {
      translate,
      regenerate: true,
    });
    assert.equal(calls, 3);
    assert(
      Buffer.from(frozen.pdfBilingual!).equals(
        Buffer.from(reviewed.pdfBilingual!),
      ),
    );
    await prisma.midtermReport.update({
      where: { id: report.id },
      data: {
        reportJson: {
          overallSummary: "Changed teacher source at A2.",
          targetLevelScore: "B1",
        },
      },
    });
    assert.equal(
      (await currentParentEdition("MIDTERM", report.id)).edition,
      null,
    );
    await assert.rejects(
      reviewParentEdition("MIDTERM", report.id, ready.id, actor),
      /SOURCE_CHANGED/,
    );
    const failed = await generateParentEdition("MIDTERM", report.id, actor, {
      translate: async () => {
        throw Error("AI_UNAVAILABLE");
      },
    });
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.errorCode, "AI_UNAVAILABLE");
    const retry = await generateParentEdition("MIDTERM", report.id, actor, {
      translate,
    });
    assert.equal(retry.id, failed.id);
    assert.equal(retry.status, "READY");
    assert.equal(retry.reviewedAt, null);
    assert.equal(
      await prisma.learningReportParentEdition.count({
        where: { reportId: report.id },
      }),
      2,
    );
    // A teacher edit while the model runs must not publish the stale result.
    await prisma.midtermReport.update({
      where: { id: report.id },
      data: { reportJson: { overallSummary: "Third source at A2." } },
    });
    const stale = await generateParentEdition("MIDTERM", report.id, actor, {
      translate: async (fields) => {
        await prisma.midtermReport.update({
          where: { id: report.id },
          data: { reportJson: { overallSummary: "Fourth source at A2." } },
        });
        return translate(fields);
      },
    });
    assert.equal(stale.status, "FAILED");
    assert.equal(stale.errorCode, "SOURCE_CHANGED");
    assert.equal(
      (await currentParentEdition("MIDTERM", report.id)).edition,
      null,
    );
    await prisma.midtermReport.delete({ where: { id: report.id } });
    assert.equal(
      await prisma.learningReportParentEdition.count({
        where: { reportId: report.id },
      }),
      0,
    );
    console.log(
      JSON.stringify({
        passed: true,
        oneConcurrentModelCall: true,
        deferredJobReturnsBeforeModel: true,
        cachedGeneration: true,
        unconfirmedRegeneration: true,
        confirmedVersionsFrozen: true,
        threeStoredPdfs: true,
        sourceEditsInvalidateTranslations: true,
        staleReviewDenied: true,
        providerFailureRetry: true,
        midGenerationEditNotPublished: true,
      }),
    );
  } finally {
    finish?.();
    await prisma.learningReportParentEdition.deleteMany({
      where: { reportId: report.id },
    });
    await prisma.auditLog.deleteMany({ where: { actorEmail: actor } });
    await prisma.midtermReport.deleteMany({ where: { id: report.id } });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.teacher.delete({ where: { id: teacher.id } });
    await prisma.course.delete({ where: { id: course.id } });
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
