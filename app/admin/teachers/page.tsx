import { prisma } from "@/lib/prisma";
import { TeachingLanguage } from "@prisma/client";
import { getLang, t } from "@/lib/i18n";
import { Fragment } from "react";
import SimpleModal from "../_components/SimpleModal";
import TeacherCreateForm from "../_components/TeacherCreateForm";
import TeacherCardExportForm from "../_components/TeacherCardExportForm";
import TeacherFilterForm from "../_components/TeacherFilterForm";
import NoticeBanner from "../_components/NoticeBanner";
import DeleteTeacherButtonClient from "./DeleteTeacherButtonClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../_components/workbenchStyles";

function teachersSectionLinkStyle(background: string, border: string) {
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const getParam = (k: string) => {
    const v = sp?.[k];
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
  };
  const filterQ = getParam("q");
  const filterCourseId = getParam("courseId");
  const filterSubjectId = getParam("subjectId");
  const filterLanguage = getParam("teachingLanguage");
  const filterOffline = getParam("offlineMode");
  const filterLinked = getParam("linked");
  const groupBy = getParam("groupBy");
  const requestedPage = Math.max(1, Number.parseInt(getParam("page") || "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(getParam("pageSize") || "20", 10);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const msg = getParam("msg");
  const err = getParam("err");

  const teacherWhere: any = {};
  const andClauses: any[] = [];
  const q = filterQ.trim();
  if (q) {
    andClauses.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nationality: { contains: q, mode: "insensitive" } },
        { almaMater: { contains: q, mode: "insensitive" } },
        { intro: { contains: q, mode: "insensitive" } },
        { users: { some: { email: { contains: q, mode: "insensitive" }, role: { in: ["TEACHER", "ADMIN"] } } } },
      ],
    });
  }
  if (filterCourseId) {
    andClauses.push({
      OR: [{ subjectCourse: { courseId: filterCourseId } }, { subjects: { some: { courseId: filterCourseId } } }],
    });
  }
  if (filterSubjectId) {
    andClauses.push({
      OR: [{ subjectCourseId: filterSubjectId }, { subjects: { some: { id: filterSubjectId } } }],
    });
  }
  if (filterLanguage) {
    if (filterLanguage === "OTHER") {
      andClauses.push({ teachingLanguage: null, teachingLanguageOther: { not: null } });
    } else {
      andClauses.push({ teachingLanguage: filterLanguage });
    }
  }
  if (filterOffline === "ONLINE_ONLY") andClauses.push({ offlineShanghai: false, offlineSingapore: false });
  if (filterOffline === "OFFLINE_SH") andClauses.push({ offlineShanghai: true });
  if (filterOffline === "OFFLINE_SG") andClauses.push({ offlineSingapore: true });
  if (filterOffline === "OFFLINE_BOTH") andClauses.push({ offlineShanghai: true, offlineSingapore: true });
  if (filterOffline === "OFFLINE_ANY") andClauses.push({ OR: [{ offlineShanghai: true }, { offlineSingapore: true }] });
  if (filterLinked === "linked") andClauses.push({ users: { some: { role: { in: ["TEACHER", "ADMIN"] } } } });
  if (filterLinked === "unlinked") andClauses.push({ users: { none: { role: { in: ["TEACHER", "ADMIN"] } } } });
  if (andClauses.length) teacherWhere.AND = andClauses;

  const [courses, subjects, levels, totalCountRaw] = await Promise.all([
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({
      include: { subject: { include: { course: true } } },
      orderBy: [{ subjectId: "asc" }, { name: "asc" }],
    }),
    groupBy ? Promise.resolve(0) : prisma.teacher.count({ where: teacherWhere }),
  ]);
  const totalPages = groupBy ? 1 : Math.max(1, Math.ceil(totalCountRaw / pageSize));
  const page = groupBy ? 1 : Math.min(requestedPage, totalPages);

  const teachers = await prisma.teacher.findMany({
    where: teacherWhere,
    orderBy: { name: "asc" },
    skip: groupBy ? undefined : (page - 1) * pageSize,
    take: groupBy ? undefined : pageSize,
    include: {
      subjects: { include: { course: true } },
      subjectCourse: { include: { course: true } },
      users: { select: { id: true, email: true }, where: { role: { in: ["TEACHER", "ADMIN"] } }, take: 1 },
    },
  });

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

  const sortedTeachers = teachers
    .slice()
    .sort((a, b) => {
      if (!groupBy) return a.name.localeCompare(b.name);
      const ga = groupLabelOf(a, groupBy);
      const gb = groupLabelOf(b, groupBy);
      const gcmp = ga.localeCompare(gb);
      if (gcmp !== 0) return gcmp;
      return a.name.localeCompare(b.name);
    });
  const filteredTotal = groupBy ? sortedTeachers.length : totalCountRaw;
  const linkedTeacherCount = sortedTeachers.filter((tch) => !!tch.users[0]?.email).length;
  const offlineTeacherCount = sortedTeachers.filter((tch) => !!tch.offlineShanghai || !!tch.offlineSingapore).length;
  const buildPageHref = (targetPage: number, targetPageSize = pageSize) => {
    const params = new URLSearchParams();
    if (filterQ) params.set("q", filterQ);
    if (filterCourseId) params.set("courseId", filterCourseId);
    if (filterSubjectId) params.set("subjectId", filterSubjectId);
    if (filterLanguage) params.set("teachingLanguage", filterLanguage);
    if (filterOffline) params.set("offlineMode", filterOffline);
    if (filterLinked) params.set("linked", filterLinked);
    if (groupBy) params.set("groupBy", groupBy);
    params.set("pageSize", String(targetPageSize));
    if (targetPage > 1) params.set("page", String(targetPage));
    const qstr = params.toString();
    return qstr ? `/admin/teachers?${qstr}` : "/admin/teachers";
  };

  return (
    <div>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>{t(lang, "Teachers workbench", "老师工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Teachers", "老师")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Use this page to add teachers, export cards, filter by capability, and jump directly into availability or account-link work without rescanning the list.",
              "这里用于新增老师、导出名片、按能力筛选，并快速进入可用时间或账号绑定，不用反复扫整张列表。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Visible teachers", "当前结果")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{filteredTotal}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Linked", "已绑定")}</div>
            <div style={workbenchMetricValueStyle("emerald")}>{linkedTeacherCount}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fff7ed" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Offline capable", "可线下授课")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{offlineTeacherCount}</div>
          </div>
          <div style={workbenchMetricCardStyle(groupBy ? "indigo" : "slate")}>
            <div style={workbenchMetricLabelStyle(groupBy ? "indigo" : "slate")}>{t(lang, "Grouping", "分组方式")}</div>
            <div style={{ ...workbenchMetricValueStyle(groupBy ? "indigo" : "slate"), fontSize: 18 }}>
              {groupBy || t(lang, "None", "无")}
            </div>
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
          <div style={{ fontWeight: 800 }}>{t(lang, "Teachers work map", "老师工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Use the top shortcuts first, then narrow with filters, and only then work through the teacher table row by row.", "建议先用顶部快捷入口，再缩小筛选范围，最后逐行处理老师列表。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#teachers-actions" style={teachersSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Create and export", "新增与导出")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Add new teacher or export cards", "新增老师或导出名片")}</span>
          </a>
          <a href="#teachers-filters" style={teachersSectionLinkStyle("#eff6ff", "#93c5fd")}>
            <strong>{t(lang, "Filters", "筛选区")}</strong>
            <span style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Search by subject, language, offline mode, or link state", "按科目、语言、线下能力或绑定状态过滤")}</span>
          </a>
          <a href="#teachers-table" style={teachersSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Teacher list", "老师列表")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Open availability, manage link, or edit directly from the row", "从列表直接进入可用时间、绑定或编辑")}</span>
          </a>
        </div>
      </section>
      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={decodeURIComponent(err)} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={decodeURIComponent(msg)} /> : null}

      <div id="teachers-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Add Teacher", "新增老师")} title={t(lang, "Add Teacher", "新增老师")} closeOnSubmit>
          <TeacherCreateForm
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

      <div id="teachers-filters" style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 12 }}>
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
            {t(lang, "Total", "总数")}: <b>{filteredTotal}</b>
          </div>
          <div>
            {t(lang, "Linked", "已绑定")}: <b>{sortedTeachers.filter((tch) => !!tch.users[0]?.email).length}</b>
          </div>
          <div>
            {t(lang, "Not linked", "未绑定")}: <b>{sortedTeachers.filter((tch) => !tch.users[0]?.email).length}</b>
          </div>
          {!groupBy ? (
            <>
              <div>
                {t(lang, "Per Page", "每页")}:{" "}
                {[20, 50, 100].map((size, idx) => (
                  <span key={size}>
                    {idx > 0 ? " / " : ""}
                    {size === pageSize ? <b>{size}</b> : <a href={buildPageHref(1, size)}>{size}</a>}
                  </span>
                ))}
              </div>
              <div>
                {t(lang, "Page", "页")}: <b>{page}</b> / <b>{totalPages}</b>
              </div>
              <a
                href={page > 1 ? buildPageHref(page - 1) : "#"}
                style={{ pointerEvents: page > 1 ? "auto" : "none", opacity: page > 1 ? 1 : 0.4 }}
              >
                {t(lang, "Prev", "上一页")}
              </a>
              <a
                href={page < totalPages ? buildPageHref(page + 1) : "#"}
                style={{ pointerEvents: page < totalPages ? "auto" : "none", opacity: page < totalPages ? 1 : 0.4 }}
              >
                {t(lang, "Next", "下一页")}
              </a>
            </>
          ) : null}
        </div>
      </div>

      <table id="teachers-table" cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
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
                    <div style={{ marginTop: 6 }}>
                      <a
                        href={`/admin/teachers/${tch.id}/calendar`}
                        style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, display: "inline-block" }}
                      >
                        {t(lang, "Month Calendar", "月表")}
                      </a>
                    </div>
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
                    <DeleteTeacherButtonClient
                      teacherId={tch.id}
                      label={t(lang, "Delete", "删除")}
                      confirmMessage={t(lang, "Delete teacher? This also deletes availability/classes/appointments.", "删除老师？将删除可用时间/班级/预约。")}
                    />
                  </td>
                </tr>
              </Fragment>
            );
          })}
          {sortedTeachers.length === 0 && (
            <tr>
              <td colSpan={10}>{t(lang, "No teachers yet.", "暂无老师")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
