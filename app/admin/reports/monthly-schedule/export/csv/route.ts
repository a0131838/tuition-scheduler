import { getLang } from "@/lib/i18n";
import { choose, csvEscape, loadMonthlyScheduleData } from "../../_lib";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const teacherId = url.searchParams.get("teacherId") ?? "";
  const campusId = url.searchParams.get("campusId") ?? "";
  const lang = await getLang();

  const data = await loadMonthlyScheduleData({ month, teacherId, campusId });
  if (!data) return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });

  const header = [
    choose(lang, "Date", "\u65e5\u671f"),
    choose(lang, "Start", "\u5f00\u59cb"),
    choose(lang, "End", "\u7ed3\u675f"),
    choose(lang, "Teacher", "\u8001\u5e08"),
    choose(lang, "Campus", "\u6821\u533a"),
    choose(lang, "Room", "\u6559\u5ba4"),
    choose(lang, "Course", "\u8bfe\u7a0b"),
    choose(lang, "Subject", "\u79d1\u76ee"),
    choose(lang, "Level", "\u7ea7\u522b"),
    choose(lang, "Students", "\u5b66\u751f"),
    choose(lang, "Class ID", "\u73ed\u7ea7ID"),
    choose(lang, "Session ID", "\u8bfe\u6b21ID"),
  ];

  const lines = [header.join(",")];
  for (const s of data.sessions) {
    const teacherName = s.teacher?.name ?? s.class.teacher.name;
    const students = s.class.enrollments.map((e) => e.student.name).filter(Boolean).join(" | ");
    const startAt = new Date(s.startAt);
    const endAt = new Date(s.endAt);
    lines.push(
      [
        `${startAt.getFullYear()}-${String(startAt.getMonth() + 1).padStart(2, "0")}-${String(startAt.getDate()).padStart(2, "0")}`,
        `${String(startAt.getHours()).padStart(2, "0")}:${String(startAt.getMinutes()).padStart(2, "0")}`,
        `${String(endAt.getHours()).padStart(2, "0")}:${String(endAt.getMinutes()).padStart(2, "0")}`,
        teacherName,
        s.class.campus.name,
        s.class.room?.name ?? "",
        s.class.course.name,
        s.class.subject?.name ?? "",
        s.class.level?.name ?? "",
        students,
        s.classId,
        s.id,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  // BOM makes Excel on Windows open UTF-8 CSV without mojibake.
  const csv = `\uFEFF${lines.join("\n")}`;
  const fileName = `monthly-schedule-${month}.csv`;
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
