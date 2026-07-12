import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MINIAPP_TEMPLATE_KEYS = {
  courseReminder24h: "course_reminder_24h",
  courseReminder6h: "course_reminder_6h",
  requestStatusChanged: "request_status_changed",
  financeUnpaid: "finance_unpaid",
  invoiceIssued: "invoice_issued",
  receiptIssued: "receipt_issued",
  feedbackPublished: "feedback_published",
} as const;

export async function queueMiniappNotification(input: {
  parentId: string;
  studentId?: string | null;
  templateKey: string;
  eventType: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Prisma.InputJsonValue | null;
  scheduledAt?: Date | null;
}) {
  const parent = await prisma.parentAccount.findUnique({
    where: { id: input.parentId },
    select: { id: true, wechatOpenId: true, status: true },
  });
  if (!parent || parent.status !== "ACTIVE") return null;

  const uniqueWhere = {
    parentId_templateKey_targetType_targetId: {
      parentId: parent.id,
      templateKey: input.templateKey,
      targetType: input.targetType || "",
      targetId: input.targetId || "",
    },
  };
  const existing = await prisma.miniappNotificationOutbox.findUnique({ where: uniqueWhere });
  if (existing && ["SENT", "SKIPPED", "PROCESSING"].includes(existing.status)) return existing;

  return prisma.miniappNotificationOutbox.upsert({
    where: uniqueWhere,
    create: {
      parentId: parent.id,
      studentId: input.studentId || null,
      openId: parent.wechatOpenId || null,
      templateKey: input.templateKey,
      eventType: input.eventType,
      targetType: input.targetType || "",
      targetId: input.targetId || "",
      payloadJson: input.payload ?? Prisma.JsonNull,
      scheduledAt: input.scheduledAt || new Date(),
    },
    update: {
      studentId: input.studentId || null,
      openId: parent.wechatOpenId || null,
      eventType: input.eventType,
      payloadJson: input.payload ?? Prisma.JsonNull,
      scheduledAt: input.scheduledAt || new Date(),
      status: "PENDING",
      error: null,
      sentAt: null,
    },
  });
}

export async function queueMiniappNotificationsForStudent(input: {
  studentId: string;
  templateKey: string;
  eventType: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Prisma.InputJsonValue | null;
  scheduledAt?: Date | null;
  permission?: "canViewSchedule" | "canViewFeedback" | "canViewFinance" | "canViewReports" | "canCreateRequests";
}) {
  const links = await prisma.parentStudentLink.findMany({
    where: {
      studentId: input.studentId,
      ...(input.permission ? { [input.permission]: true } : {}),
      parent: { status: "ACTIVE" },
    },
    select: { parentId: true },
  });

  return Promise.all(
    links.map((link) =>
      queueMiniappNotification({
        parentId: link.parentId,
        studentId: input.studentId,
        templateKey: input.templateKey,
        eventType: input.eventType,
        targetType: input.targetType,
        targetId: input.targetId,
        payload: input.payload,
        scheduledAt: input.scheduledAt,
      })
    )
  );
}
