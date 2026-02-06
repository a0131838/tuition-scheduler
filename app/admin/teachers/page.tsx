import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { TeachingLanguage } from "@prisma/client";
import { getLang, t } from "@/lib/i18n";
import { Fragment } from "react";
import SimpleModal from "../_components/SimpleModal";
import { redirect } from "next/navigation";
import TeacherCreateForm from "../_components/TeacherCreateForm";
import TeacherCardExportForm from "../_components/TeacherCardExportForm";
import TeacherFilterForm from "../_components/TeacherFilterForm";
import NoticeBanner from "../_components/NoticeBanner";

async function createTeacher(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const nationality = String(formData.get("nationality") ?? "").trim();
  const almaMater = String(formData.get("almaMater") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const yearsExperienceRaw = String(formData.get("yearsExperience") ?? "").trim();
  const teachingLanguageRaw = String(formData.get("teachingLanguage") ?? "").trim();
  const teachingLanguageOther = String(formData.get("teachingLanguageOther") ?? "").trim();
  const offlineShanghai = String(formData.get("offlineShanghai") ?? "") === "on";
  const offlineSingapore = String(formData.get("offlineSingapore") ?? "") === "on";
  const subjectIds = formData.getAll("subjectIds").map((v) => String(v)).filter(Boolean);

  if (!name) {
    redirect("/admin/teachers?err=Name+is+required");
  }

  let yearsExperience: number | null = null;
  if (yearsExperienceRaw) {
    const n = Number(yearsExperienceRaw);
    if (Number.isFinite(n) && n >= 0) yearsExperience = n;
  }

  const teachingLanguage =
    teachingLanguageRaw === "CHINESE" || teachingLanguageRaw === "ENGLISH" || teachingLanguageRaw === "BILINGUAL"
      ? (teachingLanguageRaw as TeachingLanguage)
      : null;
  if (teachingLanguageRaw === "OTHER" && !teachingLanguageOther) {
    redirect("/admin/teachers?err=Other+language+is+required");
  }

  await prisma.teacher.create({
    data: {
      name,
      nationality: nationality || null,
      almaMater: almaMater || null,
      intro: intro || null,
      yearsExperience,
      teachingLanguage,
      teachingLanguageOther: teachingLanguage ? null : teachingLanguageOther || null,
      offlineShanghai,
      offlineSingapore,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/admin/teachers");
  redirect("/admin/teachers?msg=Teacher+added");
}

async function deleteTeacher(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;

  await prisma.teacherAvailability.deleteMany({ where: { teacherId: id } });
  await prisma.teacherAvailabilityDate.deleteMany({ where: { teacherId: id } });
  await prisma.teacherOneOnOneTemplate.deleteMany({ where: { teacherId: id } });
  await prisma.appointment.deleteMany({ where: { teacherId: id } });
  const classes = await prisma.class.findMany({
    where: { teacherId: id },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);
  if (classIds.length > 0) {
    await prisma.enrollment.deleteMany({ where: { classId: { in: classIds } } });
    await prisma.attendance.deleteMany({ where: { session: { classId: { in: classIds } } } });
    await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
  }
  await prisma.class.deleteMany({ where: { teacherId: id } });
  await prisma.oneOnOneGroup.deleteMany({ where: { teacherId: id } });
  await prisma.teacher.delete({ where: { id } });

  revalidatePath("/admin/teachers");
}

function languageLabel(lang: string, v?: string | null, other?: string | null) {
  if (v === TeachingLanguage.CHINESE) return lang === "EN" ? "Chinese" : "中文";
  if (v === TeachingLanguage.ENGLISH) return lang === "EN" ? "English" : "英文";
  if (v === TeachingLanguage.BILINGUAL) return lang === "EN" ? "Bilingual" : "双语";
  if (other) return other;
  return "-";
}

function offlineLabel(lang: string, sh?: boolean | null, sg?: boolean | null) {
  const hasSh = !!sh;
  const hasSg = !!sg;
  if (hasSh && hasSg) return lang === "EN" ? "Shanghai + Singapore" : "上海 + 新加坡";
  if (hasSh) return lang === "EN" ? "Shanghai Offline" : "上海线下";
  if (hasSg) return lang === "EN" ? "Singapore Offline" : "新加坡线下";
  return lang === "EN" ? "Online" : "线上";
}

function formatAlmaMater(text?: string | null) {
  const parts = String(text || "")
    .split(/[，,]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts.join("\n") : "-";
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const lang = await getLang();
  const [teachers, courses, subjects, levels] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      include: {
        subjects: { include: { course: true } },
        subjectCourse: { include: { course: true } },
        users: { select: { id: true, email: true }, where: { role: "TEACHER" }, take: 1 },
      },
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({
      include: { subject: { include: { course: true } } },
      orderBy: [{ subjectId: "asc" }, { name: "asc" }],
    }),
  ]);

  function courseNamesOf(tch: (typeof teachers)[number]) {
    const set = new Set<string>();
    if (tch.subjectCourse?.course?.name) set.add(tch.subjectCourse.course.name);
    for (const s of tch.subjects) {
      if (s.course?.name) set.add(s.course.name);
    }
    return Array.from(set);
  }

  function subjectNamesOf(tch: (typeof teachers)[number]) {
    const set = new Set<string>();
    if (tch.subjectCourse?.name) set.add(`${tch.subjectCourse.course.name}-${tch.subjectCourse.name}`);
    for (const s of tch.subjects) {
      set.add(`${s.course.name}-${s.name}`);
    }
    return Array.from(set);
  }

  function groupLabelOf(tch: (typeof teachers)[number], groupBy: string) {
    if (groupBy === "course") return courseNamesOf(tch).join(" / ") || t(lang, "No Course", "未设置课程");
    if (groupBy === "subject") return subjectNamesOf(tch).join(" / ") || t(lang, "No Subject", "未设置科目");
    if (groupBy === "language") return languageLabel(lang, tch.teachingLanguage, tch.teachingLanguageOther);
    if (groupBy === "linked") return tch.users[0]?.email ? t(lang, "Linked", "已绑定") : t(lang, "Not linked", "未绑定");
    return "";
  }

  const getParam = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
  };
  const filterQ = getParam("q");
  const filterCourseId = getParam("courseId");
  const filterSubjectId = getParam("subjectId");
  const filterLanguage = getParam("teachingLanguage");
  const filterOffline = getParam("offlineMode");
  const filterLinked = getParam("linked");
  const groupBy = getParam("groupBy");
  const msg = getParam("msg");
  const err = getParam("err");

  const filteredTeachers = teachers.filter((tch) => {
    const q = filterQ.trim().toLowerCase();
    if (q) {
      const joined = [
        tch.name,
        tch.nationality ?? "",
        tch.almaMater ?? "",
        tch.intro ?? "",
        tch.users[0]?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!joined.includes(q)) return false;
    }

    if (filterCourseId) {
      const ok =
        tch.subjectCourse?.courseId === filterCourseId ||
        tch.subjects.some((s) => s.courseId === filterCourseId);
      if (!ok) return false;
    }

    if (filterSubjectId) {
      const ok =
        tch.subjectCourseId === filterSubjectId ||
        tch.subjects.some((s) => s.id === filterSubjectId);
      if (!ok) return false;
    }

    if (filterLanguage) {
      if (filterLanguage === "OTHER") {
        if (tch.teachingLanguage || !tch.teachingLanguageOther) return false;
      } else if (tch.teachingLanguage !== (filterLanguage as TeachingLanguage)) {
        return false;
      }
    }

    if (filterOffline) {
      if (filterOffline === "ONLINE_ONLY" && (tch.offlineShanghai || tch.offlineSingapore)) return false;
      if (filterOffline === "OFFLINE_SH" && !tch.offlineShanghai) return false;
      if (filterOffline === "OFFLINE_SG" && !tch.offlineSingapore) return false;
      if (filterOffline === "OFFLINE_BOTH" && !(tch.offlineShanghai && tch.offlineSingapore)) return false;
      if (filterOffline === "OFFLINE_ANY" && !(tch.offlineShanghai || tch.offlineSingapore)) return false;
    }

    if (filterLinked === "linked" && !tch.users[0]?.email) return false;
    if (filterLinked === "unlinked" && tch.users[0]?.email) return false;

    return true;
  });

  const sortedTeachers = filteredTeachers
    .slice()
    .sort((a, b) => {
      if (!groupBy) return a.name.localeCompare(b.name);
      const ga = groupLabelOf(a, groupBy);
      const gb = groupLabelOf(b, groupBy);
      const gcmp = ga.localeCompare(gb);
      if (gcmp !== 0) return gcmp;
      return a.name.localeCompare(b.name);
    });

  return (
    <div>
      <h2>{t(lang, "Teachers", "老师")}</h2>
      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={decodeURIComponent(err)} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={decodeURIComponent(msg)} /> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Add Teacher", "新增老师")} title={t(lang, "Add Teacher", "新增老师")} closeOnSubmit>
          <TeacherCreateForm
            action={createTeacher}
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
              subjectsMulti: t(lang, "Subjects (multi-select)", "科目(多选)"),
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
              add: t(lang, "Add", "新增"),
            }}
          />
        </SimpleModal>

        <SimpleModal buttonLabel={t(lang, "Export Teacher Cards", "导出老师名片")} title={t(lang, "Teacher Card Export", "老师名片导出")} closeOnSubmit>
          <TeacherCardExportForm
            actionUrl="/admin/teachers/cards/export/pdf"
            courses={courses.map((c) => ({ id: c.id, label: c.name }))}
            subjects={subjects.map((s) => ({ id: s.id, courseId: s.courseId, label: `${s.course.name} - ${s.name}` }))}
            levels={levels.map((l) => ({ id: l.id, subjectId: l.subjectId, label: `${l.subject.course.name} - ${l.subject.name} - ${l.name}` }))}
            labels={{
              courseOptional: t(lang, "Course (optional)", "课程（可选）"),
              subjectOptional: t(lang, "Subject (optional)", "科目（可选）"),
              levelOptional: t(lang, "Level (optional)", "等级（可选）"),
              languageOptional: t(lang, "Language (optional)", "语言（可选）"),
              chinese: t(lang, "Chinese", "中文"),
              english: t(lang, "English", "英文"),
              bilingual: t(lang, "Bilingual", "双语"),
              other: t(lang, "Other", "其他"),
              offlineOptional: t(lang, "Offline (optional)", "线下（可选）"),
              offlineOnlineOnly: t(lang, "Online only", "仅线上"),
              offlineShanghai: t(lang, "Shanghai offline", "上海线下"),
              offlineSingapore: t(lang, "Singapore offline", "新加坡线下"),
              offlineBoth: t(lang, "Shanghai + Singapore", "上海 + 新加坡"),
              offlineAny: t(lang, "Any offline", "任意线下"),
              exportByFilter: t(lang, "Export Cards by Filter", "按筛选导出名片"),
              exportAll: t(lang, "Export All Teachers", "导出全部老师名片"),
              emptyResult: t(lang, "No teachers found for export.", "没有符合条件的老师"),
            }}
          />
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            {t(lang, "Card marker (top-right dots):", "名片标记（右上角圆点）:")}{" "}
            {t(lang, "default = online, SH = top-right, SG = bottom-left, SH+SG = bottom-right.", "默认线上不点亮；上海线下=右上点；新加坡线下=左下点；上海+新加坡=右下点。")}
          </div>
        </SimpleModal>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 12 }}>
        <TeacherFilterForm
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
          initial={{
            q: filterQ,
            courseId: filterCourseId,
            subjectId: filterSubjectId,
            teachingLanguage: filterLanguage,
            offlineMode: filterOffline,
            linked: filterLinked,
            groupBy,
          }}
          labels={{
            title: t(lang, "Search & Category View", "检索与类目展示"),
            searchPlaceholder: t(lang, "Search name/intro/email...", "搜索姓名/介绍/邮箱..."),
            courseAll: t(lang, "Course (all)", "课程（全部）"),
            subjectAll: t(lang, "Subject (all)", "科目（全部）"),
            languageAll: t(lang, "Language (all)", "语言（全部）"),
            offlineAll: t(lang, "Offline (all)", "线下（全部）"),
            linkedAll: t(lang, "Link Status (all)", "绑定状态（全部）"),
            groupNone: t(lang, "Group: None", "分组：不分组"),
            groupCourse: t(lang, "Group: Course", "分组：课程"),
            groupSubject: t(lang, "Group: Subject", "分组：科目"),
            groupLanguage: t(lang, "Group: Language", "分组：语言"),
            groupLinked: t(lang, "Group: Link Status", "分组：绑定状态"),
            apply: t(lang, "Apply", "应用"),
            reset: t(lang, "Reset", "重置"),
            chinese: t(lang, "Chinese", "中文"),
            english: t(lang, "English", "英文"),
            bilingual: t(lang, "Bilingual", "双语"),
            other: t(lang, "Other", "其他"),
            onlineOnly: t(lang, "Online only", "仅线上"),
            offlineSh: t(lang, "Shanghai offline", "上海线下"),
            offlineSg: t(lang, "Singapore offline", "新加坡线下"),
            offlineBoth: t(lang, "Shanghai + Singapore", "上海 + 新加坡"),
            offlineAny: t(lang, "Any offline", "任意线下"),
            linked: t(lang, "Linked", "已绑定"),
            unlinked: t(lang, "Not linked", "未绑定"),
          }}
        />
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555", marginTop: 6 }}>
          <div>
            {t(lang, "Total", "总数")}: <b>{sortedTeachers.length}</b>
          </div>
          <div>
            {t(lang, "Linked", "已绑定")}: <b>{sortedTeachers.filter((tch) => !!tch.users[0]?.email).length}</b>
          </div>
          <div>
            {t(lang, "Not linked", "未绑定")}: <b>{sortedTeachers.filter((tch) => !tch.users[0]?.email).length}</b>
          </div>
        </div>
      </div>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Name", "姓名")}</th>
            <th align="left">{t(lang, "Subject", "科目")}</th>
            <th align="left">{t(lang, "Language", "语言")}</th>
            <th align="left">{t(lang, "Location", "上课地点")}</th>
            <th align="left">{t(lang, "Years", "年限")}</th>
            <th align="left">{t(lang, "Nationality", "国籍")}</th>
            <th align="left">{t(lang, "Alma Mater", "毕业学校")}</th>
            <th align="left">{t(lang, "Availability", "可用时间")}</th>
            <th align="left">{t(lang, "Account Link", "账号绑定")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {sortedTeachers.map((tch, idx) => {
            const currentGroup = groupBy ? groupLabelOf(tch, groupBy) : "";
            const prevGroup = idx > 0 && groupBy ? groupLabelOf(sortedTeachers[idx - 1], groupBy) : "";
            return (
              <Fragment key={tch.id}>
                {groupBy && (idx === 0 || currentGroup !== prevGroup) && (
                  <tr>
                    <td colSpan={9} style={{ background: "#fff8db", fontWeight: 700 }}>
                      {t(lang, "Group", "分组")}: {currentGroup || "-"}
                    </td>
                  </tr>
                )}
                <tr style={{ borderTop: "1px solid #eee" }}>
                  <td>
                    <a href={`/admin/teachers/${tch.id}`}>{tch.name}</a>
                  </td>
                  <td>
                    {tch.subjects.length > 0
                      ? tch.subjects.map((s) => `${s.course.name}-${s.name}`).join(", ")
                      : tch.subjectCourse
                      ? `${tch.subjectCourse.course.name}-${tch.subjectCourse.name}`
                      : "-"}
                  </td>
                  <td>{languageLabel(lang, tch.teachingLanguage, tch.teachingLanguageOther)}</td>
                  <td>{offlineLabel(lang, tch.offlineShanghai, tch.offlineSingapore)}</td>
                  <td>{tch.yearsExperience ?? "-"}</td>
                  <td>{tch.nationality ?? "-"}</td>
                  <td style={{ whiteSpace: "pre-line" }}>{formatAlmaMater(tch.almaMater)}</td>
                  <td>
                    <a
                      href={`/admin/teachers/${tch.id}/availability`}
                      style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}
                    >
                      {t(lang, "Set / View", "设置 / 查看")}
                    </a>
                  </td>
                  <td>
                    {tch.users[0]?.email ? (
                      <span style={{ color: "#087" }}>
                        {t(lang, "Linked", "已绑定")}: {tch.users[0].email}
                      </span>
                    ) : (
                      <span style={{ color: "#b00" }}>{t(lang, "Not linked", "未绑定")}</span>
                    )}
                    <div>
                      <a
                        href={`/admin/teachers/${tch.id}`}
                        style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, display: "inline-block", marginTop: 4 }}
                      >
                        {t(lang, "Manage link", "去绑定")}
                      </a>
                    </div>
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={`/admin/teachers/${tch.id}`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                      {t(lang, "Edit", "编辑")}
                    </a>
                    <a
                      href={`/admin/teachers/cards/export/pdf?teacherId=${tch.id}`}
                      style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}
                    >
                      {t(lang, "Export Card", "导出名片")}
                    </a>
                    <form action={deleteTeacher}>
                      <input type="hidden" name="id" value={tch.id} />
                      <ConfirmSubmitButton message={t(lang, "Delete teacher? This also deletes availability/classes/appointments.", "删除老师？将删除可用时间/班级/预约。")}>
                        {t(lang, "Delete", "删除")}
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              </Fragment>
            );
          })}
          {sortedTeachers.length === 0 && (
            <tr>
              <td colSpan={9}>{t(lang, "No teachers yet.", "暂无老师")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
