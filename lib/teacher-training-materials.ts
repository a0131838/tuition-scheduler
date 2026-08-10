import { getCurrentUser, isManagerUser, isOwnerManager, isTeacherLeadUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const TEACHER_TRAINING_CATEGORY = "老师培训材料";
export const TRAINING_MATERIAL_ACTION = Object.freeze({
  DRAFT: "TRAINING_DRAFT_CREATED",
  DRAFT_UPDATED: "TRAINING_DRAFT_UPDATED",
  SUBMITTED: "TRAINING_SUBMITTED",
  PUBLISHED: "TRAINING_PUBLISHED",
  NEEDS_REVISION: "TRAINING_NEEDS_REVISION",
  ARCHIVED: "TRAINING_ARCHIVED",
});

export type TeacherTrainingMaterialState = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "NEEDS_REVISION" | "ARCHIVED";
export type TeacherTrainingMaterialDecision = "SUBMIT" | "PUBLISH" | "REVISION" | "ARCHIVE";

type TrainingMaterialUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function teacherTrainingMaterialState(actions: readonly string[], archived = false): TeacherTrainingMaterialState {
  if (archived) return "ARCHIVED";
  for (const action of actions) {
    if (action === TRAINING_MATERIAL_ACTION.PUBLISHED) return "PUBLISHED";
    if (action === TRAINING_MATERIAL_ACTION.SUBMITTED) return "SUBMITTED";
    if (action === TRAINING_MATERIAL_ACTION.NEEDS_REVISION) return "NEEDS_REVISION";
    if (action === TRAINING_MATERIAL_ACTION.DRAFT_UPDATED) return "DRAFT";
    if (action === TRAINING_MATERIAL_ACTION.DRAFT) return "DRAFT";
  }
  return "DRAFT";
}

export function teacherTrainingMaterialTransitionAllowed(input: {
  state: TeacherTrainingMaterialState;
  decision: TeacherTrainingMaterialDecision;
  owner: boolean;
}) {
  if (input.decision === "SUBMIT") return input.state === "DRAFT" || input.state === "NEEDS_REVISION";
  if (!input.owner) return false;
  if (input.decision === "PUBLISH" || input.decision === "REVISION") return input.state === "SUBMITTED";
  return input.decision === "ARCHIVE" && input.state === "PUBLISHED";
}

export async function isTeacherTrainingMaterialOperator(user: TrainingMaterialUser | null | undefined) {
  if (!user) return false;
  return (await isManagerUser(user)) || (await isTeacherLeadUser(user));
}

export function isTeacherTrainingMaterialPublisher(user: TrainingMaterialUser | null | undefined) {
  return isOwnerManager(user);
}

export async function getTeacherTrainingMaterials(user: TrainingMaterialUser) {
  const operator = await isTeacherTrainingMaterialOperator(user);
  const documents = await prisma.sharedDocument.findMany({
    where: {
      category: { name: TEACHER_TRAINING_CATEGORY },
    },
    include: {
      uploader: { select: { name: true, email: true } },
      audits: {
        orderBy: { createdAt: "desc" },
        select: { action: true, note: true, createdAt: true, actor: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return documents
    .map((document) => ({
      ...document,
      materialState: teacherTrainingMaterialState(
        document.audits.map((audit) => audit.action),
        document.status === "ARCHIVED",
      ),
    }))
    .filter((document) => operator || document.materialState === "PUBLISHED");
}

export async function canReadTeacherTrainingMaterial(user: TrainingMaterialUser, documentId: string) {
  const document = await prisma.sharedDocument.findFirst({
    where: { id: documentId, category: { name: TEACHER_TRAINING_CATEGORY } },
    select: {
      status: true,
      audits: { orderBy: { createdAt: "desc" }, select: { action: true } },
    },
  });
  if (!document) return false;
  if (await isTeacherTrainingMaterialOperator(user)) return true;
  if (user.role !== "TEACHER" || document.status !== "ACTIVE") return false;
  return teacherTrainingMaterialState(document.audits.map((audit) => audit.action)) === "PUBLISHED";
}
