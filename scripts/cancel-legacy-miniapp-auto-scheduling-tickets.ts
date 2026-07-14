import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";

const ticketNumbers = [
  "20260714-001",
  "20260713-008",
  "20260713-007",
  "20260713-003",
  "20260713-002",
] as const;

const apply = process.argv.includes("--apply");

async function main() {
  const actor = await prisma.user.findUnique({
    where: { email: "zhaohongwei0880@gmail.com" },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!actor || actor.role !== "ADMIN") throw new Error("Cancellation actor is not an admin account");

  const tickets = await prisma.ticket.findMany({
    where: { ticketNo: { in: [...ticketNumbers] } },
    select: {
      id: true,
      ticketNo: true,
      studentName: true,
      source: true,
      type: true,
      status: true,
      systemUpdated: true,
      finalSchedule: true,
      completedAt: true,
      isArchived: true,
      risksNotes: true,
    },
    orderBy: { ticketNo: "desc" },
  });
  if (tickets.length !== ticketNumbers.length) throw new Error(`Expected ${ticketNumbers.length} tickets, found ${tickets.length}`);
  const alreadyApplied = tickets.every((ticket) =>
    ticket.status === "Cancelled" &&
    ticket.systemUpdated === "Y" &&
    !ticket.finalSchedule &&
    !ticket.completedAt &&
    !ticket.isArchived
  );
  if (alreadyApplied) {
    const auditCount = await prisma.auditLog.count({
      where: {
        action: "CANCEL_LEGACY_MINIAPP_AUTO_CREATED_SCHEDULING_TICKET",
        entityId: { in: tickets.map((row) => row.id) },
      },
    });
    if (auditCount !== ticketNumbers.length) throw new Error("Tickets are cancelled but cancellation audit is incomplete");
    console.log(JSON.stringify({ mode: "already-applied", count: tickets.length, auditCount }, null, 2));
    return;
  }
  for (const ticket of tickets) {
    if (
      ticket.source !== "员工小程序" ||
      !["新排课", "补课加课"].includes(ticket.type) ||
      ticket.status !== "Need Info" ||
      ticket.systemUpdated !== "N" ||
      ticket.finalSchedule ||
      ticket.completedAt ||
      ticket.isArchived
    ) {
      throw new Error(`Ticket ${ticket.ticketNo} no longer matches the legacy auto-created signature`);
    }
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", count: tickets.length, tickets: tickets.map((row) => ({ ticketNo: row.ticketNo, studentName: row.studentName, type: row.type, status: row.status })) }, null, 2));
    return;
  }

  const now = new Date();
  const reason = "旧版员工小程序点击学生时自动误建，经 Zhao 确认取消；未产生排课结果。";
  await prisma.$transaction(async (tx) => {
    for (const ticket of tickets) {
      const log = `[${formatBusinessDateTime(now)}] ${actor.name || actor.email} · 取消误建工单\n${reason}`;
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "Cancelled",
          systemUpdated: "Y",
          nextAction: "误建工单已取消，无需继续跟进。",
          nextActionDue: null,
          lastUpdateAt: now,
          risksNotes: ticket.risksNotes ? `${ticket.risksNotes}\n\n${log}` : log,
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmail: actor.email.toLowerCase(),
          actorName: actor.name,
          actorRole: actor.role,
          module: "TICKETS",
          action: "CANCEL_LEGACY_MINIAPP_AUTO_CREATED_SCHEDULING_TICKET",
          entityType: "Ticket",
          entityId: ticket.id,
          meta: { ticketNo: ticket.ticketNo, studentName: ticket.studentName, previousStatus: ticket.status, newStatus: "Cancelled", reason },
        },
      });
    }
  });

  const verified = await prisma.ticket.findMany({
    where: { ticketNo: { in: [...ticketNumbers] } },
    select: { id: true, ticketNo: true, studentName: true, status: true, systemUpdated: true, finalSchedule: true, completedAt: true },
    orderBy: { ticketNo: "desc" },
  });
  const auditCount = await prisma.auditLog.count({
    where: {
      action: "CANCEL_LEGACY_MINIAPP_AUTO_CREATED_SCHEDULING_TICKET",
      entityId: { in: verified.map((row) => row.id) },
    },
  });
  if (verified.some((row) => row.status !== "Cancelled" || row.systemUpdated !== "Y" || row.finalSchedule || row.completedAt) || auditCount !== ticketNumbers.length) {
    throw new Error("Post-cancellation verification failed");
  }
  console.log(JSON.stringify({ mode: "applied", count: verified.length, auditCount, tickets: verified }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
