import { prisma } from "@/lib/prisma";
import { TeachingLanguage } from "@prisma/client";
import { getLang, t } from "@/lib/i18n";
import { shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";
import TeacherCreateForm from "../../_components/TeacherCreateForm";
import OneOnOneTemplateForm from "../../_components/OneOnOneTemplateForm";
import NoticeBanner from "../../_components/NoticeBanner";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import CreateAndBindTeacherUserFormClient from "./CreateAndBindTeacherUserFormClient";
import UnbindTeacherUserButtonClient from "./UnbindTeacherUserButtonClient";
import DeleteTemplateButtonClient from "./DeleteTemplateButtonClient";
import GenerateSessionsButtonClient from "./GenerateSessionsButtonClient";
import DeleteTeacherNavigateClient from "./DeleteTeacherNavigateClient";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
} from "../../_components/workbenchStyles";

const WEEKDAYS = [
  "Sun / 日",
  "Mon / 一",
  "Tue / 二",
  "Wed / 三",
  "Thu / 四",
  "Fri / 五",
  "Sat / 六",
];

function parseHHMM(s: string) {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function fmtHHMM(min: number) {
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseDateOnly(s: string) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function teacherSummaryCardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 6,
    alignContent: "start",
  } as const;
}

function teacherSectionLinkStyle(background: string, border: string) {
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

type Occurrence = {
  templateId: string;
  classId: string;
  studentId: string;
  startAt: Date;
  endAt: Date;
};

async function computeGenerationPlan(teacherId: string, startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || start > end) {
    return { occurrences: [] as Occurrence[], conflicts: [] as any[], toCreate: [] as Occurrence[] };
  }

  const templates = await prisma.teacherOneOnOneTemplate.findMany({
    where: { teacherId },
    include: {
      student: true,
      class: { include: { course: true, subject: true, level: true, campus: true, room: true } },
    },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
  });

  const occurrences: Occurrence[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const weekday = d.getDay();
    for (const t of templates) {
      if (t.weekday !== weekday) continue;
      const startAt = new Date(d);
      startAt.setHours(0, 0, 0, 0);
      startAt.setMinutes(t.startMin);
      const endAt = new Date(startAt.getTime() + t.durationMin * 60000);
      occurrences.push({
        templateId: t.id,
        classId: t.classId,
        studentId: t.studentId,
        startAt,
        endAt,
      });
    }
  }

  const rangeStart = new Date(start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(end);
  rangeEnd.setHours(23, 59, 59, 999);

  const teacherSessions = await prisma.session.findMany({
    where: {
      startAt: { lte: rangeEnd },
      endAt: { gte: rangeStart },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
    },
    include: {
      attendances: {
        select: {
          studentId: true,
          status: true,
          excusedCharge: true,
          deductedMinutes: true,
          deductedCount: true,
        },
      },
      class: { select: { roomId: true, capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
    },
  });

  const roomIds = Array.from(new Set(templates.map((t) => t.class.roomId).filter(Boolean))) as string[];
  const roomSessions = roomIds.length
    ? await prisma.session.findMany({
        where: {
          startAt: { lte: rangeEnd },
          endAt: { gte: rangeStart },
          class: { roomId: { in: roomIds } },
        },
        include: { class: true },
      })
    : [];

  const appts = await prisma.appointment.findMany({
    where: {
      teacherId,
      startAt: { lte: rangeEnd },
      endAt: { gte: rangeStart },
    },
  });

  const conflicts: any[] = [];
  const toCreate: Occurrence[] = [];

  for (const occ of occurrences) {
    const dup = teacherSessions.find(
      (s) =>
        s.classId === occ.classId &&
        s.startAt.getTime() === occ.startAt.getTime() &&
        s.endAt.getTime() === occ.endAt.getTime() &&
        (s.studentId ?? null) === (occ.studentId ?? null)
    );
    if (dup) {
      conflicts.push({ occ, reason: "Duplicate session", existing: dup });
      continue;
    }

    const teacherConflict = teacherSessions.find(
      (s) => overlaps(occ.startAt, occ.endAt, s.startAt, s.endAt) && !shouldIgnoreTeacherConflictSession(s, occ.studentId)
    );
    if (teacherConflict) {
      conflicts.push({ occ, reason: "Teacher conflict", existing: teacherConflict });
      continue;
    }

    const roomId = templates.find((t) => t.id === occ.templateId)?.class.roomId;
    if (roomId) {
      const roomConflict = roomSessions.find(
        (s) => s.class.roomId === roomId && overlaps(occ.startAt, occ.endAt, s.startAt, s.endAt)
      );
      if (roomConflict) {
        conflicts.push({ occ, reason: "Room conflict", existing: roomConflict });
        continue;
      }
    }

    const apptConflict = appts.find((a) => overlaps(occ.startAt, occ.endAt, a.startAt, a.endAt));
    if (apptConflict) {
      conflicts.push({ occ, reason: "Appointment conflict", existing: apptConflict });
      continue;
    }

    toCreate.push(occ);
  }

  return { occurrences, conflicts, toCreate, templates };
}

export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    msg?: string;
    err?: string;
    startDate?: string;
    endDate?: string;
    preview?: string;
  }>;
}) {
  const lang = await getLang();
  const { id: teacherId } = await params;
  const sp = await searchParams;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: true },
  });
  if (!teacher) {
    return (
      <div>
        <h2>{t(lang, "Teacher Not Found", "老师不存在")}</h2>
        <a href="/admin/teachers">← {t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const [courses, subjects, levels, students, campuses, rooms, templates, linkedUser] = await Promise.all([
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ include: { subject: { include: { course: true } } }, orderBy: [{ subjectId: "asc" }, { name: "asc" }] }),
    prisma.student.findMany({ orderBy: { name: "asc" } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.teacherOneOnOneTemplate.findMany({
      where: { teacherId },
      include: { student: true, class: { include: { course: true, subject: true, level: true, campus: true, room: true } } },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    }),
    prisma.user.findFirst({
      where: { teacherId },
      select: { id: true, email: true, name: true, role: true },
    }),
  ]);

  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const startDate = sp?.startDate ?? "";
  const endDate = sp?.endDate ?? "";
  const preview = sp?.preview === "1";

  const plan = preview && startDate && endDate ? await computeGenerationPlan(teacherId, startDate, endDate) : null;
  const teacherFocusTitle = plan
    ? plan.toCreate.length > 0
      ? t(lang, "Preview looks ready to generate sessions", "当前预览结果可继续生成课次")
      : t(lang, "Preview found only conflicts or no sessions", "当前预览只有冲突或没有可生成课次")
    : templates.length === 0
      ? t(lang, "Set up templates before generation", "先补一对一模版，再生成课次")
      : linkedUser
        ? t(lang, "Teacher profile is mostly ready", "老师档案当前已基本就绪")
        : t(lang, "Teacher account link is the next likely step", "下一步大概率先做老师账号绑定");
  const teacherFocusDetail = plan
    ? t(lang, `${plan.toCreate.length} session(s) can be created and ${plan.conflicts.length} conflict(s) will be skipped.`, `可生成 ${plan.toCreate.length} 节课，冲突 ${plan.conflicts.length} 条会被跳过。`)
    : templates.length === 0
      ? t(lang, "Without templates, the generation area below is only a shell. Start by building the teacher's weekly teaching pattern.", "如果没有模版，下方生成区基本还用不起来；先把老师的固定教学节奏建起来。")
      : linkedUser
        ? t(lang, "The main next steps are usually template upkeep, availability edits, or session generation preview.", "接下来更常见的动作是维护模版、调整 availability 或做课次生成预览。")
        : t(lang, "The profile exists, but login linkage is still missing if this teacher needs direct system access.", "老师资料已经建好，但如果老师需要直接登录系统，账号绑定仍然缺一步。");
  const teacherSummaryCards = [
    {
      title: t(lang, "Current focus", "当前建议起点"),
      value: teacherFocusTitle,
      detail: teacherFocusDetail,
      background: plan ? "#eff6ff" : linkedUser ? "#f0fdf4" : "#fff7ed",
      border: plan ? "#bfdbfe" : linkedUser ? "#86efac" : "#fdba74",
    },
    {
      title: t(lang, "Template coverage", "模版情况"),
      value: t(lang, `${templates.length} template row(s)`, `${templates.length} 条模版`),
      detail: t(lang, `${templates.length > 0 ? "Ready for preview and generation." : "Templates still missing."}`, templates.length > 0 ? "已经可以做预览和生成。" : "当前还没有模版。"),
      background: templates.length > 0 ? "#f0fdf4" : "#fff7ed",
      border: templates.length > 0 ? "#86efac" : "#fdba74",
    },
    {
      title: t(lang, "Account link", "账号绑定"),
      value: linkedUser ? t(lang, "Linked", "已绑定") : t(lang, "Not linked", "未绑定"),
      detail: linkedUser
        ? `${linkedUser.name} (${linkedUser.email})`
        : t(lang, "Create or rebind when this teacher needs login access.", "只有老师需要登录系统时，再创建或重绑账号。"),
      background: linkedUser ? "#eff6ff" : "#f8fafc",
      border: linkedUser ? "#bfdbfe" : "#dbe4f0",
    },
  ];
  const teacherSectionLinks = [
    {
      href: "#teacher-profile-edit",
      label: t(lang, "Profile edit", "资料编辑"),
      detail: t(lang, "Basic teacher profile and delete action", "老师基础资料和删除入口"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#teacher-account-link",
      label: t(lang, "Account link", "账号绑定"),
      detail: linkedUser ? t(lang, "Current account already linked", "当前账号已绑定") : t(lang, "Create or rebind login access", "创建或重绑登录账号"),
      background: linkedUser ? "#eff6ff" : "#ffffff",
      border: linkedUser ? "#bfdbfe" : "#dbe4f0",
    },
    {
      href: "#teacher-templates",
      label: t(lang, "1-1 templates", "一对一模版"),
      detail: t(lang, `${templates.length} row(s)`, `${templates.length} 条模版`),
      background: templates.length > 0 ? "#f0fdf4" : "#ffffff",
      border: templates.length > 0 ? "#86efac" : "#dbe4f0",
    },
    {
      href: "#teacher-generate",
      label: t(lang, "Generate sessions", "生成课次"),
      detail: t(lang, "Preview conflicts before creating sessions", "先预览冲突，再生成课次"),
      background: plan ? "#eff6ff" : "#ffffff",
      border: plan ? "#bfdbfe" : "#dbe4f0",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.4 }}>
            {t(lang, "Teacher Workspace", "老师工作台")}
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Teacher Detail", "老师详情")}</h2>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {teacher.name} <span style={{ color: "#94a3b8" }}>(TCH-{teacher.id.slice(0, 4)}…{teacher.id.slice(-4)})</span>
          </div>
          <div style={{ color: "#475569", fontSize: 14 }}>
            {t(lang, "Use this page to maintain the profile, bind login access, keep 1-1 templates healthy, and preview session generation before writing real sessions.", "这个页面用来维护老师资料、绑定登录账号、维护一对一模版，以及在真正生成课次前先做预览。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <a href="/admin/teachers">{t(lang, "Back to teachers", "返回老师列表")}</a>
          <a href={`/admin/teachers/${teacherId}/availability`}>{t(lang, "Availability", "可用时间")}</a>
          <a href={`/admin/teachers/${teacherId}/calendar`}>{t(lang, "Month Calendar", "月表")}</a>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {teacherSummaryCards.map((card) => (
          <div key={card.title} style={teacherSummaryCardStyle(card.background, card.border)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{card.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{card.value}</div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{card.detail}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 12,
          zIndex: 5,
          display: "grid",
          gap: 12,
          background: "#ffffffee",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Teacher work map", "老师工作地图")}</div>
            <div style={{ color: "#475569", fontSize: 13 }}>
              {t(lang, "Use this strip to jump between profile, account, templates, and generation instead of rescanning the whole page.", "通过这条导航在资料、账号、模版和生成区之间快速切换，不用每次重新扫整页。")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/admin/teachers/${teacherId}/availability`}>{t(lang, "Open availability", "打开可用时间")}</a>
            <a href={`/admin/teachers/${teacherId}/calendar`}>{t(lang, "Open month calendar", "打开月表")}</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {teacherSectionLinks.map((item) => (
            <a key={item.href} href={item.href} style={teacherSectionLinkStyle(item.background, item.border)}>
              <div style={{ fontWeight: 700 }}>{item.label}</div>
              <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{item.detail}</div>
            </a>
          ))}
        </div>
      </section>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div id="teacher-profile-edit">
      <h3>{t(lang, "Edit Teacher", "编辑老师")}</h3>
      <p>
        <a href={`/admin/teachers/${teacherId}/card`} target="_blank" rel="noreferrer">
          {t(lang, "Generate Teacher Card", "生成老师名片")}
        </a>
      </p>
      <div style={{ marginBottom: 16 }}>
        <TeacherCreateForm
          teacherId={teacherId}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
          labels={{
            teacherName: t(lang, "Teacher name", "老师姓名"),
            nationality: t(lang, "Nationality", "国籍"),
            almaMater: t(lang, "Alma Mater", "毕业学校"),
            almaMaterRule: t(
              lang,
              "Alma Mater rule: you can input multiple schools separated by commas. They will be displayed one per line.",
              "毕业学校规则：可填写多个学校，用逗号分隔；展示时会按竖排逐行显示。"
            ),
            teacherIntro: t(lang, "Teacher Intro", "老师介绍"),
            subjectsMulti: t(lang, "Subject (multi-select)", "教授科目（多选）"),
            subjectSearch: t(lang, "Search subject", "搜索科目"),
            subjectCourseFilter: t(lang, "Filter by course", "按课程筛选"),
            allCourses: t(lang, "All courses", "全部课程"),
            noSubjects: t(lang, "No subjects", "无科目"),
            yearsExp: t(lang, "Years Experience", "教学经验(年)"),
            teachingLanguage: t(lang, "Teaching Language", "教学语言"),
            chinese: t(lang, "Chinese", "中文"),
            english: t(lang, "English", "英文"),
            bilingual: t(lang, "Bilingual", "双语"),
            otherLang: t(lang, "Other", "其他"),
            otherLangInput: t(lang, "Input language manually", "手动输入语言"),
            offlineTeaching: t(lang, "Offline Teaching", "线下授课"),
            offlineShanghai: t(lang, "Shanghai", "上海线下"),
            offlineSingapore: t(lang, "Singapore", "新加坡线下"),
            add: t(lang, "Save", "保存"),
          }}
          initial={{
            name: teacher.name,
            nationality: teacher.nationality ?? "",
            almaMater: teacher.almaMater ?? "",
            intro: teacher.intro ?? "",
            yearsExperience: teacher.yearsExperience ?? null,
            teachingLanguage: teacher.teachingLanguage ?? "",
            teachingLanguageOther: teacher.teachingLanguageOther ?? "",
            subjectIds: teacher.subjects.map((s) => s.id),
            offlineShanghai: teacher.offlineShanghai ?? false,
            offlineSingapore: teacher.offlineSingapore ?? false,
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <DeleteTeacherNavigateClient
          teacherId={teacherId}
          to="/admin/teachers"
          label={t(lang, "Delete Teacher", "删除老师")}
          confirmMessage={t(lang, "Delete teacher? This also deletes availability/classes/appointments.", "删除老师？将删除可用时间/班级/预约。")}
        />
      </div>
      </div>

      <div id="teacher-account-link">
      <h3>{t(lang, "Teacher Account Link", "老师账号绑定")}</h3>
      <div style={{ marginBottom: 8, color: "#666" }}>
        {linkedUser
          ? `${t(lang, "Linked account", "已绑定账号")}: ${linkedUser.name} (${linkedUser.email}) [${linkedUser.role}]`
          : t(lang, "No linked account.", "当前未绑定账号。")}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{t(lang, "Create and Bind New Account", "新建账号并绑定")}</div>
      <CreateAndBindTeacherUserFormClient
        teacherId={teacherId}
        defaultName={teacher.name}
        labels={{
          loginEmail: t(lang, "Login Email", "登录邮箱"),
          teacherName: t(lang, "Teacher Name", "老师姓名"),
          initialPassword: t(lang, "Initial Password (new account only)", "初始密码（仅新建账号时使用）"),
          passwordHint: t(
            lang,
            "If this email already exists from a previously unlinked teacher account, the existing password will be kept.",
            "如果这个邮箱来自之前解绑过的老师账号，系统会保留原密码，不会覆盖。"
          ),
          rebindingHint: t(
            lang,
            "Existing unlinked teacher/admin emails will be rebound automatically. Emails already linked to another teacher will still be blocked.",
            "已存在但当前未绑定老师的老师/管理账号邮箱会自动重新绑定；若该邮箱已绑定其他老师，仍会拦截。"
          ),
          quickCopy: t(lang, "Quick Copy", "一键复制"),
          copy3: t(lang, "Copy 3 fields", "复制三项信息"),
          submit: t(lang, "Create + Link Teacher User", "创建并绑定老师账号"),
          errorPrefix: t(lang, "Error", "错误"),
        }}
      />
      {linkedUser ? (
        <UnbindTeacherUserButtonClient
          teacherId={teacherId}
          userId={linkedUser.id}
          label={t(lang, "Unlink Account", "解除绑定")}
          confirmMessage={t(lang, "Unlink this teacher account?", "解除该老师账号绑定？")}
        />
      ) : (
        <div style={{ marginBottom: 24 }} />
      )}
      </div>

      <div id="teacher-templates">
      <h3>{t(lang, "1-1 Templates", "一对一模版")}</h3>
      <OneOnOneTemplateForm
        teacherId={teacherId}
        courses={courses.map((c) => ({ id: c.id, name: c.name }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
        levels={levels.map((l) => ({
          id: l.id,
          name: l.name,
          subjectId: l.subjectId,
          courseName: l.subject.course.name,
          subjectName: l.subject.name,
        }))}
        students={students.map((s) => ({ id: s.id, name: s.name }))}
        campuses={campuses.map((c) => ({ id: c.id, name: c.name }))}
        rooms={rooms.map((r) => ({ id: r.id, name: r.name, campusName: r.campus.name, campusId: r.campusId }))}
        labels={{
          student: t(lang, "Student", "学生"),
          course: t(lang, "Course", "课程"),
          subject: t(lang, "Subject", "科目"),
          levelOptional: t(lang, "Level (optional)", "级别(可选)"),
          campus: t(lang, "Campus", "校区"),
          roomOptional: t(lang, "Room (optional)", "教室(可选)"),
          weekday: t(lang, "Weekday", "星期"),
          startTime: t(lang, "Start", "开始"),
          durationMin: t(lang, "Duration (min)", "时长(分钟)"),
          add: t(lang, "Add Template", "新增模版"),
          none: t(lang, "(none)", "(无)"),
        }}
        weekdays={WEEKDAYS}
      />

      <div style={{ marginTop: 12 }}>
        {templates.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No templates yet.", "暂无模版")}</div>
        ) : (
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Weekday", "星期")}</th>
                <th align="left">{t(lang, "Time", "时间")}</th>
                <th align="left">{t(lang, "Duration", "时长")}</th>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Course", "课程")}</th>
                <th align="left">{t(lang, "Campus", "校区")}</th>
                <th align="left">{t(lang, "Room", "教室")}</th>
                <th align="left">{t(lang, "Class", "班级")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{WEEKDAYS[tpl.weekday] ?? tpl.weekday}</td>
                  <td>{fmtHHMM(tpl.startMin)}</td>
                  <td>{tpl.durationMin} min</td>
                  <td>{tpl.student.name}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={tpl.class.capacity} compact />
                      <span>
                        {tpl.class.course.name} / {tpl.class.subject?.name ?? "-"} / {tpl.class.level?.name ?? "-"}
                      </span>
                    </div>
                  </td>
                  <td>{tpl.class.campus.name}</td>
                  <td>{tpl.class.room?.name ?? "-"}</td>
                  <td>
                    <a href={`/admin/classes/${tpl.classId}/sessions`}>{t(lang, "Sessions", "课次")}</a>
                  </td>
                  <td>
                    <DeleteTemplateButtonClient
                      teacherId={teacherId}
                      templateId={tpl.id}
                      label={t(lang, "Delete", "删除")}
                      confirmMessage={t(lang, "Delete this template?", "删除该模版？")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

      <div id="teacher-generate">
      <h3 style={{ marginTop: 24 }}>{t(lang, "Generate Sessions", "批量生成课次")}</h3>
      <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="preview" value="1" />
        <label>
          {t(lang, "Start", "开始")}:
          <input name="startDate" type="date" defaultValue={startDate} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "End", "结束")}:
          <input name="endDate" type="date" defaultValue={endDate} style={{ marginLeft: 6 }} />
        </label>
        <button type="submit">{t(lang, "Preview", "预览")}</button>
      </form>

      {plan && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <b>{t(lang, "Preview", "预览")}:</b> {plan.occurrences.length} {t(lang, "sessions", "节课")}.{" "}
            {t(lang, "Conflicts", "冲突")} {plan.conflicts.length}. {t(lang, "Will create", "将创建")} {plan.toCreate.length}.
          </div>
          {plan.conflicts.length > 0 && (
            <div style={{ padding: 10, border: "1px solid #f2c9a6", background: "#fff7ed", marginBottom: 10 }}>
              <b>{t(lang, "Conflicts (will be skipped)", "冲突（将跳过）")}:</b>
              <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", marginTop: 6 }}>
                <thead>
                  <tr style={{ background: "#faf0e6" }}>
                    <th align="left">{t(lang, "Reason", "原因")}</th>
                    <th align="left">{t(lang, "Time", "时间")}</th>
                    <th align="left">{t(lang, "Student", "学生")}</th>
                    <th align="left">{t(lang, "Course", "课程")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.conflicts.map((c, i) => {
                    const tpl = plan.templates?.find((t) => t.id === c.occ.templateId);
                    return (
                      <tr key={`${c.reason}-${i}`} style={{ borderTop: "1px solid #f3e2d1" }}>
                        <td>{c.reason}</td>
                        <td>
                          {formatBusinessDateTime(new Date(c.occ.startAt))} -{" "}
                          {formatBusinessTimeOnly(new Date(c.occ.endAt))}
                        </td>
                        <td>{tpl?.student.name ?? "-"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <ClassTypeBadge capacity={tpl?.class.capacity} compact />
                            <span>
                              {tpl?.class.course.name ?? "-"} / {tpl?.class.subject?.name ?? "-"} / {tpl?.class.level?.name ?? "-"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <GenerateSessionsButtonClient
            teacherId={teacherId}
            startDate={startDate}
            endDate={endDate}
            label={t(lang, "Generate", "生成")}
            confirmMessage={t(lang, "Generate sessions? Conflicts will be skipped.", "生成课次？冲突将跳过。")}
          />
        </div>
      )}
      </div>
    </div>
  );
}


