import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";

export const MANAGER_TEACHER_FEEDBACK_CATEGORIES = [
  { value: "PRAISE", en: "Praise", zh: "表扬" },
  { value: "IMPROVEMENT", en: "Improvement", zh: "改进建议" },
  { value: "ACTION_REQUIRED", en: "Action Required", zh: "需要跟进" },
  { value: "OBSERVATION", en: "Observation", zh: "课堂观察" },
] as const;

export type ManagerTeacherFeedbackCategory = (typeof MANAGER_TEACHER_FEEDBACK_CATEGORIES)[number]["value"];

export function categoryLabel(category: string, lang: "BILINGUAL" | "ZH" | "EN") {
  const item = MANAGER_TEACHER_FEEDBACK_CATEGORIES.find((candidate) => candidate.value === category);
  if (!item) return category;
  if (lang === "EN") return item.en;
  if (lang === "ZH") return item.zh;
  return `${item.en} / ${item.zh}`;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeCategory(value: unknown): ManagerTeacherFeedbackCategory {
  const raw = cleanText(value, 40);
  return MANAGER_TEACHER_FEEDBACK_CATEGORIES.some((item) => item.value === raw)
    ? (raw as ManagerTeacherFeedbackCategory)
    : "OBSERVATION";
}

function sessionSummary(
  session:
    | {
        startAt: Date;
        endAt: Date;
        student?: { name: string } | null;
        class: {
          course?: { name: string } | null;
          subject?: { name: string } | null;
          level?: { name: string } | null;
          oneOnOneStudent?: { name: string } | null;
          enrollments?: Array<{ student: { name: string } }>;
        };
      }
    | null
    | undefined,
) {
  if (!session) return "";
  const course = [session.class.course?.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
  const students = session.student?.name
    ? session.student.name
    : session.class.oneOnOneStudent?.name
      ? session.class.oneOnOneStudent.name
      : (session.class.enrollments ?? []).map((item) => item.student.name).join(", ");
  return [
    formatBusinessDateOnly(new Date(session.startAt)),
    `${formatBusinessTimeOnly(new Date(session.startAt))}-${formatBusinessTimeOnly(new Date(session.endAt))}`,
    course,
    students,
  ]
    .filter(Boolean)
    .join(" · ");
}

const feedbackInclude = {
  teacher: { select: { id: true, name: true } },
  managerUser: { select: { id: true, name: true, email: true } },
  session: {
    select: {
      startAt: true,
      endAt: true,
      student: { select: { name: true } },
      class: {
        select: {
          course: { select: { name: true } },
          subject: { select: { name: true } },
          level: { select: { name: true } },
          oneOnOneStudent: { select: { name: true } },
          enrollments: { select: { student: { select: { name: true } } } },
        },
      },
    },
  },
} as const;

function shapeFeedback(row: Awaited<ReturnType<typeof prisma.managerTeacherFeedback.findMany>>[number] & any) {
  return {
    id: row.id as string,
    teacherId: row.teacherId as string,
    teacherName: row.teacher?.name ?? "",
    managerName: row.managerUser?.name ?? row.managerUser?.email ?? "",
    managerEmail: row.managerUser?.email ?? "",
    category: row.category as string,
    body: row.body as string,
    requiresAck: Boolean(row.requiresAck),
    acknowledgedAt: row.acknowledgedAt ? formatBusinessDateTime(new Date(row.acknowledgedAt)) : "",
    createdAt: formatBusinessDateTime(new Date(row.createdAt)),
    sessionSummary: sessionSummary(row.session),
  };
}

export async function createManagerTeacherFeedback(input: {
  teacherId: string;
  managerUserId: string;
  sessionId?: string | null;
  category: unknown;
  body: unknown;
  requiresAck: boolean;
}) {
  const teacherId = cleanText(input.teacherId, 80);
  const sessionId = cleanText(input.sessionId, 80) || null;
  const body = cleanText(input.body, 3000);
  if (!teacherId) throw new Error("Missing teacher");
  if (body.length < 3) throw new Error("Feedback is too short");

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
  if (!teacher) throw new Error("Teacher not found");

  if (sessionId) {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      },
      select: { id: true },
    });
    if (!session) throw new Error("Session does not belong to this teacher");
  }

  return prisma.managerTeacherFeedback.create({
    data: {
      teacherId,
      managerUserId: input.managerUserId,
      sessionId,
      category: normalizeCategory(input.category),
      body,
      requiresAck: input.requiresAck,
    },
  });
}

export async function getRecentManagerTeacherFeedback(limit = 12) {
  const rows = await prisma.managerTeacherFeedback.findMany({
    where: { archivedAt: null },
    include: feedbackInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(shapeFeedback);
}

export async function getTeacherManagerFeedbackState(teacherId: string) {
  const rows = await prisma.managerTeacherFeedback.findMany({
    where: { teacherId, archivedAt: null },
    include: feedbackInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const feedbacks = rows.map(shapeFeedback);
  const pendingAckCount = feedbacks.filter((item) => item.requiresAck && !item.acknowledgedAt).length;
  return {
    feedbacks,
    pendingAckCount,
    latestUnread: feedbacks.filter((item) => item.requiresAck && !item.acknowledgedAt).slice(0, 3),
  };
}

export async function acknowledgeManagerTeacherFeedback(input: {
  feedbackId: string;
  teacherId: string;
  userId: string;
}) {
  const feedbackId = cleanText(input.feedbackId, 80);
  if (!feedbackId || !input.teacherId || !input.userId) throw new Error("Missing feedback");
  await prisma.managerTeacherFeedback.updateMany({
    where: {
      id: feedbackId,
      teacherId: input.teacherId,
      archivedAt: null,
      acknowledgedAt: null,
    },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedByUserId: input.userId,
    },
  });
}
