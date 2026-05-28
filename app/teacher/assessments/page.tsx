import { requireTeacher } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { normalizeLeadText } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function read(formData: FormData, key: string, max = 1000) {
  return normalizeLeadText(formData.get(key), max);
}

async function submitAssessmentAction(formData: FormData) {
  "use server";
  const user = await requireTeacher();
  if (!user.teacherId) redirect("/teacher");
  const id = read(formData, "id", 80);
  if (!id) redirect("/teacher/assessments");
  const row = await prisma.leadAssessmentRequest.findUnique({
    where: { id },
    select: { teacherId: true, status: true, leadId: true },
  });
  if (!row || row.teacherId !== user.teacherId) redirect("/teacher/assessments");
  if (row.status !== "Pending" && row.status !== "Revision Requested") redirect("/teacher/assessments?err=locked");
  await prisma.$transaction(async (tx) => {
    await tx.leadAssessmentRequest.update({
      where: { id },
      data: {
        status: "Submitted",
        studentLevel: read(formData, "studentLevel", 1000) || null,
        academicProblems: read(formData, "academicProblems", 2000) || null,
        recommendedCourse: read(formData, "recommendedCourse", 500) || null,
        recommendedFrequency: read(formData, "recommendedFrequency", 500) || null,
        recommendedPackage: read(formData, "recommendedPackage", 500) || null,
        teacherFit: read(formData, "teacherFit", 500) || null,
        recommendedTeacherType: read(formData, "recommendedTeacherType", 500) || null,
        risks: read(formData, "risks", 2000) || null,
        suggestionForSales: read(formData, "suggestionForSales", 2000) || null,
        submittedAt: new Date(),
      },
    });
    const pendingCount = await tx.leadAssessmentRequest.count({
      where: { leadId: row.leadId, status: { in: ["Pending", "Revision Requested"] } },
    });
    if (pendingCount === 0) {
      await tx.lead.update({
        where: { id: row.leadId },
        data: { status: "Assessment Done", nextAction: "Sales to review teacher assessment and follow up with parent." },
      });
    }
  });
  revalidatePath("/teacher/assessments");
  revalidatePath(`/admin/leads/${row.leadId}`);
  redirect("/teacher/assessments?ok=1");
}

export default async function TeacherAssessmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  const user = await requireTeacher();
  const lang = await getLang();
  const sp = await searchParams;
  if (!user.teacherId) {
    return <div>{t(lang, "Your account is not linked to a teacher profile.", "你的账号还没有绑定老师档案。")}</div>;
  }
  const rows = await prisma.leadAssessmentRequest.findMany({
    where: { teacherId: user.teacherId },
    include: { lead: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const now = new Date();
  const fieldStyle = { minHeight: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" } as const;
  const labelStyle = { display: "grid", gap: 5, fontWeight: 800, fontSize: 13 } as const;

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: "0 0 6px" }}>{t(lang, "Assessment Requests", "评估请求")}</h2>
        <div style={{ color: "#475569" }}>{t(lang, "Submit academic assessment for assigned sales resources. Submitted assessments are locked unless admin approves a revision.", "为分配给你的销售资源提交学术评估；提交后默认锁定，管理员批准后才可再改。")}</div>
      </section>
      {sp?.ok === "1" ? <div style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: 10 }}>{t(lang, "Assessment submitted.", "评估已提交。")}</div> : null}
      {sp?.err === "locked" ? <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: 10 }}>{t(lang, "This assessment is locked. Ask admin to approve a revision.", "这个评估已锁定，请让管理员批准重新修改。")}</div> : null}
      <section style={{ display: "grid", gap: 12 }}>
        {rows.length === 0 ? <div style={{ color: "#64748b" }}>{t(lang, "No assessment requests assigned to you.", "暂无分配给你的评估请求。")}</div> : null}
        {rows.map((row) => {
          const editable = row.status === "Pending" || row.status === "Revision Requested";
          const overdue = editable && row.dueAt && row.dueAt.getTime() < now.getTime();
          return (
            <details key={row.id} open={editable} style={{ border: overdue ? "1px solid #fecaca" : "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: overdue ? "#fff7f7" : "#fff" }}>
              <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                {row.lead.studentName} · {row.lead.grade || "-"} · {row.status}
                {row.dueAt ? ` · ${formatBusinessDateTime(row.dueAt)}` : ""}
              </summary>
              <div style={{ color: "#475569", margin: "10px 0", display: "grid", gap: 4 }}>
                <div><b>{t(lang, "Source", "来源")}</b>: {row.lead.sourceType}{row.lead.sourcePlatform ? ` / ${row.lead.sourcePlatform}` : ""}</div>
                <div><b>{t(lang, "Course", "课程")}</b>: {row.lead.preferredCourse || "-"}</div>
                <div><b>{t(lang, "Needs", "需求")}</b>: {row.lead.needs || "-"}</div>
                <div><b>{t(lang, "Target", "目标")}</b>: {row.lead.target || "-"}</div>
                {row.reopenNote ? <div><b>{t(lang, "Revision request", "重改要求")}</b>: {row.reopenNote}</div> : null}
              </div>
              <form action={submitAssessmentAction} style={{ display: "grid", gap: 10 }}>
                <input type="hidden" name="id" value={row.id} />
                <label style={labelStyle}>{t(lang, "Student level", "学生当前水平")}<textarea name="studentLevel" rows={2} defaultValue={row.studentLevel || ""} disabled={!editable} style={fieldStyle} /></label>
                <label style={labelStyle}>{t(lang, "Academic problems", "主要学术问题")}<textarea name="academicProblems" rows={3} defaultValue={row.academicProblems || ""} disabled={!editable} style={fieldStyle} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label style={labelStyle}>{t(lang, "Recommended course", "建议课程")}<input name="recommendedCourse" defaultValue={row.recommendedCourse || ""} disabled={!editable} style={fieldStyle} /></label>
                  <label style={labelStyle}>{t(lang, "Recommended frequency", "建议频率")}<input name="recommendedFrequency" defaultValue={row.recommendedFrequency || ""} disabled={!editable} style={fieldStyle} /></label>
                  <label style={labelStyle}>{t(lang, "Recommended package", "建议课时包")}<input name="recommendedPackage" defaultValue={row.recommendedPackage || ""} disabled={!editable} style={fieldStyle} /></label>
                  <label style={labelStyle}>{t(lang, "Teacher fit", "是否适合自己带")}<input name="teacherFit" defaultValue={row.teacherFit || ""} disabled={!editable} style={fieldStyle} /></label>
                </div>
                <label style={labelStyle}>{t(lang, "Recommended teacher type", "推荐老师/老师类型")}<input name="recommendedTeacherType" defaultValue={row.recommendedTeacherType || ""} disabled={!editable} style={fieldStyle} /></label>
                <label style={labelStyle}>{t(lang, "Risks", "风险提醒")}<textarea name="risks" rows={2} defaultValue={row.risks || ""} disabled={!editable} style={fieldStyle} /></label>
                <label style={labelStyle}>{t(lang, "Suggestion for sales", "给销售/教务的建议")}<textarea name="suggestionForSales" rows={3} defaultValue={row.suggestionForSales || ""} disabled={!editable} style={fieldStyle} /></label>
                {editable ? <button type="submit">{t(lang, "Submit Assessment", "提交评估")}</button> : <div style={{ color: "#64748b" }}>{t(lang, "Submitted and locked.", "已提交并锁定。")}</div>}
              </form>
            </details>
          );
        })}
      </section>
    </main>
  );
}
