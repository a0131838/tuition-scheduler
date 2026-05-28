import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import {
  buildLeadSourceChannelName,
  buildLeadStudentNote,
  formatLeadDateInput,
  LEAD_ASSESSMENT_STATUSES,
  LEAD_FOLLOW_UP_CHANNELS,
  LEAD_INTENT_LEVELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  normalizeLeadFlexibleOption,
  normalizeLeadOption,
  normalizeLeadText,
  parseLeadDateTime,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation, SCHEDULING_COORDINATION_TICKET_TYPE } from "@/lib/tickets";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

function read(formData: FormData, key: string, max = 500) {
  return normalizeLeadText(formData.get(key), max);
}

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string) {
  const item = LEAD_STATUS_LABELS[status];
  if (!item) return status;
  return t(lang, item.en, item.zh);
}

async function addFollowUpAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = read(formData, "id", 80);
  const content = read(formData, "content", 2000);
  if (!id || !content) redirect("/admin/leads");
  const nextStatus = normalizeLeadOption(formData.get("nextStatus"), LEAD_STATUSES, "");
  const intentLevelAfter = normalizeLeadOption(formData.get("intentLevelAfter"), LEAD_INTENT_LEVELS, "");
  const nextAction = read(formData, "nextAction", 500);
  const nextActionDue = parseLeadDateTime(formData.get("nextActionDue"));
  const lostReason = read(formData, "lostReason", 1000);
  const channel = normalizeLeadFlexibleOption(formData.get("channel"), LEAD_FOLLOW_UP_CHANNELS, "微信");
  await prisma.$transaction(async (tx) => {
    await tx.leadFollowUp.create({
      data: {
        leadId: id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        channel,
        content,
        nextAction: nextAction || null,
        nextActionDue,
        nextStatus: nextStatus || null,
        intentLevelAfter: intentLevelAfter || null,
      },
    });
    await tx.lead.update({
      where: { id },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(intentLevelAfter ? { intentLevel: intentLevelAfter } : {}),
        nextAction: nextAction || null,
        nextActionDue,
        latestSummary: content,
        ...(nextStatus === "Lost" && lostReason ? { lostReason } : {}),
      },
    });
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  redirect(`/admin/leads/${id}?ok=followup`);
}

async function createAssessmentAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = read(formData, "id", 80);
  const teacherId = read(formData, "teacherId", 80);
  if (!id || !teacherId) redirect(`/admin/leads/${id}`);
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true } });
  if (!teacher) redirect(`/admin/leads/${id}?err=teacher`);
  await prisma.$transaction(async (tx) => {
    await tx.leadAssessmentRequest.create({
      data: {
        leadId: id,
        teacherId: teacher.id,
        teacherName: teacher.name,
        dueAt: parseLeadDateTime(formData.get("dueAt")),
        status: "Pending",
      },
    });
    await tx.lead.update({
      where: { id },
      data: {
        status: "Need Assessment",
        nextAction: `Waiting for teacher assessment: ${teacher.name}`,
        nextActionDue: parseLeadDateTime(formData.get("dueAt")),
      },
    });
  });
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/teacher/assessments");
  redirect(`/admin/leads/${id}?ok=assessment`);
}

async function reopenAssessmentAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = read(formData, "id", 80);
  const assessmentId = read(formData, "assessmentId", 80);
  const note = read(formData, "reopenNote", 1000);
  if (!id || !assessmentId) redirect("/admin/leads");
  await prisma.leadAssessmentRequest.update({
    where: { id: assessmentId },
    data: {
      status: "Revision Requested",
      reopenedAt: new Date(),
      reopenedByUserId: user.id,
      reopenNote: note || null,
    },
  });
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/teacher/assessments");
  redirect(`/admin/leads/${id}?ok=reopened`);
}

async function convertToStudentAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = read(formData, "id", 80);
  if (!id) redirect("/admin/leads");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin/leads");
  if (lead.convertedStudentId) redirect(`/admin/students/${lead.convertedStudentId}`);
  const sourceName = buildLeadSourceChannelName(lead);
  const created = await prisma.$transaction(async (tx) => {
    const source = await tx.studentSourceChannel.upsert({
      where: { name: sourceName },
      update: { isActive: true },
      create: { name: sourceName },
      select: { id: true },
    });
    const student = await tx.student.create({
      data: {
        name: lead.studentName,
        grade: lead.grade,
        school: lead.school,
        coachingContent: lead.needs,
        targetSchool: lead.target,
        sourceChannelId: source.id,
        note: buildLeadStudentNote(lead),
        nextAction: lead.nextAction,
        nextActionDue: lead.nextActionDue,
        advisorOwner: lead.ownerName,
      },
      select: { id: true },
    });
    await tx.lead.update({
      where: { id },
      data: {
        convertedStudentId: student.id,
        convertedSourceChannelId: source.id,
        status: "Won",
        latestSummary: `Converted to student / 已转为学生`,
      },
    });
    return student;
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/students");
  redirect(`/admin/students/${created.id}`);
}

async function createSchedulingTicketAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = read(formData, "id", 80);
  const lead = id
    ? await prisma.lead.findUnique({ where: { id }, include: { convertedStudent: { select: { id: true, name: true, grade: true } } } })
    : null;
  if (!lead) redirect("/admin/leads");
  if (!lead.convertedStudentId) redirect(`/admin/leads/${lead.id}?err=convert-first`);
  if (lead.schedulingTicketId) redirect(`/admin/tickets/${lead.schedulingTicketId}`);
  const due = lead.nextActionDue ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const created = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    const ticket = await tx.ticket.create({
      data: {
        ticketNo,
        studentId: lead.convertedStudentId,
        source: "自营学生",
        type: SCHEDULING_COORDINATION_TICKET_TYPE,
        priority: lead.intentLevel === "Hot" ? "24小时紧急" : "普通",
        studentName: lead.studentName,
        grade: lead.grade,
        course: lead.preferredCourse,
        poc: lead.parentName,
        wechat: lead.parentWechat,
        phone: lead.parentPhone,
        status: "Need Info",
        owner: lead.ownerName || user.name,
        summary: composeTicketSituation({
          currentIssue: `Resource ${lead.leadNo} converted from ${lead.sourceType}${lead.sourcePlatform ? ` / ${lead.sourcePlatform}` : ""}. Needs: ${lead.needs || "-"}`,
          requiredAction: lead.nextAction || "Confirm parent availability and continue scheduling coordination.",
          latestDeadlineText: due.toISOString().slice(0, 16),
        }),
        nextAction: lead.nextAction || "Confirm parent availability and continue scheduling coordination.",
        nextActionDue: due,
        createdByName: user.name,
      },
      select: { id: true },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { schedulingTicketId: ticket.id } });
    return ticket;
  });
  revalidatePath(`/admin/leads/${lead.id}`);
  revalidatePath("/admin/tickets");
  redirect(`/admin/tickets/${created.id}`);
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const { id } = await params;
  const sp = await searchParams;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      followUps: { orderBy: { createdAt: "desc" }, take: 50 },
      assessmentRequests: { include: { teacher: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      convertedStudent: { select: { id: true, name: true } },
    },
  });
  if (!lead) notFound();
  const [teachers] = await Promise.all([
    prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  const fieldStyle = { minHeight: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" } as const;
  const labelStyle = { display: "grid", gap: 5, fontWeight: 800, fontSize: 13 } as const;
  const banner =
    sp?.ok === "created" ? t(lang, "Resource created.", "资源已创建。")
    : sp?.ok === "followup" ? t(lang, "Follow-up saved.", "跟进已保存。")
    : sp?.ok === "assessment" ? t(lang, "Assessment request created.", "老师评估已派发。")
    : sp?.ok === "reopened" ? t(lang, "Assessment revision approved.", "已批准老师重新修改评估。")
    : "";
  const error = sp?.err === "convert-first" ? t(lang, "Convert this resource to a student before creating a scheduling ticket.", "请先把资源转为学生，再创建排课协调工单。") : "";

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <p><Link href="/admin/leads">{t(lang, "Back to resources", "返回资源列表")}</Link></p>
      {banner ? <div style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: 10 }}>{banner}</div> : null}
      {error ? <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: 10 }}>{error}</div> : null}

      <section style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#1d4ed8", fontWeight: 900 }}>{lead.leadNo}</div>
            <h2 style={{ margin: "4px 0" }}>{lead.studentName}</h2>
            <div style={{ color: "#475569" }}>{lead.parentName || "-"} · {lead.parentWechat || lead.parentPhone || "-"}</div>
          </div>
          <div style={{ display: "grid", gap: 6, minWidth: 240 }}>
            <div><b>{t(lang, "Status", "状态")}</b>: {statusLabel(lang, lead.status)}</div>
            <div><b>{t(lang, "Intent", "意向")}</b>: {lead.intentLevel}</div>
            <div><b>{t(lang, "Owner", "负责人")}</b>: {lead.ownerName || "-"}</div>
            <div><b>{t(lang, "Source", "来源")}</b>: {lead.sourceType}{lead.sourcePlatform ? ` / ${lead.sourcePlatform}` : ""}</div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(320px, 1.1fr)", gap: 14 }}>
        <aside style={{ display: "grid", gap: 12 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>{t(lang, "Profile", "资源信息")}</h3>
            {[
              [t(lang, "Grade", "年级"), lead.grade],
              [t(lang, "School", "学校"), lead.school],
              [t(lang, "Course", "课程"), lead.preferredCourse],
              [t(lang, "Budget", "预算"), lead.budgetRange],
              [t(lang, "Urgency", "紧急程度"), lead.urgency],
              [t(lang, "Target", "目标"), lead.target],
              [t(lang, "Needs", "需求"), lead.needs],
              [t(lang, "Source detail", "来源备注"), lead.sourceDetail],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ marginBottom: 8 }}><b>{k}</b><div style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{v || "-"}</div></div>
            ))}
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff", display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Ops Handoff", "教务承接")}</h3>
            {lead.convertedStudent ? (
              <Link href={`/admin/students/${lead.convertedStudent.id}`}>{t(lang, "Open converted student", "打开已转学生")} · {lead.convertedStudent.name}</Link>
            ) : (
              <form action={convertToStudentAction}>
                <input type="hidden" name="id" value={lead.id} />
                <button type="submit">{t(lang, "Convert to Student", "转为学生")}</button>
              </form>
            )}
            <form action={createSchedulingTicketAction}>
              <input type="hidden" name="id" value={lead.id} />
              <button type="submit">{lead.schedulingTicketId ? t(lang, "Open Scheduling Ticket", "打开排课协调工单") : t(lang, "Create Scheduling Ticket", "创建排课协调工单")}</button>
            </form>
          </div>
        </aside>

        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>{t(lang, "Add Follow-up", "新增跟进")}</h3>
            <form action={addFollowUpAction} style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="id" value={lead.id} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <label style={labelStyle}>{t(lang, "Channel", "渠道")}<select name="channel" defaultValue="微信" style={fieldStyle}>{LEAD_FOLLOW_UP_CHANNELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label style={labelStyle}>{t(lang, "Next status", "下一状态")}<select name="nextStatus" defaultValue={lead.status} style={fieldStyle}>{LEAD_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(lang, item)}</option>)}</select></label>
                <label style={labelStyle}>{t(lang, "Intent", "意向")}<select name="intentLevelAfter" defaultValue={lead.intentLevel} style={fieldStyle}>{LEAD_INTENT_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              </div>
              <label style={labelStyle}>{t(lang, "Content", "跟进内容")}*<textarea name="content" required rows={4} style={fieldStyle} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <label style={labelStyle}>{t(lang, "Next action", "下一步动作")}<input name="nextAction" defaultValue={lead.nextAction || ""} style={fieldStyle} /></label>
                <label style={labelStyle}>{t(lang, "Due", "截止时间")}<input name="nextActionDue" type="datetime-local" defaultValue={formatLeadDateInput(lead.nextActionDue)} style={fieldStyle} /></label>
              </div>
              <label style={labelStyle}>{t(lang, "Lost reason", "流失原因")}<textarea name="lostReason" rows={2} defaultValue={lead.lostReason || ""} style={fieldStyle} /></label>
              <button type="submit">{t(lang, "Save Follow-up", "保存跟进")}</button>
            </form>
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>{t(lang, "Teacher Assessment", "老师评估")}</h3>
            <form action={createAssessmentAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <input type="hidden" name="id" value={lead.id} />
              <select name="teacherId" required style={fieldStyle}>
                <option value="">{t(lang, "Select teacher", "选择老师")}</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
              </select>
              <input name="dueAt" type="datetime-local" style={fieldStyle} />
              <button type="submit">{t(lang, "Request Assessment", "派发评估")}</button>
            </form>
            <div style={{ display: "grid", gap: 10 }}>
              {lead.assessmentRequests.length === 0 ? <div style={{ color: "#64748b" }}>{t(lang, "No assessment requested yet.", "暂未派发老师评估。")}</div> : null}
              {lead.assessmentRequests.map((item) => (
                <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <b>{item.teacherName}</b>
                    <span>{item.status}{item.dueAt ? ` · ${formatBusinessDateTime(item.dueAt)}` : ""}</span>
                  </div>
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "#334155" }}>
                    <b>{t(lang, "Level", "水平")}</b>: {item.studentLevel || "-"}{"\n"}
                    <b>{t(lang, "Problems", "问题")}</b>: {item.academicProblems || "-"}{"\n"}
                    <b>{t(lang, "Recommendation", "建议")}</b>: {[item.recommendedCourse, item.recommendedFrequency, item.recommendedPackage].filter(Boolean).join(" / ") || "-"}{"\n"}
                    <b>{t(lang, "Risks", "风险")}</b>: {item.risks || "-"}{"\n"}
                    <b>{t(lang, "Sales note", "销售建议")}</b>: {item.suggestionForSales || "-"}
                  </div>
                  {item.status === "Submitted" ? (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: "pointer", color: "#1d4ed8", fontWeight: 800 }}>{t(lang, "Approve revision", "批准老师重新修改")}</summary>
                      <form action={reopenAssessmentAction} style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        <input type="hidden" name="id" value={lead.id} />
                        <input type="hidden" name="assessmentId" value={item.id} />
                        <textarea name="reopenNote" rows={2} placeholder={t(lang, "Reason or requested change", "原因或需要修改的内容")} style={fieldStyle} />
                        <button type="submit">{t(lang, "Approve Re-edit", "批准重改")}</button>
                      </form>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>{t(lang, "Follow-up Timeline", "跟进记录")}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {lead.followUps.map((item) => (
                <div key={item.id} style={{ borderLeft: "3px solid #93c5fd", paddingLeft: 10 }}>
                  <div style={{ fontWeight: 900 }}>{item.actorName} · {item.channel} · {formatBusinessDateTime(item.createdAt)}</div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>{item.content}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{item.nextStatus || "-"} · {item.nextAction || "-"} · {item.nextActionDue ? formatBusinessDateTime(item.nextActionDue) : "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
