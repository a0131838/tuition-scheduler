import { requireAdmin } from "@/lib/auth";
import { csvEscape, LEAD_INTENT_LEVELS, LEAD_SOURCE_TYPES, LEAD_STATUSES } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

function valid(value: string | null, allowed: string[]) {
  return value && allowed.includes(value) ? value : "";
}

export async function GET(req: Request) {
  const user = await requireAdmin();
  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = valid(url.searchParams.get("status"), LEAD_STATUSES);
  const sourceType = valid(url.searchParams.get("sourceType"), LEAD_SOURCE_TYPES);
  const owner = String(url.searchParams.get("owner") ?? "").trim();
  const intent = valid(url.searchParams.get("intent"), LEAD_INTENT_LEVELS);
  const focus = String(url.searchParams.get("focus") ?? "").trim();
  const archived = String(url.searchParams.get("archived") ?? "").trim() === "1";
  const effectiveOwner = focus === "mine" ? user.name : owner;
  const now = new Date();
  const rows = await prisma.lead.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { leadNo: { contains: q, mode: "insensitive" } },
              { studentName: { contains: q, mode: "insensitive" } },
              { parentName: { contains: q, mode: "insensitive" } },
              { parentWechat: { contains: q, mode: "insensitive" } },
              { parentPhone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(effectiveOwner ? { ownerName: effectiveOwner } : {}),
      ...(intent ? { intentLevel: intent } : {}),
      isArchived: archived,
      ...(focus === "overdue" ? { nextActionDue: { lt: now }, status: { notIn: ["Won", "Lost"] } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 2000,
  });
  const headers = [
    "Lead No",
    "Status",
    "Intent",
    "Source Type",
    "Source Platform",
    "Source Detail",
    "Parent Name",
    "Parent WeChat",
    "Parent Phone",
    "Student Name",
    "Grade",
    "School",
    "Preferred Course",
    "Needs",
    "Owner",
    "Next Action",
    "Next Action Due",
    "Latest Summary",
    "Converted Student ID",
    "Lost Reason",
    "Archived",
    "Archived At",
    "Archived By",
    "Created At",
    "Updated At",
  ];
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) =>
      [
        row.leadNo,
        row.status,
        row.intentLevel,
        row.sourceType,
        row.sourcePlatform,
        row.sourceDetail,
        row.parentName,
        row.parentWechat,
        row.parentPhone,
        row.studentName,
        row.grade,
        row.school,
        row.preferredCourse,
        row.needs,
        row.ownerName,
        row.nextAction,
        row.nextActionDue?.toISOString() ?? "",
        row.latestSummary,
        row.convertedStudentId,
        row.lostReason,
        row.isArchived ? "Yes" : "No",
        row.archivedAt?.toISOString() ?? "",
        row.archivedByName,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ].map(csvEscape).join(",")
    ),
  ];
  return new Response(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="resource-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
