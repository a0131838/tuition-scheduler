import type { Prisma, PrismaClient } from "@prisma/client";

export const SCHEDULING_HISTORY_MODULE = "SCHEDULING";

type AuditWriter = Pick<PrismaClient, "auditLog">;

export type SchedulingHistoryActor = {
  email: string;
  name?: string | null;
  role?: string | null;
};

export type SchedulingSnapshot = {
  startAt?: string;
  endAt?: string;
  teacherName?: string | null;
  studentName?: string | null;
  campusName?: string | null;
  roomName?: string | null;
  status?: string | null;
};

export async function recordSchedulingChange(
  db: AuditWriter,
  input: {
    actor: SchedulingHistoryActor;
    action: "SESSION_CREATED" | "SESSION_RESCHEDULED" | "SESSION_CANCELLED" | "SESSION_DELETED" | "SESSION_LOCATION_CHANGED" | "SESSION_TEACHER_REPLACED" | "SESSION_STUDENT_CHANGED" | "MINIAPP_SESSION_CHANGE_LOCATION";
    sessionId: string;
    classId: string;
    before?: SchedulingSnapshot;
    after?: SchedulingSnapshot;
    reason?: string | null;
    scope?: "single" | "future" | "series";
    source: "WEB" | "MINIAPP" | "AI_OS";
  },
) {
  await db.auditLog.create({
    data: {
      actorEmail: input.actor.email.trim().toLowerCase(),
      actorName: input.actor.name?.trim() || null,
      actorRole: input.actor.role || null,
      module: SCHEDULING_HISTORY_MODULE,
      action: input.action,
      entityType: "Session",
      entityId: input.sessionId,
      meta: {
        classId: input.classId,
        source: input.source,
        scope: input.scope ?? "single",
        reason: input.reason?.trim() || "",
        before: input.before ?? {},
        after: input.after ?? {},
      } as Prisma.InputJsonValue,
    },
  });
}
