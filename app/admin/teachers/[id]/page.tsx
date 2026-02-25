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

  return (
    <div>
      <h2>{t(lang, "Teacher Detail", "老师详情")}</h2>
      <p style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a href="/admin/teachers">← {t(lang, "Back to Teachers", "返回老师列表")}</a>
        <span style={{ color: "#999" }}>(TCH-{teacher.id.slice(0, 4)}…{teacher.id.slice(-4)})</span>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

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
          initialPassword: t(lang, "Initial Password", "初始密码"),
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
                          {new Date(c.occ.startAt).toLocaleString()} -{" "}
                          {new Date(c.occ.endAt).toLocaleTimeString()}
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
  );
}






