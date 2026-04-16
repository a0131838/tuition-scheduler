import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import BookingLinkCreateForm from "./_components/BookingLinkCreateForm";
import SimpleModal from "../_components/SimpleModal";
import CopyTextButton from "../_components/CopyTextButton";
import NoticeBanner from "../_components/NoticeBanner";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
}

export default async function AdminBookingLinksPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string; msg?: string }>;
}) {
  const lang = await getLang();
  await requireAdmin();
  const sp = await searchParams;
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";

  const [students, teachers, links] = await Promise.all([
    prisma.student.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        packages: {
          where: { status: "ACTIVE" },
          select: { courseId: true, course: { select: { name: true } } },
        },
      },
    }),
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        subjectCourse: { select: { courseId: true, course: { select: { name: true } } } },
        subjects: { select: { courseId: true, course: { select: { name: true } } } },
      },
    }),
    prisma.studentBookingLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        student: { select: { name: true } },
        teachers: { include: { teacher: { select: { name: true } } } },
        _count: { select: { requests: true } },
      },
    }),
  ]);

  const studentOptions = students.map((student) => {
    const courseMap = new Map(student.packages.map((pkg) => [pkg.courseId, pkg.course.name]));
    return {
      id: student.id,
      name: student.name,
      courseIds: Array.from(courseMap.keys()),
      courseNames: Array.from(courseMap.values()),
    };
  });

  const teacherOptions = teachers.map((teacher) => {
    const courseMap = new Map<string, string>();
    if (teacher.subjectCourse) {
      courseMap.set(teacher.subjectCourse.courseId, teacher.subjectCourse.course.name);
    }
    for (const subject of teacher.subjects) {
      courseMap.set(subject.courseId, subject.course.name);
    }
    return {
      id: teacher.id,
      name: teacher.name,
      courseIds: Array.from(courseMap.keys()),
      courseNames: Array.from(courseMap.values()),
    };
  });

  const base = appBaseUrl();

  return (
    <div>
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>
            Booking Workspace / 约课链接工作台
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Student Booking Links", "学生选课链接")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(
              lang,
              "Create a booking link first, then return here to copy it or continue follow-up from the recent list.",
              "先创建家长可用时间链接，再回到最近链接列表继续复制、追踪和管理。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Recent links", "最近链接")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{links.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Students ready", "可创建学生")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{studentOptions.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Teacher pool", "老师候选池")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{teacherOptions.length}</div>
          </div>
        </div>
      </div>
      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={msg} /> : null}

      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #dbeafe",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#booking-links-actions">{t(lang, "Create link", "创建链接")}</a>
        <a href="#booking-links-list">{t(lang, "Recent links", "最近链接")}</a>
      </div>

      <div id="booking-links-actions" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, scrollMarginTop: 96 }}>
        <SimpleModal buttonLabel={t(lang, "Create Link", "创建链接")} title={t(lang, "Create Link", "创建链接")} closeOnSubmit>
          <BookingLinkCreateForm
            students={studentOptions}
            teachers={teacherOptions}
            labels={{
              student: t(lang, "Student", "学生"),
              startDate: t(lang, "Start Date", "开始日期"),
              endDate: t(lang, "End Date", "结束日期"),
              durationMin: t(lang, "Duration (min)", "时长(分钟)"),
              slotStepMin: t(lang, "Slot Step (min)", "起始间隔(分钟)"),
              expiresAt: t(lang, "Expires At", "失效时间"),
              titleOptional: t(lang, "Title (optional)", "标题(可选)"),
              noteOptional: t(lang, "Note (optional)", "备注(可选)"),
              teacherHint: t(
                lang,
                "Teachers (matching student's purchased courses and available in selected date range)",
                "老师（仅显示可教该学生已购课程且在所选日期范围有可用时间）"
              ),
              studentCoursePrefix: t(lang, "Student purchased courses", "学生已购课程"),
              none: t(lang, "None", "无"),
              pickStudentFirst: t(lang, "Please select student first, then matching teachers will appear", "先选择学生，再显示匹配老师"),
              searchTeacherOrCourse: t(lang, "Search teacher or course", "搜索老师或课程"),
              selectFiltered: t(lang, "Select filtered", "勾选当前筛选"),
              clearFiltered: t(lang, "Clear filtered", "取消当前筛选"),
              candidateStats: t(lang, "Available", "可选"),
              matchedStats: t(lang, "Matched", "匹配"),
              selectedStats: t(lang, "Selected", "已选"),
              timeMatchedStats: t(lang, "Time matched", "时间匹配"),
              pleasePickStudent: t(lang, "Please select student first", "请先选择学生"),
              noMatchedTeachers: t(lang, "No matched teachers", "没有可匹配老师"),
              noTeacherAvailableInWindow: t(
                lang,
                "No teacher available in selected schedule window",
                "当前排课时间范围内无可用老师"
              ),
              loadingTeachers: t(lang, "Loading matching teachers...", "正在加载可匹配老师..."),
              createLink: t(lang, "Create Link", "创建链接"),
            }}
          />
        </SimpleModal>
      </div>

      <h3 id="booking-links-list" style={{ scrollMarginTop: 96 }}>{t(lang, "Recent Links", "最近链接")}</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Created", "创建时间")}</th>
            <th align="left">{t(lang, "Student", "学生")}</th>
            <th align="left">{t(lang, "Window", "范围")}</th>
            <th align="left">{t(lang, "Teachers", "老师")}</th>
            <th align="left">{t(lang, "Requests", "请求数")}</th>
            <th align="left">{t(lang, "Link", "链接")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => {
            const url = `${base}/booking/${l.token}`;
            return (
              <tr key={l.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{formatBusinessDateTime(new Date(l.createdAt))}</td>
                <td>{l.student.name}</td>
                <td>
                  {formatBusinessDateOnly(new Date(l.startDate))} - {formatBusinessDateOnly(new Date(l.endDate))}
                  {!l.isActive ? <span style={{ color: "#b00" }}> ({t(lang, "Inactive", "已停用")})</span> : null}
                </td>
                <td>{l.teachers.map((x) => x.teacher.name).join(", ")}</td>
                <td>{l._count.requests}</td>
                <td style={{ maxWidth: 300, wordBreak: "break-all" }}>
                  <a href={`/booking/${l.token}`} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={`/admin/booking-links/${l.id}`}>{t(lang, "Manage", "管理")}</a>
                    <CopyTextButton
                      text={url}
                      label={t(lang, "Copy Link", "复制链接")}
                      copiedLabel={t(lang, "Copied", "已复制")}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
          {links.length === 0 ? (
            <tr>
              <td colSpan={7}>{t(lang, "No links yet.", "暂无链接")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
