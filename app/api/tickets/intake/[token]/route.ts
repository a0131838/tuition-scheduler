import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import {
  allocateTicketNo,
  SCHEDULING_COORDINATION_TICKET_TYPE,
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
import {
  buildParentAvailabilityExpiresAt,
  buildParentAvailabilityPath,
  createParentAvailabilityToken,
} from "@/lib/parent-availability";
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

async function resolveOriginFromRequest(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  if (envBase) return envBase;

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
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
  const studentId = normalizeTicketString(body.studentId, 80);
  const linkedStudent = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, name: true },
      })
    : null;
  if (studentId && !linkedStudent) {
    return bad("Selected student could not be found / 选择的学生不存在");
  }
  if (normalizedType === SCHEDULING_COORDINATION_TICKET_TYPE && !linkedStudent) {
    return bad("Please confirm the student from the lookup before creating a scheduling coordination ticket / 请先从学生匹配列表确认学生后，再创建排课协调工单");
  }

  const shouldCreateParentAvailabilityLink =
    normalizedType === SCHEDULING_COORDINATION_TICKET_TYPE && Boolean(linkedStudent);

  const parentAvailabilityToken = shouldCreateParentAvailabilityLink ? createParentAvailabilityToken() : null;
  const parentAvailabilityExpiresAt = shouldCreateParentAvailabilityLink ? buildParentAvailabilityExpiresAt() : null;
  const parentAvailabilityPlaceholder = shouldCreateParentAvailabilityLink
    ? `Parent availability form sent. Waiting for parent submission. / 已发送家长时间填写链接，等待家长提交。`
    : null;

  const created = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    const ticket = await tx.ticket.create({
      data: {
        ticketNo,
        studentId: linkedStudent?.id ?? null,
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
        parentAvailability: parentAvailabilityPlaceholder,
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

    if (shouldCreateParentAvailabilityLink && linkedStudent && parentAvailabilityToken && parentAvailabilityExpiresAt) {
      await tx.parentAvailabilityRequest.create({
        data: {
          ticketId: ticket.id,
          studentId: linkedStudent.id,
          courseLabel: course,
          token: parentAvailabilityToken,
          expiresAt: parentAvailabilityExpiresAt,
        },
      });
    }

    return ticket;
  });

  const origin = await resolveOriginFromRequest(req);
  const parentAvailabilityUrl =
    shouldCreateParentAvailabilityLink && parentAvailabilityToken
      ? new URL(buildParentAvailabilityPath(parentAvailabilityToken), origin).toString()
      : null;

  return Response.json(
    {
      ok: true,
      id: created.id,
      ticketNo: created.ticketNo,
      parentAvailabilityUrl,
      parentAvailabilityExpiresAt: parentAvailabilityExpiresAt?.toISOString() ?? null,
    },
    { status: 201 }
  );
}
