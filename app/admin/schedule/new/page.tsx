import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../../_components/NoticeBanner";
import NewSingleSessionClient from "./_components/NewSingleSessionClient";
import NewSingleAppointmentClient from "./_components/NewSingleAppointmentClient";

// Server actions were removed; this page uses client fetch + /api routes.

export default async function NewSinglePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; err?: string; classId?: string }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const tab = sp?.tab ?? "session";
  const err = sp?.err ?? "";
  const preferredClassId = sp?.classId ?? "";

  const [classes, teachers, students] = await Promise.all([
    prisma.class.findMany({
      include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
      orderBy: { id: "asc" },
    }),
    prisma.teacher.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ orderBy: { name: "asc" } }),
  ]);

  const defaultClassId =
    preferredClassId && classes.some((c) => c.id === preferredClassId)
      ? preferredClassId
      : classes[0]?.id ?? "";

  const tabSessionHref = preferredClassId
    ? `/admin/schedule/new?tab=session&classId=${encodeURIComponent(preferredClassId)}`
    : `/admin/schedule/new?tab=session`;

  const tabApptHref = preferredClassId
    ? `/admin/schedule/new?tab=appt&classId=${encodeURIComponent(preferredClassId)}`
    : `/admin/schedule/new?tab=appt`;

  return (
    <div>
      <h2>{t(lang, "New (Single)", "新建(单次)")}</h2>
      <p>
        <a href="/admin/schedule">→ {t(lang, "Back to Schedule", "返回课表")}</a>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Rejected", "已拒绝创建")} message={err} /> : null}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href={tabSessionHref}>{t(lang, "Create Session", "新建班课")}</a>
        <a href={tabApptHref}>{t(lang, "Create Appointment", "新建1对1")}</a>
      </div>

      {tab === "session" ? (
        <>
          <h3>{t(lang, "Create Session (Class Lesson)", "新建班课")}</h3>

          {classes.length === 0 ? (
            <div style={{ color: "#999", marginBottom: 16 }}>
              {t(lang, "No classes yet. Please create a class first in /admin/classes.", "暂无班级，请先到 /admin/classes 创建班级。")}
            </div>
          ) : (
            <NewSingleSessionClient
              classes={classes as any}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
              defaultClassId={defaultClassId}
              labels={{
                rejectedTitle: t(lang, "Rejected", "已拒绝创建"),
                errorTitle: t(lang, "Error", "错误"),
                classLabel: t(lang, "Class", "班级"),
                studentForOneOnOne: t(lang, "Student (for 1-on-1 only)", "学生(仅一对一)"),
                selectStudent: t(lang, "Select student", "选择学生"),
                start: t(lang, "Start", "开始"),
                durationMin: t(lang, "Duration (minutes)", "时长(分钟)"),
                create: t(lang, "Create (reject on conflict)", "创建(冲突则拒绝)"),
                ruleHint: t(
                  lang,
                  "Conflict rule: same teacher (session/appointment overlap) or same room (session overlap).",
                  "冲突规则: 同老师(课次/约课重叠)或同教室(课次重叠)。"
                ),
              }}
            />
          )}
        </>
      ) : (
        <>
          <h3>{t(lang, "Create Appointment (1-1)", "新建1对1预约")}</h3>
          <NewSingleAppointmentClient
            teachers={teachers.map((x) => ({ id: x.id, name: x.name }))}
            students={students.map((s) => ({ id: s.id, name: s.name }))}
            labels={{
              rejectedTitle: t(lang, "Rejected", "已拒绝创建"),
              teacher: t(lang, "Teacher", "老师"),
              student: t(lang, "Student", "学生"),
              searchStudent: t(lang, "Search student name", "搜索学生姓名"),
              start: t(lang, "Start", "开始"),
              durationMin: t(lang, "Duration (minutes)", "时长(分钟)"),
              create: t(lang, "Create (reject on conflict)", "创建(冲突则拒绝)"),
            }}
          />
        </>
      )}
    </div>
  );
}



