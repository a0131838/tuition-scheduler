import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../../_components/NoticeBanner";
import NewSingleSessionClient from "./_components/NewSingleSessionClient";
import NewSingleAppointmentClient from "./_components/NewSingleAppointmentClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../_components/workbenchStyles";

function scheduleNewSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

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
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>{t(lang, "Single create desk", "单次新建工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "New (Single)", "新建(单次)")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Use this page for one-off class sessions and one-on-one appointments. Pick the right tab first so the form only shows what you need.",
              "这里用于单次新建班课和一对一预约。先选对页签，再填写对应表单，避免看见不相关字段。"
            )}
          </div>
          <div><a href="/admin/schedule">{t(lang, "Back to Schedule", "返回课表")}</a></div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Current tab", "当前页签")}</div>
            <div style={{ ...workbenchMetricValueStyle("amber"), fontSize: 18 }}>{tab === "session" ? t(lang, "Session", "班课") : t(lang, "Appointment", "预约")}</div>
          </div>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Classes", "班级数")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{classes.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Teachers", "老师数")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{teachers.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Students", "学生数")}</div>
            <div style={workbenchMetricValueStyle("slate")}>{students.length}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Single-create map", "单次新建地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Choose session vs appointment first, then fill the form below. If you came from a class page, the class is already preselected.", "先区分班课还是预约，再填写下方表单。如果你是从班级页进入，班级会自动预选。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#schedule-new-tabs" style={scheduleNewSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Tabs", "页签")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Switch create mode", "切换创建模式")}</span>
          </a>
          <a href="#schedule-new-form" style={scheduleNewSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "Form", "创建表单")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Fill only the active workflow", "只填写当前工作流需要的字段")}</span>
          </a>
        </div>
      </section>

      {err ? <NoticeBanner type="error" title={t(lang, "Rejected", "已拒绝创建")} message={err} /> : null}

      <div id="schedule-new-tabs" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href={tabSessionHref}>{t(lang, "Create Session", "新建班课")}</a>
        <a href={tabApptHref}>{t(lang, "Create Appointment", "新建1对1")}</a>
      </div>

      <div id="schedule-new-form">
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
    </div>
  );
}

