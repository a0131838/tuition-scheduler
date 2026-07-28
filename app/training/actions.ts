"use server";

import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { findTrainingModule, gradeTrainingQuiz } from "@/lib/training-center";
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
  if (!item || !item.roles.includes(user.role)) throw new Error("Training module not available");
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
  if (!item || !item.roles.includes(user.role)) throw new Error("Training module not available");
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
  const evidence = String(formData.get("evidence") ?? "").trim();
  const item = findTrainingModule(code);
  if (!item || !item.roles.includes(user.role)) throw new Error("Training module not available");
  if (evidence.length < 10) throw new Error("Practical evidence is too short");
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
  if (decision !== "APPROVED" && decision !== "NEEDS_REWORK") throw new Error("Invalid decision");
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
