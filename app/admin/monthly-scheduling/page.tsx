import {verifyMonthlyClosure} from '@/lib/monthly-closure-verification';
import { MONTHLY_STAFF_STATUS_CHOICES } from "@/lib/monthly-scheduling-status-policy";
import MonthlyStatusForm from "./MonthlyStatusForm";
import { isFormalMonthlyLesson, monthlyCompletionCandidates, readMonthlyScheduleEvidence } from "@/lib/monthly-scheduling-completion";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./monthly.module.css";
import { getLang, t, type Lang } from "@/lib/i18n";
import { requireMonthlySchedulingUser } from "@/lib/monthly-scheduling-access";
import {
  buildMonthlyStaffingReport,
  buildMonthlyMatchSuggestions,
  createMonthlySchedulingCampaign,
  getMonthlySchedulingCampaign,
  listMonthlySchedulingQualifiedTeachers,
  itemStatusLabels,
  monthlySchedulingExceptionReason,
  monthlySchedulingCohortForSourceName,
  monthlySchedulingFamilyCanKeep,
  monthlySchedulingQueueLane,
  monthlySchedulingOfferView,
  monthlySchedulingMonthKey,
  monthlySchedulingParentMessageFromTemplate,
  MONTHLY_SCHEDULING_CAMPAIGN_STATUSES,
  MONTHLY_SCHEDULING_ITEM_STATUSES,
  MONTHLY_SCHEDULING_INTENTS,
  MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES,
  MONTHLY_SCHEDULING_RESPONSE_CHANNELS,
  nextMonthlySchedulingMonth,
  rankMonthlySchedulingOffersByStaff,
  responseChannelLabels,
  intentLabels,
  setMonthlySchedulingCampaignStatus,
  submitMonthlySchedulingPreferenceByStaff,
  submitMonthlySchedulingFamilyKeepByStaff,
  syncMonthlySchedulingCampaignItems,
  updateMonthlySchedulingItem,
  type MonthlySchedulingCampaignStatus,
  type MonthlySchedulingCohort,
  type MonthlySchedulingIntent,
  type MonthlySchedulingItemStatus,
  type MonthlySchedulingResponseChannel,
} from "@/lib/monthly-scheduling";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #dbe5f2",
  padding: 20,
  display: "grid",
  gap: 14,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #bfd0e8",
  background: "#f7faff",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const displayLabels: Record<string,[string,string]> = {"DRAFT": ["Draft", "草稿"], "OPEN": ["Open", "开放填写"], "CLOSED": ["Closed", "已关闭"], "ARCHIVED": ["Archived", "已归档"], "AVAILABLE": ["Available", "可选择"], "HELD": ["Temporarily held", "临时保留"], "ACCEPTED": ["Accepted", "已确认"], "COMPLETED": ["Completed", "已完成"], "WITHDRAWN": ["Withdrawn", "已撤回"], "EXPIRED": ["Expired", "已过期"], "ONLINE": ["Online", "线上"], "OFFLINE": ["In person", "线下"], "RED": ["High risk", "高风险"], "AMBER": ["Needs attention", "需关注"], "GREEN": ["Within capacity", "容量内"], "MON": ["Mon", "周一"], "TUE": ["Tue", "周二"], "WED": ["Wed", "周三"], "THU": ["Thu", "周四"], "FRI": ["Fri", "周五"], "SAT": ["Sat", "周六"], "SUN": ["Sun", "周日"], "REQUIRED": ["Required", "必须满足"], "PREFERRED": ["Preferred", "优先选择"], "ACCEPTABLE": ["Acceptable", "可以接受"]};
function displayLabel(lang: Lang, value: string | null | undefined) { return value && displayLabels[value] ? t(lang,...displayLabels[value]) : value || "-"; }

function hours(minutes: number | null | undefined) {
  return `${((minutes ?? 0) / 60).toFixed(1)}h`;
}

function currentRows(value: unknown) {
  return Array.isArray(value) ? value as Array<{ startText?: string; weekdayLabel?: string; start?: string; end?: string; teacher?: string | null; campus?: string | null; sourceCount?: number }> : [];
}

function availabilityValue(value: unknown) {
  const row = value && typeof value === "object" ? value as { weekdays?: unknown; timeRanges?: unknown } : {};
  return {
    weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(String) : [],
    timeRanges: Array.isArray(row.timeRanges)
      ? row.timeRanges.slice(0, 3).map((entry, index) => ({ start: String((entry as any)?.start ?? ""), end: String((entry as any)?.end ?? ""), priority: String((entry as any)?.priority ?? (["REQUIRED", "PREFERRED", "ACCEPTABLE"][index] ?? "ACCEPTABLE")) }))
      : [],
  };
}

function dateInputValue(value: Date | null | undefined) {
  return value ? formatBusinessDateOnly(value) : formatBusinessDateOnly(new Date());
}

function offerOptionLabel(lang: Lang, option: { weekdayLabel: string; startMin: number; endMin: number; teacher: { name: string } }) {
  const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return `${displayLabel(lang,option.weekdayLabel)} ${time(option.startMin)}-${time(option.endMin)} · ${option.teacher.name}`;
}

function proxyAvailabilityFromForm(formData: FormData) {
  const timeRanges = [1, 2, 3].map((index) => ({
    start: String(formData.get(`timeStart${index}`) ?? ""),
    end: String(formData.get(`timeEnd${index}`) ?? ""),
    priority: String(formData.get(`timePriority${index}`) ?? (["REQUIRED", "PREFERRED", "ACCEPTABLE"][index - 1] ?? "ACCEPTABLE")),
  })).filter((row) => row.start && row.end && row.end > row.start);
  return {
    selectionMode: "weekly",
    weekdays: formData.getAll("weekday").map(String),
    timeRanges,
    dateSelections: [],
  };
}

function proxyUnavailableDates(formData: FormData) {
  return String(formData.get("unavailableDates") ?? "").split(/[\s,，;；]+/).map((value) => value.trim()).filter(Boolean);
}

function optionalFormNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? Number(value) : null;
}

function monthlySchedulingRedirectPath(month: string, formData: FormData, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ month, cohort: formData.get("cohort") === "XDF" ? "XDF" : "BOSS_OTHER", ...params });
  return `/admin/monthly-scheduling?${query.toString()}`;
}

async function createCampaignAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const month = String(formData.get("month") ?? "");
  const campaign = await createMonthlySchedulingCampaign({ month, actor: { id: access.user.id, name: access.user.name } });
  await syncMonthlySchedulingCampaignItems(campaign.id);
  redirect(monthlySchedulingRedirectPath(month, formData));
}

async function syncCampaignAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const campaignId = String(formData.get("campaignId") ?? "");
  const month = String(formData.get("month") ?? "");
  await syncMonthlySchedulingCampaignItems(campaignId);
  revalidatePath("/admin/monthly-scheduling");
  redirect(monthlySchedulingRedirectPath(month, formData, { notice: "Roster refreshed" }));
}

async function campaignStatusAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const campaignId = String(formData.get("campaignId") ?? "");
  const status = String(formData.get("status") ?? "") as MonthlySchedulingCampaignStatus;
  const month = String(formData.get("month") ?? "");
  if (!MONTHLY_SCHEDULING_CAMPAIGN_STATUSES.includes(status)) throw new Error("Invalid campaign status");
  await setMonthlySchedulingCampaignStatus(campaignId, status);
  revalidatePath("/admin/monthly-scheduling");
  redirect(monthlySchedulingRedirectPath(month, formData));
}

async function itemStatusAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const itemId = String(formData.get("itemId") ?? "");
  const status = String(formData.get("status") ?? "") as MonthlySchedulingItemStatus;
  const expectedStatus = String(formData.get("expectedStatus") ?? "") as MonthlySchedulingItemStatus;
  const month = String(formData.get("month") ?? "");
  if (!MONTHLY_SCHEDULING_ITEM_STATUSES.includes(status)) throw new Error("Invalid item status");
  try {
    await updateMonthlySchedulingItem({
      itemId,status,expectedStatus, expectedUpdatedAt:String(formData.get("expectedUpdatedAt")??'')||undefined,
      ownerUserId:access.user.id,ownerName:access.user.name,
      internalNote:String(formData.get("internalNote")??'').trim().slice(0,1000)||null,
      sessionIds:formData.getAll("sessionId").map(String),
      expectedSessionCount:Number(formData.get("expectedSessionCount")??0),
      completionReason:String(formData.get("completionReason")??'').slice(0,2000),
    });
  } catch(error) {
    return monthlySchedulingRedirectPath(month,formData,{notice:error instanceof Error?error.message:'Verification failed / 核验失败',noticeTone:'error'});
  }
  revalidatePath("/admin/monthly-scheduling");
  return monthlySchedulingRedirectPath(month, formData, { status });
}

async function closureVerificationAction(formData: FormData) {
  "use server";
  const access=await requireMonthlySchedulingUser();
  if(!access.canManage)throw Error("Read-only access / 仅可查看");
  const month=String(formData.get("month")??"");
  try {
    await verifyMonthlyClosure({itemId:String(formData.get("itemId")??""),actorUserId:access.user.id,
      expectedStatus:String(formData.get("expectedStatus")??""),expectedUpdatedAt:String(formData.get("expectedUpdatedAt")??""),
      reason:String(formData.get("reason")??""),withdrawOptions:formData.get("withdrawOptions")==="yes"});
  } catch(error) { return monthlySchedulingRedirectPath(month,formData,{notice:error instanceof Error?error.message:"Verification failed / 核验失败",noticeTone:"error"}); }
  revalidatePath("/admin/monthly-scheduling");
  return monthlySchedulingRedirectPath(month,formData,{notice:"Closure verified / 暂停或排除结果已核验"});
}

async function proxyPreferenceAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const month = String(formData.get("month") ?? "");
  const row = await submitMonthlySchedulingPreferenceByStaff({
    itemId: String(formData.get("itemId") ?? ""),
    expectedStatus: String(formData.get("expectedStatus") ?? "") as MonthlySchedulingItemStatus,
    expectedUpdatedAt:String(formData.get("expectedUpdatedAt")??'')||undefined,
    intent: String(formData.get("intent") ?? "") as MonthlySchedulingIntent,
    expectedSessionsPerWeek: optionalFormNumber(formData, "expectedSessionsPerWeek"),
    expectedMinutes: optionalFormNumber(formData, "expectedMinutes"),
    preferredMode: String(formData.get("preferredMode") ?? ""),
    preferredCampus: String(formData.get("preferredCampus") ?? ""),
    preferredTeacher: String(formData.get("preferredTeacher") ?? ""),
    preferredTeacherId: String(formData.get("preferredTeacherId") ?? ""),
    teacherPreferenceType: String(formData.get("teacherPreferenceType") ?? "NONE") as any,
    teacherPreferenceNote: String(formData.get("teacherPreferenceNote") ?? ""),
    availability: proxyAvailabilityFromForm(formData),
    unavailableDates: proxyUnavailableDates(formData),
    parentNotes: String(formData.get("parentNotes") ?? ""),
    responseChannel: String(formData.get("responseChannel") ?? "") as MonthlySchedulingResponseChannel,
    parentConfirmationNote: String(formData.get("parentConfirmationNote") ?? ""),
    parentConfirmedAt: String(formData.get("parentConfirmedAt") ?? ""),
    actorUserId: access.user.id,
    actorEmail: access.user.email,
    actorName: access.user.name,
    actorRole: access.user.role,
  });
  revalidatePath("/admin/monthly-scheduling");
  redirect(monthlySchedulingRedirectPath(month, formData, { status: row.status, notice: "Parent response entered by staff" }));
}

async function proxyRankOffersAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const month = String(formData.get("month") ?? "");
  const offerIds = ["rank1", "rank2", "rank3"].map((name) => String(formData.get(name) ?? "")).filter(Boolean);
  await rankMonthlySchedulingOffersByStaff({
    itemId: String(formData.get("itemId") ?? ""),
    offerIds,
    responseChannel: String(formData.get("responseChannel") ?? "") as MonthlySchedulingResponseChannel,
    parentConfirmationNote: String(formData.get("parentConfirmationNote") ?? ""),
    parentConfirmedAt: String(formData.get("parentConfirmedAt") ?? ""),
    actorUserId: access.user.id,
    actorEmail: access.user.email,
    actorName: access.user.name,
    actorRole: access.user.role,
  });
  revalidatePath("/admin/monthly-scheduling");
  redirect(monthlySchedulingRedirectPath(month, formData, { status: "PARENT_SELECTED", notice: "Parent choices recorded by staff" }));
}

async function proxyFamilyKeepAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const month = String(formData.get("month") ?? "");
  const result = await submitMonthlySchedulingFamilyKeepByStaff({
    campaignId: String(formData.get("campaignId") ?? ""),
    seedItemId: String(formData.get("seedItemId") ?? ""),
    responseChannel: String(formData.get("responseChannel") ?? "WECHAT_GROUP") as MonthlySchedulingResponseChannel,
    parentConfirmationNote: String(formData.get("parentConfirmationNote") ?? ""),
    parentConfirmedAt: String(formData.get("parentConfirmedAt") ?? ""),
    actorUserId: access.user.id,
    actorEmail: access.user.email,
    actorName: access.user.name,
    actorRole: access.user.role,
  });
  revalidatePath("/admin/monthly-scheduling");
  redirect(monthlySchedulingRedirectPath(month, formData, { notice: `Recorded ${result.count} family items as keep current` }));
}

async function createExceptionTicketAction(formData: FormData) {
  "use server";
  const access = await requireMonthlySchedulingUser();
  if (!access.canManage) throw new Error("Read-only access");
  const itemId = String(formData.get("itemId") ?? "");
  const month = String(formData.get("month") ?? "");
  const item = await prisma.monthlySchedulingItem.findUnique({
    where: { id: itemId },
    include: { student: true, course: true },
  });
  if (!item) throw new Error("Scheduling item not found");
  if ((item.intent !== "CHANGE" && item.status !== "CHANGE_REQUESTED") || !["SUBMITTED", "NEEDS_CLARIFICATION", "MATCHED", "CHANGE_REQUESTED"].includes(item.status)) {
    throw new Error("Only an active change request can create a teacher exception ticket");
  }
  const tag = `[MONTHLY_SCHEDULING_ITEM:${item.id}]`;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.monthlySchedulingItem.updateMany({
      where: { id: item.id, status: item.status, ...(item.status === "CHANGE_REQUESTED" ? {} : { intent: "CHANGE" }) },
      data: { status: "TEACHER_EXCEPTION", ownerUserId: access.user.id, ownerName: access.user.name },
    });
    if (claimed.count !== 1) return;
    const duplicate = await tx.ticket.findFirst({ where: { summary: { contains: tag }, isArchived: false }, select: { id: true } });
    if (!duplicate) {
      const ticketNo = await allocateTicketNo(tx);
      await tx.ticket.create({
        data: {
          ticketNo,
          studentId: item.studentId,
          studentName: item.student.name,
          source: "自营学生",
          type: "排课协调",
          priority: "普通",
          course: item.course.name,
          status: "Waiting Teacher",
          owner: access.user.name,
          summary: `${tag} ${month} ${item.student.name} / ${item.course.name} teacher availability exception`,
          nextAction: "Confirm a teacher exception or provide alternative parent-backed options.",
          parentVisible: false,
          createdByName: access.user.name,
          risksNotes: composeTicketSituation({
            currentIssue: `No standard teacher availability match for ${item.student.name} / ${item.course.name} in ${month}.`,
            requiredAction: "Confirm a qualified teacher exception or return alternative choices to the family.",
            latestDeadlineText: "Before the next-month draft schedule is locked.",
          }),
        },
      });
    }
  });
  revalidatePath("/admin/monthly-scheduling");
  redirect(monthlySchedulingRedirectPath(month, formData, { status: "TEACHER_EXCEPTION" }));
}

export default async function MonthlySchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; lane?: string; cohort?: string; notice?: string; noticeTone?: string }>;
}) {
  const access = await requireMonthlySchedulingUser();
  const lang = await getLang();
  const queueHeaders = [["Student", "学生"], ["Course", "课程"], ["Current arrangement", "当前安排"], ["Parent intent", "家长意向"], ["Suggested options", "匹配建议"], ["Expected hours", "预计课时"], ["Status", "状态"], ["Owner and actions", "负责人及处理"]].map(([en,zh])=>t(lang,en,zh));
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : nextMonthlySchedulingMonth();
  const selectedStatus = MONTHLY_SCHEDULING_ITEM_STATUSES.includes(params.status as MonthlySchedulingItemStatus)
    ? params.status as MonthlySchedulingItemStatus
    : "ALL";
  const selectedLane = ["READY_CONFIRM", "WAITING_PARENT", "EXCEPTIONS", "COMPLETED"].includes(params.lane ?? "") ? params.lane! : null;
  const selectedCohort: MonthlySchedulingCohort = params.cohort === "XDF" ? "XDF" : "BOSS_OTHER";
  const campaign = await getMonthlySchedulingCampaign(month);
  const [report, matchSuggestions, teacherOptionsByCourse]: [Awaited<ReturnType<typeof buildMonthlyStaffingReport>> | null, Awaited<ReturnType<typeof buildMonthlyMatchSuggestions>>, Awaited<ReturnType<typeof listMonthlySchedulingQualifiedTeachers>>] = campaign
    ? await Promise.all([buildMonthlyStaffingReport(campaign.id, selectedCohort), buildMonthlyMatchSuggestions(campaign.id), listMonthlySchedulingQualifiedTeachers(campaign.items.map((row) => row.courseId))])
    : [null, new Map<string, Array<{ teacherId: string; teacherName: string; date: string; start: string; end: string; startAt: string; endAt: string }>>(), new Map<string, Array<{ id: string; name: string }>>()];
  const formalCandidates = campaign ? await monthlyCompletionCandidates(campaign.month, [...new Set(campaign.items.map(row=>row.courseId))]) : [];
  const pastOptions=campaign?await prisma.monthlySchedulingOffer.findMany({where:{itemId:{in:campaign.items.map(item=>item.id)},status:{in:['WITHDRAWN','EXPIRED']}},include:{teacher:{select:{name:true}}},orderBy:{createdAt:'desc'},take:500}):[];
  const cohortItems = campaign?.items.filter((row) => monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === selectedCohort) ?? [];
  const cohortCounts = {
    BOSS_OTHER: campaign?.items.filter((row) => monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === "BOSS_OTHER" && row.status !== "EXCLUDED").length ?? 0,
    XDF: campaign?.items.filter((row) => monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === "XDF" && row.status !== "EXCLUDED").length ?? 0,
  };
  const items = cohortItems.filter((row) => selectedLane ? monthlySchedulingQueueLane(row) === selectedLane : selectedStatus === "ALL" || row.status === selectedStatus);
  const counts = Object.fromEntries(MONTHLY_SCHEDULING_ITEM_STATUSES.map((status) => [status, cohortItems.filter((row) => row.status === status).length]));
  const laneCounts = Object.fromEntries(["READY_CONFIRM", "WAITING_PARENT", "EXCEPTIONS", "COMPLETED"].map((lane) => [lane, cohortItems.filter((row) => monthlySchedulingQueueLane(row) === lane).length]));
  const familyGroups = new Map<string, typeof campaign extends null ? never : NonNullable<typeof campaign>["items"]>();
  for (const item of cohortItems) {
    if (item.status === "EXCLUDED") continue;
    const key = item.parentId ?? `STUDENT:${item.studentId}`;
    familyGroups.set(key, [...(familyGroups.get(key) ?? []), item]);
  }
  const familyMessages = new Map<string, string>();
  for (const [key, rows] of familyGroups) {
    const first = rows[0];
    if (!first) continue;
    familyMessages.set(key, await monthlySchedulingParentMessageFromTemplate({ parentName: first.parent?.name, month, dueAt: campaign?.dueAt, students: rows.map((row) => ({ studentName: row.student.name, courseName: row.course.name })) }));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={{ ...sectionStyle, borderTop: "6px solid #f45b05", background: "#fffdf9" }}>
        <div>
          <div style={{ color: "#b74807", fontWeight: 800 }}>{t(lang, "Next-month Scheduling", "下月排课管理")}</div>
          <h1 style={{ margin: "6px 0", fontSize: 30 }}>{t(lang, "Scheduling confirmation and staffing", "排课确认与师资预测")}</h1>
          <p style={{ margin: 0, color: "#526071" }}>{t(lang, "Collect one response per student and course, then match and schedule after academic review.", "按每名学生、每门课程收集需求，教务审核匹配后再进入正式课表。")}</p>
        </div>
        <form action={createCampaignAction} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label>{t(lang, "Target month", "目标月份")}<br /><input name="month" type="month" defaultValue={month} required style={{ padding: 10, minWidth: 180 }} /></label>
          <input type="hidden" name="cohort" value={selectedCohort} />
          <button style={buttonStyle}>{campaign ? t(lang, "Open selected month", "打开所选月份") : t(lang, "Create campaign", "创建活动")}</button>
          {campaign && <Link href={`/admin/monthly-scheduling/export?month=${month}&cohort=${selectedCohort}`} style={{ ...buttonStyle, textDecoration: "none", color: "#10243e" }}>{t(lang, "Export current group", "导出当前分组")}</Link>}
        </form>
        {params.notice && <div style={{ padding: 10, background: params.noticeTone === "error" ? "#fff0f0" : "#eafaf0", color: params.noticeTone === "error" ? "#b42318" : "#17663a" }}>{params.notice}</div>}
      </section>

      {!campaign ? (
        <section style={sectionStyle}><strong>{t(lang, "No campaign exists for this month.", "这个月份尚未建立排课确认活动。")}</strong></section>
      ) : (
        <>
          <section style={sectionStyle}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <strong>{t(lang, "Student group", "学生分组")}</strong>
              {([ ["BOSS_OTHER", t(lang, "Boss and other students", "博思及其他")], ["XDF", t(lang, "New Oriental students", "新东方学生")] ] as const).map(([cohort, label]) => (
                <Link key={cohort} href={`/admin/monthly-scheduling?month=${month}&cohort=${cohort}${selectedLane ? `&lane=${selectedLane}` : selectedStatus !== "ALL" ? `&status=${selectedStatus}` : ""}`} style={{ ...buttonStyle, textDecoration: "none", color: "#10243e", background: selectedCohort === cohort ? "#dce9ff" : "#f7faff" }}>{label} ({cohortCounts[cohort]})</Link>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{month} · {displayLabel(lang,campaign.status)}</h2>
                <div style={{ color: "#526071", marginTop: 6 }}>
                  {t(lang, "Teacher availability due", "老师时间截止")} {campaign.teacherAvailabilityDueAt ? formatBusinessDateOnly(campaign.teacherAvailabilityDueAt) : "-"} · {t(lang, "Parent due", "家长截止")} {campaign.dueAt ? formatBusinessDateOnly(campaign.dueAt) : "-"}
                </div>
              </div>
              {access.canManage && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <form action={syncCampaignAction}><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><button style={buttonStyle}>{t(lang, "Refresh roster", "刷新名单")}</button></form>
                {campaign.status !== "OPEN" && <form action={campaignStatusAction}><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><input type="hidden" name="status" value="OPEN" /><button style={{ ...buttonStyle, background: "#174ea6", color: "#fff" }}>{t(lang, "Open campaign", "开放家长填写")}</button></form>}
                {campaign.status === "OPEN" && <form action={campaignStatusAction}><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><input type="hidden" name="status" value="CLOSED" /><button style={buttonStyle}>{t(lang, "Close campaign", "关闭活动")}</button></form>}
              </div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
              {[
                ["TOTAL", cohortItems.filter((row) => row.status !== "EXCLUDED").length, t(lang, "Students / courses", "学生课程项")],
                ["READY_CONFIRM", laneCounts.READY_CONFIRM, t(lang, "Ready to confirm", "待教务确认")],
                ["WAITING_PARENT", laneCounts.WAITING_PARENT, t(lang, "Waiting parent", "等待家长")],
                ["EXCEPTIONS", laneCounts.EXCEPTIONS, t(lang, "Exceptions only", "例外处理")],
                ["COMPLETED", laneCounts.COMPLETED, t(lang, "Scheduled / paused / excluded", "已核验排课／暂停／排除")],
              ].map(([key, value, label]) => <div key={String(key)} style={{ padding: 14, background: "#f7f9fc", border: "1px solid #dbe5f2" }}><div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div><div style={{ color: "#526071" }}>{label}</div></div>)}
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ margin: 0 }}>{t(lang, "Follow-up queue", "家长跟进工作台")}</h2>
            <p style={{margin:0,color:'#526071'}}>{t(lang,"Record replies through the parent or proxy-response form. A send record is not proof of delivery, reading or a reply. After confirming the arrangement, verify the formal timetable separately.","家长回复请通过家长端或代录入口记录。发送记录不代表送达、已读或已回复。确认安排后，仍须单独核验正式课表。")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/admin/monthly-scheduling?month=${month}&cohort=${selectedCohort}`} style={{ ...buttonStyle, textDecoration: "none", color: "#10243e", background: !selectedLane && selectedStatus === "ALL" ? "#dce9ff" : "#f7faff" }}>{t(lang, "All", "全部")} ({cohortItems.length})</Link>
              {[["READY_CONFIRM", t(lang,"Confirm / verify lessons","确认安排／核验课表")], ["WAITING_PARENT",t(lang,"Waiting for parent","等待家长")], ["EXCEPTIONS",t(lang,"Needs review","待核对")], ["COMPLETED",t(lang,"Scheduled / paused / excluded","已核验排课／暂停／排除")]].map(([lane, label]) => <Link key={lane} href={`/admin/monthly-scheduling?month=${month}&cohort=${selectedCohort}&lane=${lane}`} style={{ ...buttonStyle, textDecoration: "none", color: "#10243e", background: selectedLane === lane ? "#dce9ff" : "#f7faff" }}>{label} ({laneCounts[lane] ?? 0})</Link>)}
              {MONTHLY_SCHEDULING_ITEM_STATUSES.filter((status) => counts[status] > 0).map((status) => <Link key={status} href={`/admin/monthly-scheduling?month=${month}&cohort=${selectedCohort}&status=${status}`} style={{ ...buttonStyle, textDecoration: "none", color: "#10243e", background: selectedStatus === status ? "#dce9ff" : "#f7faff" }}>{t(lang,itemStatusLabels[status].en,itemStatusLabels[status].zh)} ({counts[status]})</Link>)}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className={styles.queue} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead><tr>{queueHeaders.map((label) => <th key={label} style={{ textAlign: "left", padding: 10, borderBottom: "2px solid #cad6e5" }}>{label}</th>)}</tr></thead>
                <tbody>{items.map((item) => {
                  const evidence=readMonthlyScheduleEvidence(item.scheduleEvidenceJson);
                  const candidates=formalCandidates.filter(row=>isFormalMonthlyLesson(row,{studentId:item.studentId,courseId:item.courseId,month:campaign.month}));
                  const schedules = currentRows(item.currentScheduleJson);
                  const carryForward = currentRows(item.carryForwardScheduleJson);
                  const concreteOffers = item.offers ?? [];
                  const availability = availabilityValue(item.availabilityJson);
                  const defaultRanges = [0, 1, 2].map((index) => availability.timeRanges[index] ?? [{ start: "09:00", end: "12:00", priority: "REQUIRED" }, { start: "14:00", end: "18:00", priority: "PREFERRED" }, { start: "19:00", end: "21:00", priority: "ACCEPTABLE" }][index]);
                  const canProxyPreference = MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES.includes(item.status as (typeof MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES)[number]);
                  return <tr key={item.id}>
                    <td data-label={queueHeaders[0]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3" }}><strong>{item.student.name}</strong><br /><small>{item.student.grade || "-"} · {selectedCohort === "XDF" ? t(lang,"New Oriental students","新东方学生") : item.student.sourceChannel?.name || t(lang,"Boss and other students","博思及其他")}</small></td>
                    <td data-label={queueHeaders[1]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3" }}>{item.course.name}<br /><small>{item.package?.remainingMinutes != null ? `${hours(item.package.remainingMinutes)} ${t(lang,"remaining","剩余")}` : item.package?.type ?? "-"}</small></td>
                    <td data-label={queueHeaders[2]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3" }}>{schedules.length ? <><strong>{t(lang, "Target month scheduled", "下月已排")}</strong>{schedules.slice(0, 3).map((row, idx) => <div key={idx}>{row.startText} · {row.teacher || "-"}</div>)}</> : carryForward.length ? <><strong style={{ color: "#17663a" }}>{t(lang, "Carry-forward suggestion", "沿用本月建议")}</strong>{carryForward.slice(0, 3).map((row, idx) => <div key={idx}>{displayLabel(lang,row.weekdayLabel)} {row.start}-{row.end} · {row.teacher || "-"}</div>)}</> : <span style={{ color: "#9a5b00" }}>{t(lang, "No stable arrangement to copy", "没有可沿用的固定安排")}</span>}</td>
                    <td data-label={queueHeaders[3]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3" }}>{item.intent && intentLabels[item.intent as MonthlySchedulingIntent] ? t(lang,intentLabels[item.intent as MonthlySchedulingIntent].en,intentLabels[item.intent as MonthlySchedulingIntent].zh) : "-"}<br /><small>{item.preferredMode ? displayLabel(lang,item.preferredMode) : ""} {item.preferredTeacher || ""}</small></td>
                    <td data-label={queueHeaders[4]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3", minWidth: 220 }}>{concreteOffers.length
                      ? concreteOffers.map((option) => <div key={option.id}><strong>{option.parentRank ? `#${option.parentRank} ` : ""}{displayLabel(lang,option.status)}</strong> · {option.preferenceLevel ? displayLabel(lang,option.preferenceLevel) : t(lang,"Optional","可选")} · {displayLabel(lang,option.weekdayLabel)} {String(Math.floor(option.startMin / 60)).padStart(2, "0")}:{String(option.startMin % 60).padStart(2, "0")} · {option.teacher.name}</div>)
                      : (matchSuggestions.get(item.id) ?? []).length
                      ? (matchSuggestions.get(item.id) ?? []).map((option, index) => <div key={`${option.teacherId}:${option.startAt}`}>{index + 1}. {option.date} {option.start}-{option.end} · {option.teacherName}</div>)
                      : <span style={{ color: item.intent === "CHANGE" ? "#9a5b00" : "#7b8794" }}>{item.intent === "CHANGE" ? t(lang, "No standard match", "暂无标准匹配") : t(lang, "Not required", "无需匹配")}</span>}</td>
                    <td data-label={queueHeaders[5]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3" }}>{item.expectedMinutes != null ? hours(item.expectedMinutes) : item.expectedSessionsPerWeek != null ? `${item.expectedSessionsPerWeek} ${t(lang,"per week","次/周")}` : "-"}</td>
                    <td data-label={queueHeaders[6]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3" }}>
                      <strong>{item.completionNeedsReview ? t(lang,"Recorded as scheduled; needs review","历史标记已排课，待核验") : itemStatusLabels[item.status as MonthlySchedulingItemStatus] ? t(lang,itemStatusLabels[item.status as MonthlySchedulingItemStatus].en,itemStatusLabels[item.status as MonthlySchedulingItemStatus].zh) : item.status}</strong><br />
                      {item.completionNeedsReview && <div style={{color:'#b42318'}}>{t(lang,"Completion evidence missing or lessons changed; review required","完成证据缺失或课次已变化，需重新核验")}</div>}
                      {evidence && <details><summary>{t(lang,"Last verification record","上次核验记录")}</summary><div>{evidence.actorName} · {formatBusinessDateTime(new Date(evidence.verifiedAt))}</div><div>{evidence.reason}</div>{evidence.sessions.map(lesson=><div key={lesson.id}><Link href={`/admin/sessions/${lesson.id}/attendance`}>{formatBusinessDateTime(new Date(lesson.startAt))}</Link></div>)}</details>}
                      <small>{item.parent?.name || t(lang,"No parent linked","未绑定家长")}</small>
                      {monthlySchedulingExceptionReason(item, lang) && <div style={{ marginTop: 6, color: "#b42318", fontSize: 12, fontWeight: 700 }}>{monthlySchedulingExceptionReason(item, lang)}</div>}
                      {item.responseEntryMode === "STAFF_PROXY" && <div style={{ marginTop: 6, color: "#8a4b08", fontSize: 12 }}>
                        {t(lang,"Staff proxy entry","教务代录")} · {item.responseChannel && responseChannelLabels[item.responseChannel as MonthlySchedulingResponseChannel] ? t(lang,responseChannelLabels[item.responseChannel as MonthlySchedulingResponseChannel].en,responseChannelLabels[item.responseChannel as MonthlySchedulingResponseChannel].zh) : "-"}<br />
                        {item.respondedByName || "-"} · {item.parentConfirmedAt ? formatBusinessDateOnly(item.parentConfirmedAt) : "-"}
                      </div>}
                      {pastOptions.some(option=>option.itemId===item.id) && <details style={{marginTop:8}}>
                        <summary>{t(lang,"Prior time options","历次时间方案")}</summary>
                        <p>{t(lang,"Previous proposals are retained here. Withdrawing a proposal does not cancel its formal lessons.","这里保留以前的时间方案。撤回方案不会取消已经排好的正式课程。")}</p>
                        {pastOptions.filter(option=>option.itemId===item.id).map(option=>{const view=monthlySchedulingOfferView(option);return <div key={option.id} style={{marginBottom:8}}><strong>{option.teacher.name}</strong> · {option.generation>0?`${t(lang,"Round","轮次")} ${option.generation}`:t(lang,"Legacy option","历史方案")} · {option.status==='EXPIRED'?t(lang,"Expired","已过期"):t(lang,"Withdrawn","已撤回")} · {formatBusinessDateTime(option.createdAt)}{view.sessionDates.map(date=><div key={date.startAt}>{formatBusinessDateTime(new Date(date.startAt))} – {formatBusinessDateTime(new Date(date.endAt))}</div>)}</div>;})}
                        {pastOptions.length===500 && <small>{t(lang,"Only the latest 500 prior options are displayed for this campaign.","本活动仅显示最近500个历史方案。")}</small>}
                      </details>}
                      {item.offerSelectionEntryMode === "STAFF_PROXY" && <div style={{ marginTop: 6, color: "#17663a", fontSize: 12 }}>
                        代录家长排序 · {item.offerSelectedByName || "-"} · {item.offerParentConfirmedAt ? formatBusinessDateOnly(item.offerParentConfirmedAt) : "-"}
                      </div>}
                    </td>
                    <td data-label={queueHeaders[7]} style={{ padding: 10, borderBottom: "1px solid #e5ebf3", minWidth: 360 }}>
                      <div style={{fontSize:12,marginBottom:6}}>{t(lang,"Owner","负责人")}: {item.ownerName||t(lang,"Unassigned","未分配")}</div>
                      {access.canManage ? <>
                        <MonthlyStatusForm action={itemStatusAction} lang={lang} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                          <input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><input type="hidden" name="expectedStatus" value={item.status} /><input type="hidden" name="expectedUpdatedAt" value={item.updatedAt.toISOString()} />
                          <select name="status" defaultValue={item.status} style={{ padding: 8 }}>{[...new Set([item.status as MonthlySchedulingItemStatus,...MONTHLY_STAFF_STATUS_CHOICES])].map((status) => <option key={status} value={status} disabled={status==="SCHEDULED" && item.status!=="SCHEDULED"}>{t(lang,itemStatusLabels[status].en,itemStatusLabels[status].zh)}</option>)}</select>
                          <button style={buttonStyle}>{t(lang, "Save", "保存")}</button>
                          <input name="internalNote" defaultValue={item.internalNote ?? ""} placeholder={t(lang,"Internal note; reason required for pause / exclusion","内部备注；暂停／排除时必填原因")} style={{ gridColumn: "1 / -1", padding: 8 }} />
                        </MonthlyStatusForm>
                        <p style={{fontSize:12,color:"#475569"}}>{t(lang,"Pause/exclude releases temporary choices only. Confirmed arrangements and formal lessons stay unchanged and need separate timetable review.","暂停／排除仅释放临时候选时间。已确认方案和正式课程保持原状，须另到课表核对处理。")}</p>
                        {["PAUSED","EXCLUDED"].includes(item.status) && <details style={{marginTop:8,padding:8,border:'1px solid #aacbbb'}}>
                          <summary style={{cursor:'pointer',fontWeight:700}}>{t(lang,"Verify pause / exclusion outcome","核验暂停／排除结果")}</summary>
                          <p>{t(lang,"First resolve active lessons and any charge discrepancies in the timetable. Then record the parent agreement to withdraw retained options. Original lessons, balances and verification history are preserved.","请先到课表处理未取消课程及扣退不一致，再记录家长约定并确认撤回保留方案。原课次、余额及历史核验记录保持不变。")}</p>
                          <Link href={`/admin/students/${item.studentId}?focus=attendance`}>{t(lang,"Open student lesson history","打开学生课程历史")}</Link>
                          {item.closureReview?.blocker && <p role="alert">{item.closureReview.blocker}</p>}
                          {item.closureReview?.evidence && <p>{t(lang,"Last valid closure review","最近有效的结果核验")}: {item.closureReview.evidence.actorName} · {formatBusinessDateTime(new Date(item.closureReview.evidence.verifiedAt))}<br/>{item.closureReview.evidence.reason}</p>}
                          <MonthlyStatusForm action={closureVerificationAction} lang={lang} style={{display:'grid',gap:8}}>
                            <input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="month" value={month}/><input type="hidden" name="cohort" value={selectedCohort}/><input type="hidden" name="expectedStatus" value={item.status}/><input type="hidden" name="expectedUpdatedAt" value={item.updatedAt.toISOString()}/>
                            <label>{t(lang,"Parent agreement and resolution basis","家长约定及处理依据")}<textarea name="reason" required minLength={20} maxLength={2000} style={{width:'100%'}}/></label>
                            <label><input type="checkbox" name="withdrawOptions" value="yes" required/>{t(lang,"I confirmed the pause / exclusion with the parent and withdrawal of retained time options.","已与家长确认暂停／排除及撤回保留时间方案。")}</label>
                            <button style={buttonStyle}>{t(lang,"Verify closure and retain history","核验结果并保留历史")}</button>
                          </MonthlyStatusForm>
                        </details>}
                        {["MATCHED","SCHEDULED"].includes(item.status) && <details style={{marginTop:8,padding:8,border:'1px solid #aacbbb'}}>
                          <summary style={{cursor:'pointer',fontWeight:700}}>{t(lang,"Verify formal timetable","核验正式课表")}</summary>
                          <p>{t(lang,"Select every agreed lesson for this month and confirm the total. This records evidence; it does not create lessons or deduct hours.","选中本月约定的全部课次并确认总次数。这里只记录核验依据，不创建课程或扣课。")}</p>
                          {formalCandidates.length>=2000 && <p>{t(lang,"Candidate limit reached; verify remaining lessons in the monthly timetable before continuing.","候选课次达到显示上限，请先在月课表核对是否遗漏。")}</p>}
                          <MonthlyStatusForm action={itemStatusAction} lang={lang} style={{display:'grid',gap:8}}>
                            <input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="month" value={month}/><input type="hidden" name="cohort" value={selectedCohort}/><input type="hidden" name="status" value="SCHEDULED"/><input type="hidden" name="expectedStatus" value={item.status}/><input type="hidden" name="expectedUpdatedAt" value={item.updatedAt.toISOString()}/><input type="hidden" name="internalNote" value={item.internalNote??''}/>
                            {candidates.map(lesson=><label key={lesson.id}><input type="checkbox" name="sessionId" value={lesson.id}/>{formatBusinessDateTime(lesson.startAt)} – {formatBusinessDateTime(lesson.endAt)} · {lesson.teacher?.name??lesson.class.teacher.name} <Link href={`/admin/sessions/${lesson.id}/attendance`}>{t(lang,"View","查看")}</Link></label>)}
                            {!candidates.length && <p>{t(lang,"No eligible formal lessons found. Create the timetable first.","未找到符合条件的正式课次，请先排课。")}</p>}
                            <label>{t(lang,"Confirmed total lessons this month","本月确认总课次数")}<input type="number" name="expectedSessionCount" min="1" max="100" required/></label>
                            <label>{t(lang,"Confirmation basis (all dates / exceptions checked)","核验依据（已核对全部日期及例外安排）")}<textarea name="completionReason" minLength={10} maxLength={2000} required style={{width:'100%'}}/></label>
                            <button style={buttonStyle} disabled={!candidates.length}>{t(lang,"Verify and complete scheduling","核验并完成排课")}</button>
                          </MonthlyStatusForm>
                        </details>}
                        {canProxyPreference && <details style={{ marginTop: 8, border: "1px solid #f2c48d", padding: 8, background: "#fffaf3" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#9a4d08" }}>{t(lang, "Enter response for parent", "代家长录入需求")}</summary>
                          <form action={proxyPreferenceAction} style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(130px,1fr))", gap: 8, marginTop: 10 }}>
                            <input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><input type="hidden" name="expectedStatus" value={item.status} /><input type="hidden" name="expectedUpdatedAt" value={item.updatedAt.toISOString()} />
                            <label>{t(lang,"Parent arrangement","家长安排")}<select name="intent" defaultValue={item.intent ?? "KEEP"} required style={{ width: "100%", padding: 8 }}>{MONTHLY_SCHEDULING_INTENTS.map((value) => <option key={value} value={value}>{t(lang,intentLabels[value].en,intentLabels[value].zh)}</option>)}</select></label>
                            <label>{t(lang,"Response channel","沟通渠道")}<select name="responseChannel" defaultValue={item.responseChannel ?? "WECHAT_GROUP"} required style={{ width: "100%", padding: 8 }}>{MONTHLY_SCHEDULING_RESPONSE_CHANNELS.map((value) => <option key={value} value={value}>{t(lang,responseChannelLabels[value].en,responseChannelLabels[value].zh)}</option>)}</select></label>
                            <label>{t(lang,"Sessions per week","每周次数")}<input name="expectedSessionsPerWeek" type="number" min="0" max="14" defaultValue={item.expectedSessionsPerWeek ?? 1} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <label>{t(lang,"Expected monthly minutes","预计总分钟")}<input name="expectedMinutes" type="number" min="0" max="20000" defaultValue={item.expectedMinutes ?? ""} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <label>{t(lang,"Lesson mode","上课形式")}<select name="preferredMode" defaultValue={item.preferredMode ?? ""} style={{ width: "100%", padding: 8 }}><option value="">{t(lang,"No preference","无偏好")}</option><option value="ONLINE">{t(lang,"Online","线上")}</option><option value="OFFLINE">{t(lang,"In person","线下")}</option></select></label>
                            <label>{t(lang,"Parent reply date","家长回复日期")}<input name="parentConfirmedAt" type="date" required defaultValue={dateInputValue(item.parentConfirmedAt)} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <label>{t(lang,"Preferred campus","校区偏好")}<input name="preferredCampus" defaultValue={item.preferredCampus ?? ""} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <label>{t(lang,"Teacher preference","老师偏好类型")}<select name="teacherPreferenceType" defaultValue={item.teacherPreferenceType ?? (item.preferredTeacher ? "VERIFY" : "NONE")} style={{ width: "100%", padding: 8 }}><option value="NONE">{t(lang,"No specific teacher","不指定老师")}</option><option value="CURRENT">{t(lang,"Keep the current teacher","沿用当前唯一老师")}</option><option value="PREFERRED">{t(lang,"Choose a qualified teacher","选择合格老师")}</option><option value="VERIFY">{t(lang,"Teacher mentioned needs review","家长提到的老师需核对")}</option></select></label>
                            <label>{t(lang,"Qualified teacher","合格老师")}<select name="preferredTeacherId" defaultValue={item.preferredTeacherId ?? ""} style={{ width: "100%", padding: 8 }}><option value="">{t(lang,"Please select","请选择")}</option>{(teacherOptionsByCourse.get(item.courseId) ?? []).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
                            <label style={{ gridColumn: "1 / -1" }}>{t(lang,"Teacher details for review","待核对老师说明")}<input name="teacherPreferenceNote" defaultValue={item.teacherPreferenceNote ?? (!item.teacherPreferenceType ? item.preferredTeacher ?? "" : "")} placeholder={t(lang,"Use only when the teacher mentioned is absent from the list","仅当家长提到的老师不在名单时填写")} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <fieldset style={{ gridColumn: "1 / -1", border: "1px solid #dbe5f2", padding: 8 }}><legend>{t(lang,"Available weekdays","可上课星期")}</legend>{[["MON", "一"], ["TUE", "二"], ["WED", "三"], ["THU", "四"], ["FRI", "五"], ["SAT", "六"], ["SUN", "日"]].map(([value, label]) => <label key={value} style={{ marginRight: 10 }}><input name="weekday" type="checkbox" value={value} defaultChecked={availability.weekdays.includes(value)} />{displayLabel(lang,value)}</label>)}</fieldset>
                            {defaultRanges.map((range, index) => <div key={index} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}><label>{t(lang,`Window ${index+1} start`,`时段${index+1}开始`)}<input name={`timeStart${index + 1}`} type="time" defaultValue={range.start} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label><label>{t(lang,"End","结束")}<input name={`timeEnd${index + 1}`} type="time" defaultValue={range.end} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label><label>{t(lang,"Priority","优先级")}<select name={`timePriority${index + 1}`} defaultValue={range.priority} style={{ width: "100%", padding: 8 }}><option value="REQUIRED">{t(lang,"Required","必须满足")}</option><option value="PREFERRED">{t(lang,"Preferred","优先选择")}</option><option value="ACCEPTABLE">{t(lang,"Acceptable","可以接受")}</option></select></label></div>)}
                            <label style={{ gridColumn: "1 / -1" }}>{t(lang,"Unavailable dates (comma separated)","不可上课日期（逗号分隔）")}<input name="unavailableDates" defaultValue={Array.isArray(item.unavailableDatesJson) ? item.unavailableDatesJson.join(", ") : ""} placeholder="2026-09-05, 2026-09-12" style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <label style={{ gridColumn: "1 / -1" }}>{t(lang,"Parent requirements","家长需求备注")}<textarea name="parentNotes" defaultValue={item.parentNotes ?? ""} style={{ width: "100%", minHeight: 70, padding: 8, boxSizing: "border-box" }} /></label>
                            <label style={{ gridColumn: "1 / -1" }}>{t(lang,"Original reply or summary (required for audit)","家长原话或沟通摘要（审计必填）")}<textarea name="parentConfirmationNote" required defaultValue={item.parentConfirmationNote ?? ""} style={{ width: "100%", minHeight: 80, padding: 8, boxSizing: "border-box" }} /></label>
                            <button style={{ ...buttonStyle, gridColumn: "1 / -1", background: "#f45b05", color: "#fff" }}>{t(lang,"Save and generate options","保存并生成候选时间")}</button>
                          </form>
                        </details>}
                        {["OFFERED", "PARENT_SELECTED"].includes(item.status) && concreteOffers.length > 0 && <details style={{ marginTop: 8, border: "1px solid #9bcfae", padding: 8, background: "#f3fbf5" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#17663a" }}>{t(lang, "Record parent choices", "代家长选择候选时间")}</summary>
                          <form action={proxyRankOffersAction} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                            <input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} />
                            {[1, 2, 3].map((rank) => <label key={rank}>{t(lang,`Choice ${rank}`,`第${rank}选择`)}<select name={`rank${rank}`} required={rank === 1} defaultValue={concreteOffers.find((option) => option.parentRank === rank)?.id ?? ""} style={{ width: "100%", padding: 8 }}><option value="">{rank === 1 ? t(lang,"Please select","请选择") : t(lang,"Leave blank","不填写")}</option>{concreteOffers.map((option) => <option key={option.id} value={option.id}>{offerOptionLabel(lang,option)}</option>)}</select></label>)}
                            <label>{t(lang,"Response channel","沟通渠道")}<select name="responseChannel" defaultValue={item.offerSelectionChannel ?? item.responseChannel ?? "WECHAT_GROUP"} required style={{ width: "100%", padding: 8 }}>{MONTHLY_SCHEDULING_RESPONSE_CHANNELS.map((value) => <option key={value} value={value}>{t(lang,responseChannelLabels[value].en,responseChannelLabels[value].zh)}</option>)}</select></label>
                            <label>{t(lang,"Parent reply date","家长回复日期")}<input name="parentConfirmedAt" type="date" required defaultValue={dateInputValue(item.offerParentConfirmedAt ?? item.parentConfirmedAt)} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label>
                            <label>{t(lang,"Original choice or summary","家长选择原话或摘要")}<textarea name="parentConfirmationNote" required defaultValue={item.offerSelectionNote ?? ""} placeholder={t(lang,"Example: parent replied with choices 2, 1, 3 in WeChat","例如：家长在微信群回复 2、1、3")} style={{ width: "100%", minHeight: 75, padding: 8, boxSizing: "border-box" }} /></label>
                            <button style={{ ...buttonStyle, background: "#17663a", color: "#fff" }}>{t(lang,"Hold for 24 hours in parent preference order","按家长排序临时保留24小时")}</button>
                          </form>
                        </details>}
                        {(item.intent === "CHANGE" || item.status === "CHANGE_REQUESTED") && ["SUBMITTED", "NEEDS_CLARIFICATION", "MATCHED", "CHANGE_REQUESTED"].includes(item.status) && <form action={createExceptionTicketAction} style={{ marginTop: 6 }}><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><button style={{ ...buttonStyle, width: "100%" }}>{t(lang, "Escalate teacher exception", "转老师例外工单")}</button></form>}
                      </> : <span>{item.ownerName || "-"}</span>}
                    </td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ margin: 0 }}>{t(lang, "Family message preparation", "家庭消息准备")}</h2>
            <p style={{ margin: 0, color: "#526071" }}>{t(lang, "One message per family; each child and course remains a separate response item.", "每个家庭只准备一条消息，但每个孩子和课程仍分别填写。")}</p>
            {Array.from(familyGroups.entries()).slice(0, 200).map(([key, rows]) => {
              const first = rows[0];
              const message = familyMessages.get(key) ?? "";
              const canKeepFamily = monthlySchedulingFamilyCanKeep(rows);
              return <details key={key}><summary style={{ cursor: "pointer", fontWeight: 800 }}>{first.parent?.name || first.student.name} · {rows.length} {t(lang, "item(s)", "项")}</summary><textarea readOnly value={message} style={{ width: "100%", minHeight: 150, marginTop: 8, padding: 10 }} />{access.canManage && canKeepFamily && <form action={proxyFamilyKeepAction} style={{ marginTop: 10, padding: 12, display: "grid", gap: 8, background: "#f1fbf4", border: "1px solid #9bcfae" }}><strong>{t(lang, "Family replied: keep the current arrangement", "家长回复：全家沿用本月安排")}</strong><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="seedItemId" value={first.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="cohort" value={selectedCohort} /><label>{t(lang, "Response channel", "沟通渠道")}<select name="responseChannel" defaultValue="WECHAT_GROUP" style={{ width: "100%", padding: 8 }}>{MONTHLY_SCHEDULING_RESPONSE_CHANNELS.map((value) => <option key={value} value={value}>{t(lang,responseChannelLabels[value].en,responseChannelLabels[value].zh)}</option>)}</select></label><label>{t(lang, "Parent reply date", "家长回复日期")}<input name="parentConfirmedAt" type="date" required defaultValue={dateInputValue(null)} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} /></label><label>{t(lang, "Original reply or summary", "家长原话或摘要")}<textarea name="parentConfirmationNote" required placeholder={t(lang,"Example: parent confirmed both children keep the same arrangement next month.","例如：家长在微信群回复，下个月两个孩子都照旧。")} style={{ width: "100%", minHeight: 70, padding: 8, boxSizing: "border-box" }} /></label><button style={{ ...buttonStyle, background: "#17663a", color: "#fff" }}>{t(lang, `Record ${rows.length} items together`, `一次代录 ${rows.length} 项`)}</button></form>}</details>;
            })}
          </section>

          {report && <section style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>{t(lang, "Staffing capacity forecast", "师资供需预测")}</h2><p style={{ color: "#526071", marginBottom: 0 }}>{t(lang, "Demand includes confirmed monthly minutes only. Missing totals need confirmation. Capacity is a one-to-one planning estimate; timing, campus and group arrangements still need review.", "需求只汇总已确认的整月分钟数，缺少总量的需补充确认。容量按一对一粗略估算，具体时间、校区及班课安排仍须核对。")}</p></div><Link href="/admin/reports/monthly-schedule" style={{ ...buttonStyle, textDecoration: "none", color: "#10243e" }}>{t(lang, "Open monthly schedule", "打开月课表")}</Link></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <div style={{ padding: 14, background: "#f7f9fc" }}><strong>{hours(report.summary.demandMinutes)}</strong><br />{t(lang,"Confirmed demand","已确认需求")}</div>
              <div style={{padding:14,background:report.summary.unknownDemandCount?"#fff8e6":"#f7f9fc"}}><strong>{report.summary.unknownDemandCount}</strong><br />{t(lang,"Monthly totals to confirm","整月课时待确认")}</div>
              <div style={{ padding: 14, background: "#eafaf0" }}><strong>{hours(report.summary.scheduledMinutes)}</strong><br />{t(lang,"Scheduled","已排")}</div>
              <div style={{ padding: 14, background: report.summary.gapMinutes ? "#fff0f0" : "#eafaf0" }}><strong>{hours(report.summary.gapMinutes)}</strong><br />{t(lang,"Gap","缺口")}</div>
              <div style={{ padding: 14, background: report.summary.redCourses ? "#fff0f0" : "#eafaf0" }}><strong>{report.summary.redCourses}</strong><br />{t(lang,"Risk courses","风险课程")}</div>
              <div style={{ padding: 14, background: report.summary.teachersWithoutAvailability ? "#fff0f0" : "#eafaf0" }}><strong>{report.summary.teachersWithoutAvailability}</strong><br />{t(lang,"Teachers missing availability","老师未填时间")}</div>
            </div>
            {(report.summary.incomplete||report.summary.unresolvedLessons>0)&&<p role="status" style={{color:'#9a5b00'}}>{t(lang,"This forecast needs review: some lesson ownership is unclear or the scan limit was reached. Do not treat the displayed gap as a complete total.","本次预测待核对：部分课次归属不清或已达到扫描上限，不能将显示的缺口视为完整总量。")}</p>}
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}><thead><tr>{[["Course", "课程"], ["Students", "学生"], ["Demand", "需求"], ["Scheduled", "已排"], ["Allocated capacity", "已分配容量"], ["Gap", "缺口"], ["Qualified teachers", "合格老师"], ["Risk", "风险"]].map(([en,zh])=>t(lang,en,zh)).map((label) => <th key={label} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid #cad6e5" }}>{label}</th>)}</tr></thead><tbody>{report.courses.map((row) => <tr key={row.courseId}><td style={{ padding: 9, borderBottom: "1px solid #e5ebf3" }}>{row.courseName}</td><td>{row.studentCount}</td><td>{hours(row.demandMinutes)}{row.unknownDemandCount>0&&<div style={{color:"#9a5b00"}}>{t(lang,`${row.unknownDemandCount} monthly totals to confirm`,`${row.unknownDemandCount} 项整月课时待确认`)}</div>}</td><td>{hours(row.scheduledMinutes)}</td><td>{hours(row.availableMinutes)}</td><td>{hours(row.gapMinutes)}</td><td>{row.qualifiedTeacherCount}</td><td><strong style={{ color: row.tone === "RED" ? "#b42318" : row.tone === "AMBER" ? "#9a5b00" : "#17663a" }}>{displayLabel(lang,row.tone)}</strong></td></tr>)}</tbody></table></div>
            {report.timeBands.length > 0 && <div><h3>{t(lang, "Peak parent preference windows", "家长偏好高峰时段")}</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{report.timeBands.map((row) => <span key={row.label} style={{ padding: "8px 10px", background: "#f3f6fa", border: "1px solid #dbe5f2" }}>{row.label} · {row.itemCount}</span>)}</div></div>}
          </section>}
        </>
      )}
    </div>
  );
}
