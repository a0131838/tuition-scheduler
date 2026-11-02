"use server";

import { canReviewTrainingTarget, getCurrentUser } from "@/lib/auth";
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

// Keep expected validation failures inside the practical form; do not expose server details.
export async function submitTrainingPracticalForm(formData: FormData) {
  try {
    await submitTrainingPractical(formData);
    return {ok:true,message:"Submitted for manager sign-off / 已提交主管验收。"};
  } catch(error) {
    const messages:Record<string,string>={
      "Unauthorized":"Please sign in with an authorized staff account. / 请使用有权限的员工账号重新登录。",
      "Training module not available":"This training module is not available. Refresh the page or contact your manager. / 此培训模块暂不可用，请刷新页面或联系主管核对权限。",
      "Complete reading and pass the quiz before submitting practical evidence":"Complete reading and pass the quiz before submitting practical evidence. / 请先确认阅读并通过测验，再提交实操。",
      "Training-data reference is required":"Training-data reference is required (at least 3 characters). / 请填写培训数据名称或编号，至少3个字符。",
      "Final result must explain the verified system state":"Explain the verified final result (at least 10 characters). / 请填写核对后的最终结果，至少10个字符。",
      "Self-check must address the manager rubric":"Complete the self-check against the manager rubric (at least 20 characters). / 请按主管验收标准填写自查，至少20个字符。",
    };
    const message=error instanceof Error?messages[error.message]:undefined;
    if(message)return {ok:false,message};
    console.error("Training practical submission failed",error);
    return {ok:false,message:"Unable to confirm submission. Your entries are still here; refresh and check the saved status before trying again. / 暂时无法确认提交结果，填写内容已保留；请刷新核对保存状态后再决定是否重试。"};
  }
}

export async function reviewTrainingPractical(formData: FormData) {
  const reviewer = await requireStaff();
  const progressId = String(formData.get("progressId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const rubricConfirmed = String(formData.get("rubricConfirmed") ?? "") === "yes";
  if (decision !== "APPROVED" && decision !== "NEEDS_REWORK") throw new Error("Invalid decision");
  if (!rubricConfirmed) throw new Error("Confirm every manager-rubric item before deciding");
  if (decision === "NEEDS_REWORK" && note.length < 10) throw new Error("Give specific rework instructions");
  const progress = await prisma.staffTrainingProgress.findUnique({
    where: { id: progressId },
    select: {
      userId: true,
      moduleCode: true,
      moduleVersion: true,
      readAt: true,
      quizPassedAt: true,
      practicalStatus: true,
      user: { select: { role: true } },
    },
  });
  if (!progress) throw new Error("Training progress not found");
  if (!(await canReviewTrainingTarget(reviewer, progress.user.role))) {
    throw new Error("Teacher leads can review teacher training only");
  }
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
