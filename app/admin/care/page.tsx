import { createCareEngagement } from "@/lib/care-management";
import { requireCareStaff } from "@/lib/care-access";
import { CARE_PROGRAM_OPTIONS, CARE_SCOPE_OPTIONS } from "@/lib/care-validation";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { isManagerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./care.module.css";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusTone(status: string) {
  return status === "ACTIVE" ? "active" : status === "CANCELLED" ? "risk" : "neutral";
}

export default async function CarePage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string | string[];
    studentId?: string | string[];
    msg?: string | string[];
    err?: string | string[];
  }>;
}) {
  const actor = await requireCareStaff();
  const lang = await getLang();
  const sp = await searchParams;
  const q = first(sp?.q).trim();
  const studentId = first(sp?.studentId).trim();
  const msg = first(sp?.msg).trim();
  const err = first(sp?.err).trim();
  const broadAccess = actor.role === "ADMIN" || (await isManagerUser(actor));
  const accessWhere = broadAccess ? {} : { members: { some: { userId: actor.id, isActive: true } } };

  async function createAction(formData: FormData) {
    "use server";
    const current = await requireCareStaff();
    const canCreate = current.role === "ADMIN" || (await isManagerUser(current));
    if (!canCreate) redirect(`/admin/care?err=${encodeURIComponent("Only managers can create care projects")}`);
    let engagementId = "";
    try {
      const engagement = await createCareEngagement({
        actor: current,
        studentId: formData.get("studentId"),
        programType: formData.get("programType"),
        startDate: formData.get("startDate"),
        caseOwnerUserId: formData.get("caseOwnerUserId"),
        reviewerUserId: formData.get("reviewerUserId"),
        scopeIds: formData.getAll("scopeIds"),
      });
      engagementId = engagement.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create care project failed";
      redirect(`/admin/care?studentId=${encodeURIComponent(String(formData.get("studentId") ?? ""))}&err=${encodeURIComponent(message)}`);
    }
    redirect(`/admin/care/${encodeURIComponent(engagementId)}?msg=${encodeURIComponent("Care project created")}`);
  }

  const [engagements, students, selectedStudent, staff] = await Promise.all([
    prisma.careEngagement.findMany({
      where: accessWhere,
      include: {
        student: { select: { id: true, name: true, school: true, grade: true } },
        caseOwner: { select: { id: true, name: true } },
        _count: { select: { activities: true, tasks: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    q && broadAccess
      ? prisma.student.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { school: { contains: q, mode: "insensitive" } },
              { grade: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, school: true, grade: true },
          orderBy: { name: "asc" },
          take: 20,
        })
      : [],
    studentId && broadAccess
      ? prisma.student.findUnique({
          where: { id: studentId },
          select: { id: true, name: true, school: true, grade: true },
        })
      : null,
    broadAccess ? prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CS", "TEACHER"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }) : [],
  ]);

  const counts = engagements.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.status === "ACTIVE") acc.active += 1;
      if (item.status === "DRAFT") acc.draft += 1;
      if (item.status === "PAUSED") acc.paused += 1;
      return acc;
    },
    { total: 0, active: 0, draft: 0, paused: 0 },
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{t(lang, "Full Care", "全托管")}</h1>
          <div className={styles.muted}>{t(lang, "Students, evidence, actions and owners.", "学生、证据、行动和负责人。")}</div>
        </div>
      </header>

      {err ? <div className={styles.noticeError}>{err}</div> : null}
      {msg ? <div className={styles.noticeSuccess}>{msg}</div> : null}

      <div className={styles.metrics}>
        <div className={styles.metric}><strong>{counts.active}</strong><span className={styles.muted}>{t(lang, "Active", "进行中")}</span></div>
        <div className={styles.metric}><strong>{counts.draft}</strong><span className={styles.muted}>{t(lang, "Draft", "待启用")}</span></div>
        <div className={styles.metric}><strong>{counts.paused}</strong><span className={styles.muted}>{t(lang, "Paused", "已暂停")}</span></div>
        <div className={styles.metric}><strong>{counts.total}</strong><span className={styles.muted}>{t(lang, "Total", "全部")}</span></div>
      </div>

      {broadAccess ? <section className={styles.section}>
        <h2>{t(lang, "Add student", "添加学生")}</h2>
        <form method="get" className={styles.search}>
          <input className={styles.field} style={{ maxWidth: 420 }} name="q" defaultValue={q} placeholder={t(lang, "Name, school or grade", "姓名、学校或年级")} />
          <button className={styles.buttonSecondary} type="submit">{t(lang, "Search", "搜索")}</button>
        </form>

        {q && !selectedStudent ? (
          <div className={styles.rows}>
            {students.map((student) => (
              <div className={styles.row} key={student.id}>
                <div>
                  <div className={styles.rowTitle}>{student.name}</div>
                  <div className={styles.muted}>{student.school ?? "-"} · {student.grade ?? "-"}</div>
                </div>
                <div className={styles.muted}>ID {student.id.slice(-8)}</div>
                <span />
                <Link className={styles.buttonSecondary} href={`/admin/care?q=${encodeURIComponent(q)}&studentId=${encodeURIComponent(student.id)}`}>
                  {t(lang, "Select", "选择")}
                </Link>
              </div>
            ))}
            {students.length === 0 ? <div className={styles.muted} style={{ padding: "12px 0" }}>{t(lang, "No student found.", "没有找到学生。")}</div> : null}
          </div>
        ) : null}

        {selectedStudent ? (
          <form action={createAction} className={styles.formGrid}>
            <input type="hidden" name="studentId" value={selectedStudent.id} />
            <div className={styles.full}>
              <strong>{selectedStudent.name}</strong>
              <span className={styles.muted}> · {selectedStudent.school ?? "-"} · {selectedStudent.grade ?? "-"} · ID {selectedStudent.id.slice(-8)}</span>
            </div>
            <label className={styles.label}>
              {t(lang, "Program", "服务类型")}
              <select className={styles.select} name="programType" defaultValue="PRE_U_FULL_COORDINATION">
                {CARE_PROGRAM_OPTIONS.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              {t(lang, "Start date", "开始日期")}
              <input className={styles.field} name="startDate" type="date" defaultValue={formatBusinessDateOnly(new Date())} required />
            </label>
            <label className={styles.label}>
              {t(lang, "Case owner", "总负责人")}
              <select className={styles.select} name="caseOwnerUserId" required defaultValue="">
                <option value="" disabled>{t(lang, "Select", "请选择")}</option>
                {staff.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email} · {user.role}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              {t(lang, "Reviewer", "月报审核人")}
              <select className={styles.select} name="reviewerUserId" defaultValue="">
                <option value="">{t(lang, "Assign later", "稍后指定")}</option>
                {staff.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email} · {user.role}</option>)}
              </select>
            </label>
            <fieldset className={`${styles.full} ${styles.section}`} style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }}>
              <legend style={{ fontWeight: 800 }}>{t(lang, "Service scope", "服务范围")}</legend>
              <div className={styles.scopeGrid}>
                {CARE_SCOPE_OPTIONS.map((item) => (
                  <label className={styles.check} key={item.id}>
                    <input name="scopeIds" value={item.id} type="checkbox" defaultChecked={item.defaultOn} />
                    <span>{lang === "EN" ? item.en : item.zh}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={`${styles.full} ${styles.toolbar}`}>
              <button className={styles.button} type="submit">{t(lang, "Create draft", "建立待启用项目")}</button>
              <Link className={styles.buttonSecondary} href="/admin/care">{t(lang, "Cancel", "取消")}</Link>
            </div>
          </form>
        ) : null}
      </section> : null}

      <section className={styles.section}>
        <h2>{t(lang, "Care students", "托管学生")}</h2>
        <div className={styles.rows}>
          {engagements.map((engagement) => (
            <div className={styles.row} key={engagement.id}>
              <div>
                <Link className={styles.rowTitle} href={`/admin/care/${encodeURIComponent(engagement.id)}`}>{engagement.student.name}</Link>
                <div className={styles.muted}>{engagement.student.school ?? "-"} · {engagement.student.grade ?? "-"}</div>
              </div>
              <div>
                <span className={styles.badge} data-tone={statusTone(engagement.status)}>{engagement.status}</span>
                <div className={styles.muted}>{engagement.programType}</div>
              </div>
              <div>
                <div>{engagement.caseOwner?.name ?? "-"}</div>
                <div className={styles.muted}>{engagement._count.activities} {t(lang, "updates", "条记录")} · {engagement._count.tasks} {t(lang, "tasks", "项待办")}</div>
              </div>
              <div className={styles.muted}>{formatBusinessDateTime(engagement.updatedAt)}</div>
            </div>
          ))}
          {engagements.length === 0 ? <div className={styles.muted} style={{ padding: "12px 0" }}>{t(lang, "No care students yet.", "暂时没有托管学生。")}</div> : null}
        </div>
      </section>
    </main>
  );
}
