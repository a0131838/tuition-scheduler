import { prisma } from "@/lib/prisma";
import { getLang, type Lang } from "@/lib/i18n";

function parseMonth(s?: string) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function toDateRange(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const start = new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(parsed.year, parsed.month, 1, 0, 0, 0, 0);
  return { start, end };
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const sourceChannelId = url.searchParams.get("sourceChannelId") ?? "";
  const lang = await getLang();

  const range = toDateRange(month);
  if (!range) {
    return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  }

  const rows = await prisma.attendance.findMany({
    where: {
      updatedAt: { gte: range.start, lt: range.end },
      status: { not: "UNMARKED" },
      ...(sourceChannelId ? { student: { sourceChannelId } } : {}),
    },
    include: {
      student: { include: { sourceChannel: true, studentType: true } },
      session: {
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const header = [
    choose(lang, "Updated At", "更新时间"),
    choose(lang, "Student ID", "学生ID"),
    choose(lang, "Student Name", "学生姓名"),
    choose(lang, "Source Channel", "来源渠道"),
    choose(lang, "Student Type", "学生类型"),
    choose(lang, "Session Start", "课次开始"),
    choose(lang, "Session End", "课次结束"),
    choose(lang, "Course", "课程"),
    choose(lang, "Subject", "科目"),
    choose(lang, "Level", "级别"),
    choose(lang, "Teacher", "老师"),
    choose(lang, "Campus", "校区"),
    choose(lang, "Room", "教室"),
    choose(lang, "Status", "状态"),
    choose(lang, "Deducted Count", "扣次数"),
    choose(lang, "Deducted Minutes", "扣分钟"),
    choose(lang, "Excused Charge", "请假扣费"),
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.updatedAt).toISOString(),
        r.studentId,
        r.student?.name ?? "",
        r.student?.sourceChannel?.name ?? "",
        r.student?.studentType?.name ?? "",
        new Date(r.session.startAt).toISOString(),
        new Date(r.session.endAt).toISOString(),
        r.session.class.course.name,
        r.session.class.subject?.name ?? "",
        r.session.class.level?.name ?? "",
        r.session.class.teacher.name,
        r.session.class.campus.name,
        r.session.class.room?.name ?? "",
        r.status,
        r.deductedCount,
        r.deductedMinutes,
        r.excusedCharge ? "true" : "false",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = lines.join("\n");
  const baseName =
    lang === "EN" ? "monthly-hours" : lang === "ZH" ? "月度课时明细" : "monthly-hours_月度课时明细";
  const fileName = `${baseName}-${month}${sourceChannelId ? `-source-${sourceChannelId}` : ""}.csv`;
  const fileNameAscii = `monthly-hours-${month}${
    sourceChannelId ? `-source-${sourceChannelId}` : ""
  }.csv`.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
