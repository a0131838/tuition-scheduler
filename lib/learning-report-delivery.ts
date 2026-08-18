import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LearningReportKind = "MIDTERM" | "FINAL";

type DeliveryActor = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

export type LearningReportDeliveryApproval = {
  approvedAt: string | null;
  approvedByUserId: string | null;
  approvedByName: string | null;
};

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function learningReportMeta(raw: unknown) {
  return record(record(raw)._meta);
}

export function learningReportDeliveryApproval(raw: unknown): LearningReportDeliveryApproval {
  const meta = learningReportMeta(raw);
  return {
    approvedAt: text(meta.deliveryApprovedAt),
    approvedByUserId: text(meta.deliveryApprovedByUserId),
    approvedByName: text(meta.deliveryApprovedByName),
  };
}

export function isLearningReportApprovedForDelivery(raw: unknown) {
  return Boolean(learningReportDeliveryApproval(raw).approvedAt);
}

export function learningReportDeliveryReminderKey(kind: LearningReportKind, reportId: string, approvedAt: string) {
  const version = Date.parse(approvedAt);
  if (!Number.isFinite(version)) throw new Error("Invalid report delivery approval time");
  return `${kind}_DELIVER:${reportId}:${version}`;
}

export function parseLearningReportDeliveryReminderKey(key: string) {
  const match = /^(MIDTERM|FINAL)_DELIVER:([0-9a-f-]{36}):(\d{10,16})$/i.exec(String(key || "").trim());
  if (!match) return null;
  return { kind: match[1].toUpperCase() as LearningReportKind, reportId: match[2], approvalVersion: Number(match[3]) };
}

export function learningReportDeliveryDueAt(approvedAt: Date) {
  const businessDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(approvedAt);
  const endOfBusinessDay = new Date(`${businessDate}T10:00:00.000Z`); // 18:00 Asia/Singapore
  return endOfBusinessDay.getTime() > approvedAt.getTime()
    ? endOfBusinessDay
    : new Date(approvedAt.getTime() + 2 * 60 * 60 * 1000);
}

function withApproval(raw: unknown, actor: DeliveryActor, now: Date) {
  const body = record(raw);
  const meta = learningReportMeta(raw);
  return {
    ...body,
    _meta: {
      ...meta,
      deliveryApprovedAt: now.toISOString(),
      deliveryApprovedByUserId: actor.id,
      deliveryApprovedByName: actor.name || actor.email || "-",
    },
  };
}

function withoutApproval(raw: unknown) {
  const body = record(raw);
  const meta = learningReportMeta(raw);
  const {
    deliveryApprovedAt: _deliveryApprovedAt,
    deliveryApprovedByUserId: _deliveryApprovedByUserId,
    deliveryApprovedByName: _deliveryApprovedByName,
    ...restMeta
  } = meta;
  return { ...body, _meta: restMeta };
}

function auditData(actor: DeliveryActor, action: string, entityType: string, entityId: string, meta?: Prisma.InputJsonValue) {
  return {
    actorEmail: String(actor.email || "").trim().toLowerCase(),
    actorName: actor.name?.trim() || null,
    actorRole: actor.role?.trim() || null,
    module: "LEARNING_REPORT_DELIVERY",
    action,
    entityType,
    entityId,
    meta,
  };
}

export async function approveLearningReportForDelivery(input: {
  kind: LearningReportKind;
  reportId: string;
  actor: DeliveryActor;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    if (input.kind === "MIDTERM") {
      const row = await tx.midtermReport.findUnique({ where: { id: input.reportId }, select: { id: true, status: true, archivedAt: true, reportJson: true } });
      const meta = learningReportMeta(row?.reportJson);
      if (!row || row.status !== "SUBMITTED" || row.archivedAt || meta.lockedAfterForwarded) throw new Error("Report is not eligible for delivery approval");
      const reportJson = withApproval(row.reportJson, input.actor, now);
      await tx.midtermReport.update({ where: { id: row.id }, data: { reportJson: reportJson as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: auditData(input.actor, "APPROVE_FOR_DELIVERY", "MidtermReport", row.id, { approvedAt: now.toISOString() }) });
      return learningReportDeliveryApproval(reportJson);
    }

    const row = await tx.finalReport.findUnique({ where: { id: input.reportId }, select: { id: true, status: true, archivedAt: true, deliveredAt: true, reportJson: true } });
    if (!row || row.status !== "SUBMITTED" || row.archivedAt || row.deliveredAt) throw new Error("Report is not eligible for delivery approval");
    const reportJson = withApproval(row.reportJson, input.actor, now);
    await tx.finalReport.update({ where: { id: row.id }, data: { reportJson: reportJson as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: auditData(input.actor, "APPROVE_FOR_DELIVERY", "FinalReport", row.id, { approvedAt: now.toISOString() }) });
    return learningReportDeliveryApproval(reportJson);
  });
}

export async function revokeLearningReportDeliveryApproval(input: {
  kind: LearningReportKind;
  reportId: string;
  actor: DeliveryActor;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.kind === "MIDTERM") {
      const row = await tx.midtermReport.findUnique({ where: { id: input.reportId }, select: { id: true, status: true, archivedAt: true, reportJson: true } });
      const meta = learningReportMeta(row?.reportJson);
      if (!row || row.status !== "SUBMITTED" || row.archivedAt || meta.lockedAfterForwarded || !isLearningReportApprovedForDelivery(row.reportJson)) throw new Error("Report approval cannot be revoked");
      await tx.midtermReport.update({ where: { id: row.id }, data: { reportJson: withoutApproval(row.reportJson) as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: auditData(input.actor, "REVOKE_DELIVERY_APPROVAL", "MidtermReport", row.id) });
      return;
    }

    const row = await tx.finalReport.findUnique({ where: { id: input.reportId }, select: { id: true, status: true, archivedAt: true, deliveredAt: true, reportJson: true } });
    if (!row || row.status !== "SUBMITTED" || row.archivedAt || row.deliveredAt || !isLearningReportApprovedForDelivery(row.reportJson)) throw new Error("Report approval cannot be revoked");
    await tx.finalReport.update({ where: { id: row.id }, data: { reportJson: withoutApproval(row.reportJson) as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: auditData(input.actor, "REVOKE_DELIVERY_APPROVAL", "FinalReport", row.id) });
  });
}

export async function deliverApprovedLearningReport(input: {
  kind: LearningReportKind;
  reportId: string;
  actor: DeliveryActor;
  channel?: string;
  note?: string;
  now?: Date;
  approvalVersion?: number;
}) {
  const now = input.now ?? new Date();
  const channel = String(input.channel || "WECHAT").trim().toUpperCase().slice(0, 40) || "WECHAT";
  const note = String(input.note || "").trim().slice(0, 500);
  return prisma.$transaction(async (tx) => {
    if (input.kind === "MIDTERM") {
      const row = await tx.midtermReport.findUnique({ where: { id: input.reportId }, select: { id: true, status: true, archivedAt: true, reportJson: true } });
      const approval = learningReportDeliveryApproval(row?.reportJson);
      const meta = learningReportMeta(row?.reportJson);
      if (!row || row.status !== "SUBMITTED" || row.archivedAt || meta.lockedAfterForwarded || !approval.approvedAt) throw new Error("Only an approved, undelivered report can be sent");
      if (input.approvalVersion && Date.parse(approval.approvedAt) !== input.approvalVersion) throw new Error("Report approval has changed; please refresh before sending");
      const body = record(row.reportJson);
      await tx.midtermReport.update({
        where: { id: row.id },
        data: { reportJson: { ...body, _meta: { ...meta, forwardedAt: now.toISOString(), forwardedByUserId: input.actor.id, forwardedByName: input.actor.name || input.actor.email || "-", forwardChannel: channel, forwardNote: note, lockedAfterForwarded: true } } as Prisma.InputJsonValue },
      });
      await tx.auditLog.create({ data: auditData(input.actor, "DELIVER", "MidtermReport", row.id, { channel, approvedAt: approval.approvedAt }) });
      return { deliveredAt: now.toISOString() };
    }

    const row = await tx.finalReport.findUnique({ where: { id: input.reportId }, select: { id: true, status: true, archivedAt: true, deliveredAt: true, forwardedAt: true, reportJson: true } });
    const approval = learningReportDeliveryApproval(row?.reportJson);
    if (!row || row.status !== "SUBMITTED" || row.archivedAt || row.deliveredAt || !approval.approvedAt) throw new Error("Only an approved, undelivered report can be sent");
    if (input.approvalVersion && Date.parse(approval.approvedAt) !== input.approvalVersion) throw new Error("Report approval has changed; please refresh before sending");
    const body = record(row.reportJson);
    const meta = learningReportMeta(row.reportJson);
    await tx.finalReport.update({
      where: { id: row.id },
      data: {
        status: "FORWARDED",
        forwardedAt: row.forwardedAt ?? now,
        deliveredAt: now,
        deliveredByUserId: input.actor.id,
        deliveryChannel: channel,
        reportJson: { ...body, _meta: { ...meta, forwardedByUserId: input.actor.id, forwardedByName: input.actor.name || input.actor.email || "-", deliveryNote: note } } as Prisma.InputJsonValue,
      },
    });
    await tx.auditLog.create({ data: auditData(input.actor, "DELIVER", "FinalReport", row.id, { channel, approvedAt: approval.approvedAt }) });
    return { deliveredAt: now.toISOString() };
  });
}
