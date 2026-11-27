import { createHash } from "node:crypto";
import { canAccessResourceWorkspaceRole } from "./staff-roles";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { RelationshipActor } from "./sales-relationship-policy";
import {
  ensureStudentCustomer,
  type StudentCustomerInput,
} from "./customer-registry";
export type OnboardingMeta = StudentCustomerInput & {
  existingStudentId?: string;
  distinctIdentityNote?: string;
  requestId?: string;
};
export class StudentIdentityConflict extends Error {
  constructor(
    public candidates: Array<{
      id: string;
      name: string;
      school: string | null;
      grade: string | null;
    }>,
  ) {
    super(
      "Possible existing students: choose the exact record, or document a different identity / 可能已有学生，请选择准确档案，或说明确为不同身份",
    );
  }
}
export async function enrollStudentCustomer(
  actor: RelationshipActor,
  data: Prisma.StudentUncheckedCreateInput,
  meta: OnboardingMeta,
) {
  if (actor.isObserver)
    throw new Error("Observer account is read-only / 观察者账号不能修改");
  if (
    !canAccessResourceWorkspaceRole(actor.role) &&
    !actor.operationsAdmin &&
    (meta.ownerUserId ||
      meta.collaboratorUserIds?.length ||
      meta.parentNodeId ||
      meta.parentAccountId ||
      meta.guardianConfirmed ||
      meta.sourceNodeId)
  )
    throw new Error(
      "CRM assignment requires resource workspace access / 客户分配需要资源工作台权限",
    );
  return prisma.$transaction(
    async (tx) => {
      const normalized = String(data.name).trim().toLowerCase();
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${normalized}),1124)::text`;
      const requestId =
        typeof meta.requestId === "string" &&
        /^[a-zA-Z0-9-]{8,80}$/.test(meta.requestId)
          ? meta.requestId
          : null;
      const key = requestId
        ? "crm_enrollment_request:" + actor.id + ":" + requestId
        : null;
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify([
            String(data.name).trim(),
            data.birthDate ?? null,
            data.school ?? null,
            meta.existingStudentId ?? null,
          ]),
        )
        .digest("hex");
      if (key) {
        const saved = await tx.appSetting.findUnique({ where: { key } });
        if (saved) {
          const result = JSON.parse(saved.value);
          if (result.fingerprint !== fingerprint)
            throw new Error(
              "This request saved a different student; reopen the form / 此请求已保存其他学生，请重新打开录入表单",
            );
          await tx.student.findUniqueOrThrow({
            where: { id: result.studentId },
            select: { id: true },
          });
          return { ...result, reused: true };
        }
      }
      let studentId = meta.existingStudentId?.trim() || "";
      const reused = Boolean(studentId);
      if (studentId)
        await tx.student.findUniqueOrThrow({
          where: { id: studentId },
          select: { id: true },
        });
      else {
        const candidates = await tx.student.findMany({
          where: {
            name: { equals: String(data.name).trim(), mode: "insensitive" },
          },
          select: { id: true, name: true, school: true, grade: true },
          take: 15,
        });
        if (
          candidates.length &&
          (!meta.distinctIdentityNote ||
            meta.distinctIdentityNote.trim().length < 20)
        )
          throw new StudentIdentityConflict(candidates);
        studentId = (await tx.student.create({ data, select: { id: true } }))
          .id;
      }
      const customerNodeId = await ensureStudentCustomer(
        tx,
        studentId,
        actor,
        meta,
      );
      const result = { studentId, customerNodeId, reused };
      if (key)
        await tx.appSetting.create({
          data: { key, value: JSON.stringify({ ...result, fingerprint }) },
        });
      await tx.auditLog.create({
        data: {
          actorEmail: actor.email,
          actorName: actor.name,
          actorRole: actor.role,
          module: "STUDENT",
          action: reused ? "REUSE_STUDENT_CUSTOMER" : "CREATE_STUDENT_CUSTOMER",
          entityType: "Student",
          entityId: studentId,
          meta: {
            customerNodeId,
            distinctIdentityNote: meta.distinctIdentityNote ?? null,
            profileOverwritten: false,
          },
        },
      });
      return result;
    },
    { timeout: 30000 },
  );
}
