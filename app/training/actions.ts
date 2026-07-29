"use server";

import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { canAccessTrainingModule, findTrainingModule, gradeTrainingQuiz } from "@/lib/training-center";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || user.role === "STUDENT") throw new Error("Unauthorized");
  return user;
}

export async function acknowledgeTrainingRead(formData: FormData) {
  const user = await requireStaff();
  const code = String(formData.get("moduleCode") ?? "");
  const item = findTrainingModule(code);
  if (!item || !canAccessTrainingModule(user.role, user.trainingRoles, code)) throw new Error("Training module not available");
  await prisma.staffTrainingProgress.upsert({
    where: { userId_moduleCode_moduleVersion: { userId: user.id, moduleCode: item.code, moduleVersion: item.version } },
    create: { userId: user.id, moduleCode: item.code, moduleVersion: item.version, readAt: new Date() },
    update: { readAt: new Date() },
  });
  revalidatePath("/training");
}

export async function submitTrainingQuiz(formData: FormData) {
  const user = await requireStaff();
  const code = String(formData.get("moduleCode") ?? "");
  const item = findTrainingModule(code);
  if (!item || !canAccessTrainingModule(user.role, user.trainingRoles, code)) throw new Error("Training module not available");
  const answers = item.questions.map((_, index) => Number(formData.get(`answer-${index}`)));
  const score = gradeTrainingQuiz(code, answers);
  if (score === null) throw new Error("Complete every question");
  await prisma.staffTrainingProgress.upsert({
    where: { userId_moduleCode_moduleVersion: { userId: user.id, moduleCode: item.code, moduleVersion: item.version } },
    create: { userId: user.id, moduleCode: item.code, moduleVersion: item.version, quizScore: score, quizPassedAt: score >= 80 ? new Date() : null },
    update: { quizScore: score, quizPassedAt: score >= 80 ? new Date() : null },
  });
  revalidatePath("/training");
}

export async function submitTrainingPractical(formData: FormData) {
  const user = await requireStaff();
  const code = String(formData.get("moduleCode") ?? "");
  const trainingData = String(formData.get("trainingData") ?? "").trim();
  const finalResult = String(formData.get("finalResult") ?? "").trim();
  const selfCheck = String(formData.get("selfCheck") ?? "").trim();
  const item = findTrainingModule(code);
  if (!item || !canAccessTrainingModule(user.role, user.trainingRoles, code)) throw new Error("Training module not available");
  const existing = await prisma.staffTrainingProgress.findUnique({
    where: { userId_moduleCode_moduleVersion: { userId: user.id, moduleCode: item.code, moduleVersion: item.version } },
    select: { readAt: true, quizPassedAt: true },
  });
  if (!existing?.readAt || !existing.quizPassedAt) throw new Error("Complete reading and pass the quiz before submitting practical evidence");
  if (trainingData.length < 3) throw new Error("Training-data reference is required");
  if (finalResult.length < 10) throw new Error("Final result must explain the verified system state");
  if (selfCheck.length < 20) throw new Error("Self-check must address the manager rubric");
  const evidence = [
    `Training data / 培训数据: ${trainingData}`,
    `Final result / 最终结果: ${finalResult}`,
    `Self-check / 逐项自查: ${selfCheck}`,
  ].join("\n");
  await prisma.staffTrainingProgress.upsert({
    where: { userId_moduleCode_moduleVersion: { userId: user.id, moduleCode: item.code, moduleVersion: item.version } },
    create: { userId: user.id, moduleCode: item.code, moduleVersion: item.version, practicalStatus: "SUBMITTED", practicalSubmittedAt: new Date(), practicalEvidence: evidence },
    update: { practicalStatus: "SUBMITTED", practicalSubmittedAt: new Date(), practicalEvidence: evidence, approvedAt: null, approvedByUserId: null },
  });
  revalidatePath("/training");
  revalidatePath("/training/manage");
}

export async function reviewTrainingPractical(formData: FormData) {
  const reviewer = await requireStaff();
  if (!(await isManagerUser(reviewer))) throw new Error("Manager access required");
  const progressId = String(formData.get("progressId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const rubricConfirmed = String(formData.get("rubricConfirmed") ?? "") === "yes";
  if (decision !== "APPROVED" && decision !== "NEEDS_REWORK") throw new Error("Invalid decision");
  if (!rubricConfirmed) throw new Error("Confirm every manager-rubric item before deciding");
  if (decision === "NEEDS_REWORK" && note.length < 10) throw new Error("Give specific rework instructions");
  const progress = await prisma.staffTrainingProgress.findUnique({
    where: { id: progressId },
    select: { userId: true, moduleCode: true, moduleVersion: true, readAt: true, quizPassedAt: true, practicalStatus: true },
  });
  if (!progress) throw new Error("Training progress not found");
  const item = findTrainingModule(progress.moduleCode);
  if (!item || item.version !== progress.moduleVersion) throw new Error("Only the current training version can be reviewed");
  if (!progress.readAt || !progress.quizPassedAt || progress.practicalStatus !== "SUBMITTED") throw new Error("Training is not ready for sign-off");
  if (progress.userId === reviewer.id) throw new Error("Managers cannot sign off their own practical training");
  await prisma.staffTrainingProgress.update({
    where: { id: progressId },
    data: {
      practicalStatus: decision,
      approvalNote: note || null,
      approvedAt: decision === "APPROVED" ? new Date() : null,
      approvedByUserId: reviewer.id,
    },
  });
  revalidatePath("/training");
  revalidatePath("/training/manage");
}
