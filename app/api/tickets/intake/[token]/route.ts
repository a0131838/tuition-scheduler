import { prisma } from "@/lib/prisma";
import {
  allocateTicketNo,
  composeTicketSituation,
  normalizeTicketInt,
  normalizeTicketTypeValue,
  normalizeTicketString,
  parseDateLike,
  TICKET_CS_STATUS_OPTIONS,
  TICKET_MODE_OPTIONS,
  TICKET_OWNER_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_SOURCE_OPTIONS,
  TICKET_SYSTEM_UPDATED_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TICKET_VERSION_OPTIONS,
  ticketTypeAliases,
  validateTicketTypeRequirements,
} from "@/lib/tickets";
function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function validateByOptions(value: string | null, options: { value: string }[]) {
  if (!value) return null;
  return options.some((o) => o.value === value) ? value : null;
}

async function getValidToken(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true, label: true },
  });
  if (!row) return null;
  if (!row.isActive) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenRow = await getValidToken(token);
  if (!tokenRow) return bad("Intake link is invalid or expired", 403);

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

  const status = validateByOptions(normalizeTicketString(body.status, 60), TICKET_CS_STATUS_OPTIONS);
  const owner = validateByOptions(normalizeTicketString(body.owner, 20), TICKET_OWNER_OPTIONS);
  if (!status || !owner) {
    return bad("Status and owner are required / 状态与负责人必填");
  }

  const normalizedType = normalizeTicketTypeValue(type);
  const grade = normalizeTicketString(body.grade, 40);
  const course = normalizeTicketString(body.course, 120);
  const teacher = normalizeTicketString(body.teacher, 120);
  const durationMin = normalizeTicketInt(body.durationMin);
  const mode = validateByOptions(normalizeTicketString(body.mode, 40), TICKET_MODE_OPTIONS);
  const wechat = normalizeTicketString(body.wechat, 120);
  const requirementCheck = validateTicketTypeRequirements({
    type: normalizedType,
    grade,
    course,
    teacher,
    durationMin,
    mode,
    wechat,
  });
  if (requirementCheck.missingLabels.length > 0) {
    return bad(
      `Missing required fields for this ticket type / 该工单类型缺少必填字段: ${requirementCheck.missingLabels.join("、")}`
    );
  }

  const situationCurrent = normalizeTicketString(body.situationCurrent, 2000);
  const situationAction = normalizeTicketString(body.situationAction, 2000);
  const situationDeadlineRaw = normalizeTicketString(body.situationDeadline, 40);
  const situationDeadline = parseDateLike(body.situationDeadline);
  if (!situationCurrent || !situationAction || !situationDeadlineRaw || !situationDeadline) {
    return bad("S – Situation is incomplete / Situation三项必填");
  }
  const situationSummary = composeTicketSituation({
    currentIssue: situationCurrent,
    requiredAction: situationAction,
    latestDeadlineText: situationDeadlineRaw,
  });

  const force = String(body.forceDuplicate ?? "").trim() === "1";
  const dupeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const duplicates = await prisma.ticket.findMany({
    where: {
      studentName: { equals: studentName, mode: "insensitive" },
      type: { in: ticketTypeAliases(type) },
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
        grade,
        course,
        teacher,
        poc: normalizeTicketString(body.poc, 120),
        wechat,
        phone: null,
        parentAvailability: null,
        teacherAvailability: null,
        durationMin,
        mode,
        addressOrLink: normalizeTicketString(body.addressOrLink, 500),
        confirmDeadline: null,
        slaDue: parseDateLike(body.slaDue),
        status,
        owner,
        version,
        systemUpdated,
        finalSchedule: null,
        lastUpdateAt: parseDateLike(body.lastUpdateAt),
        summary: situationSummary,
        risksNotes: null,
        nextAction: situationAction,
        nextActionDue: situationDeadline,
        proof: normalizeTicketString(body.proof, 5000),
        createdByName: normalizeTicketString(tokenRow.label, 120) || normalizeTicketString(body.createdByName, 120),
      },
      select: { id: true, ticketNo: true },
    });
  });

  return Response.json({ ok: true, id: created.id, ticketNo: created.ticketNo }, { status: 201 });
}
