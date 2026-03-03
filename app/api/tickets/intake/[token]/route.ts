import { prisma } from "@/lib/prisma";
import {
  allocateTicketNo,
  normalizeTicketInt,
  normalizeTicketString,
  parseDateLike,
  TICKET_MODE_OPTIONS,
  TICKET_OWNER_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_SOURCE_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_SYSTEM_UPDATED_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TICKET_VERSION_OPTIONS,
} from "@/lib/tickets";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function validateByOptions(value: string | null, options: { value: string }[]) {
  if (!value) return null;
  return options.some((o) => o.value === value) ? value : null;
}

async function ensureTokenOk(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true },
  });
  if (!row) return false;
  if (!row.isActive) return false;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!(await ensureTokenOk(token))) return bad("Intake link is invalid or expired", 403);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON body");
  }

  const studentName = normalizeTicketString(body.studentName, 120);
  if (!studentName) return bad("Student name is required / 学生姓名必填");

  const source = validateByOptions(normalizeTicketString(body.source, 60), TICKET_SOURCE_OPTIONS);
  const type = validateByOptions(normalizeTicketString(body.type, 60), TICKET_TYPE_OPTIONS);
  const priority = validateByOptions(normalizeTicketString(body.priority, 60), TICKET_PRIORITY_OPTIONS);
  if (!source || !type || !priority) {
    return bad("Invalid source/type/priority");
  }

  const force = String(body.forceDuplicate ?? "").trim() === "1";
  const dupeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const duplicates = await prisma.ticket.findMany({
    where: {
      studentName: { equals: studentName, mode: "insensitive" },
      type,
      createdAt: { gte: dupeSince },
      status: { not: "Cancelled" },
    },
    select: { ticketNo: true, status: true, createdAt: true, summary: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (!force && duplicates.length > 0) {
    return bad("Potential duplicate ticket detected", 409, {
      code: "DUPLICATE",
      duplicates: duplicates.map((d) => ({
        ticketNo: d.ticketNo,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        summary: d.summary ?? "",
      })),
    });
  }

  const mode = validateByOptions(normalizeTicketString(body.mode, 40), TICKET_MODE_OPTIONS);
  const status =
    validateByOptions(normalizeTicketString(body.status, 60), TICKET_STATUS_OPTIONS) ??
    "Need Info";
  const owner = validateByOptions(normalizeTicketString(body.owner, 20), TICKET_OWNER_OPTIONS);
  const version = validateByOptions(normalizeTicketString(body.version, 10), TICKET_VERSION_OPTIONS);
  const systemUpdated = validateByOptions(
    normalizeTicketString(body.systemUpdated, 5),
    TICKET_SYSTEM_UPDATED_OPTIONS
  );

  const created = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    return tx.ticket.create({
      data: {
        ticketNo,
        source,
        type,
        priority,
        studentName,
        grade: normalizeTicketString(body.grade, 40),
        course: normalizeTicketString(body.course, 120),
        teacher: normalizeTicketString(body.teacher, 120),
        poc: normalizeTicketString(body.poc, 120),
        wechat: normalizeTicketString(body.wechat, 120),
        phone: normalizeTicketString(body.phone, 60),
        parentAvailability: normalizeTicketString(body.parentAvailability, 500),
        teacherAvailability: normalizeTicketString(body.teacherAvailability, 500),
        durationMin: normalizeTicketInt(body.durationMin),
        mode,
        addressOrLink: normalizeTicketString(body.addressOrLink, 500),
        confirmDeadline: parseDateLike(body.confirmDeadline),
        slaDue: parseDateLike(body.slaDue),
        status,
        owner,
        version,
        systemUpdated,
        finalSchedule: normalizeTicketString(body.finalSchedule, 500),
        lastUpdateAt: parseDateLike(body.lastUpdateAt),
        summary: normalizeTicketString(body.summary, 2000),
        risksNotes: normalizeTicketString(body.risksNotes, 2000),
        nextAction: normalizeTicketString(body.nextAction, 2000),
        nextActionDue: parseDateLike(body.nextActionDue),
        proof: normalizeTicketString(body.proof, 500),
        createdByName: normalizeTicketString(body.createdByName, 120),
      },
      select: { id: true, ticketNo: true },
    });
  });

  return Response.json({ ok: true, id: created.id, ticketNo: created.ticketNo }, { status: 201 });
}

