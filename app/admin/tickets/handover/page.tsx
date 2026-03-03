import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

function parseDateOnly(raw: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return new Date(`${raw}T00:00:00+08:00`);
}

function dayRange(day: Date) {
  const start = new Date(day.getTime());
  const end = new Date(day.getTime());
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function txt(formData: FormData, name: string, max = 3000) {
  const v = String(formData.get(name) ?? "").trim();
  return v ? v.slice(0, max) : "";
}

function composeNotes(unresolvedTop3: string, ownerDeadline: string, managementNote: string | null, notesRaw: string | null) {
  return [
    `[UNRESOLVED_TOP3]\n${unresolvedTop3 || "-"}`,
    `[OWNER_DEADLINE]\n${ownerDeadline || "-"}`,
    `[MGMT_NOTE]\n${managementNote || ""}`,
    `[NOTES]\n${notesRaw || ""}`,
  ].join("\n\n");
}

function parseComposedNotes(raw: string | null | undefined) {
  const src = String(raw ?? "");
  if (!src.includes("[UNRESOLVED_TOP3]") || !src.includes("[OWNER_DEADLINE]")) {
    return { unresolvedTop3: src.trim(), ownerDeadline: "", managementNote: "", notes: "" };
  }
  const readBlock = (startTag: string, nextTag?: string) => {
    const start = src.indexOf(startTag);
    if (start < 0) return "";
    const contentStart = start + startTag.length;
    const end = nextTag ? src.indexOf(nextTag, contentStart) : -1;
    const text = end >= 0 ? src.slice(contentStart, end) : src.slice(contentStart);
    return text.trim();
  };
  return {
    unresolvedTop3: readBlock("[UNRESOLVED_TOP3]", "[OWNER_DEADLINE]"),
    ownerDeadline: readBlock("[OWNER_DEADLINE]", "[MGMT_NOTE]"),
    managementNote: readBlock("[MGMT_NOTE]", "[NOTES]"),
    notes: readBlock("[NOTES]"),
  };
}

function isAbnormalHandoverRow(r: {
  needInfo: string | null;
  waitingTeacher: string | null;
  waitingParentPartner: string | null;
  exceptionsEscalations: string | null;
  notes: string | null;
}) {
  const parsed = parseComposedNotes(r.notes);
  const unresolved = parsed.unresolvedTop3.toLowerCase();
  const unresolvedEmpty = !unresolved || unresolved === "-" || unresolved.includes("none") || unresolved.includes("无");
  return Boolean(
    (r.needInfo && r.needInfo.trim()) ||
      (r.waitingTeacher && r.waitingTeacher.trim()) ||
      (r.waitingParentPartner && r.waitingParentPartner.trim()) ||
      (r.exceptionsEscalations && r.exceptionsEscalations.trim()) ||
      !unresolvedEmpty
  );
}

function slaFor(due: Date | null, status: string) {
  if (status === "Completed" || status === "Cancelled") {
    return { label: "Closed", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" };
  }
  if (!due) return { label: "No due", color: "#854d0e", bg: "#fef3c7", border: "#fcd34d" };
  const ms = due.getTime() - Date.now();
  if (ms < 0) return { label: "Overdue", color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" };
  if (ms <= 24 * 60 * 60 * 1000) return { label: "Due <24h", color: "#92400e", bg: "#fef3c7", border: "#fcd34d" };
  return { label: "On Track", color: "#166534", bg: "#dcfce7", border: "#86efac" };
}

async function saveHandoverAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const day = String(formData.get("handoverDate") ?? "").trim();
  const handoverDate = parseDateOnly(day);
  if (!handoverDate) redirect("/admin/tickets/handover?err=date");

  const quickMode = txt(formData, "quickMode", 40);
  const noTomorrowRisk = String(formData.get("noTomorrowRisk") ?? "") === "1";
  let unresolvedTop3 = txt(formData, "unresolvedTop3", 4000);
  let tomorrowRisk = txt(formData, "tomorrowRisk", 4000);
  let ownerDeadline = txt(formData, "ownerDeadline", 4000);
  if (quickMode === "all-clear") {
    unresolvedTop3 = unresolvedTop3 || "None / 无";
    tomorrowRisk = tomorrowRisk || "No risk / 无";
    ownerDeadline = ownerDeadline || "N/A / 无";
  }
  if (noTomorrowRisk && !tomorrowRisk) {
    tomorrowRisk = "No risk / 无";
  }
  if (!unresolvedTop3 || !tomorrowRisk || !ownerDeadline) {
    redirect(`/admin/tickets/handover?day=${encodeURIComponent(day)}&err=min-required`);
  }

  const toInt = (name: string) => {
    const n = Number(String(formData.get(name) ?? "").trim());
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  };
  const textOrNull = (name: string, max = 4000) => {
    const v = txt(formData, name, max);
    return v || null;
  };

  const needInfoRaw = textOrNull("needInfo");
  const waitingTeacherRaw = textOrNull("waitingTeacher");
  const waitingParentRaw = textOrNull("waitingParentPartner");
  const exceptionsRaw = textOrNull("exceptionsEscalations");
  const managementNoteRaw = textOrNull("managementNote");
  const notesRaw = textOrNull("notes");

  await prisma.ticketHandover.upsert({
    where: { handoverDate },
    create: {
      handoverDate,
      newTickets: toInt("newTickets"),
      completed: toInt("completed"),
      needInfo: needInfoRaw,
      waitingTeacher: waitingTeacherRaw,
      waitingParentPartner: waitingParentRaw,
      tomorrowLessonsCheck: tomorrowRisk,
      exceptionsEscalations: exceptionsRaw,
      notes: composeNotes(unresolvedTop3, ownerDeadline, managementNoteRaw, notesRaw),
      createdByUserId: user.id,
    },
    update: {
      newTickets: toInt("newTickets"),
      completed: toInt("completed"),
      needInfo: needInfoRaw,
      waitingTeacher: waitingTeacherRaw,
      waitingParentPartner: waitingParentRaw,
      tomorrowLessonsCheck: tomorrowRisk,
      exceptionsEscalations: exceptionsRaw,
      notes: composeNotes(unresolvedTop3, ownerDeadline, managementNoteRaw, notesRaw),
      createdByUserId: user.id,
    },
  });
  revalidatePath("/admin/tickets/handover");
  redirect(`/admin/tickets/handover?day=${encodeURIComponent(day)}&saved=1`);
}

export default async function TicketHandoverPage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string;
    day?: string;
    view?: string;
    err?: string;
    history?: string;
    historyFilter?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const saved = sp?.saved === "1";
  const err = String(sp?.err ?? "").trim();
  const view = String(sp?.view ?? "cs").trim() === "ops" ? "ops" : "cs";
  const history = String(sp?.history ?? "").trim() === "all" ? "all" : "7d";
  const historyFilter = String(sp?.historyFilter ?? "").trim() === "abnormal" ? "abnormal" : "all";
  const today = new Date().toISOString().slice(0, 10);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(String(sp?.day ?? "")) ? String(sp?.day) : today;
  const selectedDate = parseDateOnly(selectedDay) ?? parseDateOnly(today)!;
  const { start, end } = dayRange(selectedDate);
  const historyStart = new Date(selectedDate.getTime());
  historyStart.setDate(historyStart.getDate() - 6);
  const historyEnd = new Date(selectedDate.getTime());
  historyEnd.setDate(historyEnd.getDate() + 1);

  const [existing, rows, allStatusCounts, createdTodayStatus, unresolvedCards, completedToday, mgmtCards] = await Promise.all([
    prisma.ticketHandover.findUnique({ where: { handoverDate: selectedDate } }),
    prisma.ticketHandover.findMany({
      where: history === "all" ? {} : { handoverDate: { gte: historyStart, lt: historyEnd } },
      orderBy: { handoverDate: "desc" },
      take: history === "all" ? 120 : 14,
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { isArchived: false },
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { isArchived: false, createdAt: { gte: start, lt: end } },
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: {
        isArchived: false,
        status: { in: ["Need Info", "Waiting Teacher", "Waiting Parent", "Exception"] },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        ticketNo: true,
        studentName: true,
        status: true,
        owner: true,
        nextAction: true,
        nextActionDue: true,
      },
    }),
    prisma.ticket.count({
      where: { isArchived: false, completedAt: { gte: start, lt: end } },
    }),
    prisma.ticket.findMany({
      where: {
        isArchived: false,
        OR: [
          { status: "Exception" },
          { priority: { contains: "紧急" } },
          { priority: { contains: "Urgent", mode: "insensitive" } },
          {
            AND: [
              { nextActionDue: { lt: new Date() } },
              { status: { notIn: ["Completed", "Cancelled"] } },
            ],
          },
        ],
      },
      orderBy: [{ priority: "desc" }, { nextActionDue: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        ticketNo: true,
        status: true,
        owner: true,
        priority: true,
        nextActionDue: true,
      },
    }),
  ]);

  const statusCount = Object.fromEntries(allStatusCounts.map((x) => [x.status, x._count._all]));
  const createdToday = createdTodayStatus.reduce((sum, x) => sum + x._count._all, 0);
  const parsedExistingNotes = parseComposedNotes(existing?.notes);
  const shownRows = historyFilter === "abnormal" ? rows.filter(isAbnormalHandoverRow) : rows;

  const cardGroups = [
    { title: "Need Info", cards: unresolvedCards.filter((x) => x.status === "Need Info") },
    { title: "Waiting Teacher", cards: unresolvedCards.filter((x) => x.status === "Waiting Teacher") },
    { title: "Waiting Parent", cards: unresolvedCards.filter((x) => x.status === "Waiting Parent") },
    { title: "Exception", cards: unresolvedCards.filter((x) => x.status === "Exception") },
  ];

  const defaultUnresolvedTop3 =
    unresolvedCards
      .slice(0, 3)
      .map((x, i) => `${i + 1}. ${x.ticketNo} | ${x.studentName} | ${x.status} | ${x.nextAction ?? "-"}`)
      .join("\n") || "";

  const defaultOwnerDeadline =
    unresolvedCards
      .slice(0, 5)
      .map((x) => `${x.ticketNo} | Owner:${x.owner ?? "-"} | Due:${x.nextActionDue ? x.nextActionDue.toLocaleString() : "-"}`)
      .join("\n") || "";

  return (
    <div>
      <h2>{t(lang, "Daily Handover", "每日交接")}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Back to Tickets", "返回工单中心")}</Link>
        <Link scroll={false} href="/admin/tickets/sop">{t(lang, "SOP One Pager", "SOP一页纸")}</Link>
      </div>
      {saved ? <div style={{ color: "#166534", marginBottom: 10 }}>{t(lang, "Saved", "已保存")}</div> : null}
      {err === "min-required" ? (
        <div style={{ color: "#b91c1c", marginBottom: 10 }}>
          {t(lang, "Required fields missing: Top3 / Tomorrow risk / Owner+deadline", "必填缺失：Top3 / 明日风险 / 责任人截止")}
        </div>
      ) : null}

      <form method="GET" className="ts-filter-bar" style={{ marginBottom: 10 }}>
        <label>
          {t(lang, "Date", "日期")}
          <input type="date" name="day" defaultValue={selectedDay} />
        </label>
        <label>
          {t(lang, "View", "视图")}
          <select name="view" defaultValue={view}>
            <option value="cs">CS View / 客服视图</option>
            <option value="ops">Ops View / 教务视图</option>
          </select>
        </label>
        <label>
          {t(lang, "History", "历史")}
          <select name="history" defaultValue={history}>
            <option value="7d">Recent 7 days / 最近7天</option>
            <option value="all">All / 全部</option>
          </select>
        </label>
        <label>
          {t(lang, "History Filter", "历史筛选")}
          <select name="historyFilter" defaultValue={historyFilter}>
            <option value="all">All days / 全部日期</option>
            <option value="abnormal">Abnormal only / 仅异常日</option>
          </select>
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>

      <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 10, padding: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Management Escalation", "管理介入")}</div>
        <div style={{ marginBottom: 6 }}>
          <Link scroll={false} href="/admin/tickets?focus=mgmt">Open Mgmt Focus / 打开管理介入视图</Link>
        </div>
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {mgmtCards.length === 0 ? (
            <div style={{ color: "#166534" }}>{t(lang, "No escalation ticket now", "当前无管理介入工单")}</div>
          ) : (
            mgmtCards.map((c) => {
              const sla = slaFor(c.nextActionDue, c.status);
              return (
                <div key={c.id} style={{ border: `1px solid ${sla.border}`, borderRadius: 8, background: "#fff", padding: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <div><b>{c.ticketNo}</b> | {c.status}</div>
                    <span style={{ background: sla.bg, color: sla.color, border: `1px solid ${sla.border}`, borderRadius: 999, padding: "1px 8px", fontWeight: 700 }}>
                      {sla.label}
                    </span>
                  </div>
                  <div>Priority: {c.priority}</div>
                  <div>Owner: {c.owner ?? "-"}</div>
                  <div>Due: {c.nextActionDue ? c.nextActionDue.toLocaleString() : "-"}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Quick Fill Tips / 快速填写建议</div>
        {view === "cs" ? (
          <div>1) Top3 by parent urgency 2) Tomorrow risk: unconfirmed time/no reply 3) Owner+deadline with exact minute</div>
        ) : (
          <div>1) Top3 by scheduling conflicts 2) Tomorrow risk: teacher/room/attendance 3) Owner+deadline with exact minute</div>
        )}
      </div>

      <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 10, padding: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{t(lang, "Auto Summary", "自动汇总")}</div>
        <div>New tickets: {createdToday}</div>
        <div>Completed: {completedToday}</div>
        <div>Need Info: {statusCount["Need Info"] ?? 0}</div>
        <div>Waiting Teacher: {statusCount["Waiting Teacher"] ?? 0}</div>
        <div>Waiting Parent: {statusCount["Waiting Parent"] ?? 0}</div>
        <div>Exception: {statusCount["Exception"] ?? 0}</div>
      </div>

      <div style={{ border: "1px solid #fbcfe8", background: "#fdf2f8", borderRadius: 10, padding: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Open Ticket Cards / 未闭环卡片</div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {cardGroups.map((g) => (
            <div key={g.title} style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", padding: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{g.title}: {g.cards.length}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {g.cards.slice(0, 6).map((c) => (
                  <div key={c.id} style={{ fontSize: 12, border: "1px solid #f1f5f9", borderRadius: 6, padding: 6 }}>
                    <div><b>{c.ticketNo}</b> | {c.studentName}</div>
                    <div>Owner: {c.owner ?? "-"}</div>
                    <div>Next: {c.nextAction ?? "-"}</div>
                    <div>Due: {c.nextActionDue ? c.nextActionDue.toLocaleString() : "-"}</div>
                    <Link scroll={false} href={`/admin/tickets?q=${encodeURIComponent(c.ticketNo)}`}>Open / 打开</Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form action={saveHandoverAction} style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <input type="hidden" name="handoverDate" value={selectedDay} />
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <label>
            New tickets / 新增工单
            <input name="newTickets" type="number" min={0} defaultValue={existing?.newTickets ?? createdToday} />
          </label>
          <label>
            Completed / 已完成
            <input name="completed" type="number" min={0} defaultValue={existing?.completed ?? completedToday} />
          </label>
        </div>

        <label>
          Unresolved Top3 (Required) / 未闭环Top3（必填）
          <textarea name="unresolvedTop3" rows={3} defaultValue={parsedExistingNotes.unresolvedTop3 || defaultUnresolvedTop3} />
        </label>

        <label>
          Tomorrow First-class Risks (Required) / 明日首课风险（必填）
          <textarea
            name="tomorrowRisk"
            rows={3}
            defaultValue={
              existing?.tomorrowLessonsCheck ??
              (view === "ops"
                ? "Please fill: teacher confirmation / room / attendance risk"
                : "Please fill: parent communication / confirmed time / pending items")
            }
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input name="noTomorrowRisk" type="checkbox" value="1" />
          No tomorrow risk (auto fill) / 明日无风险（自动填充）
        </label>

        <label>
          Owner + Deadline (Required) / 责任人+截止时间（必填）
          <textarea name="ownerDeadline" rows={3} defaultValue={parsedExistingNotes.ownerDeadline || defaultOwnerDeadline} />
        </label>

        <label>
          Management Note / 管理备注
          <textarea name="managementNote" rows={2} defaultValue={parsedExistingNotes.managementNote} />
        </label>

        {view === "cs" ? (
          <>
            <label>
              Need Info (Owner/Deadline) / 待补信息（责任人/截止）
              <textarea name="needInfo" rows={2} defaultValue={existing?.needInfo ?? ""} />
            </label>
            <label>
              Waiting Parent/Partner / 等家长合作方
              <textarea name="waitingParentPartner" rows={2} defaultValue={existing?.waitingParentPartner ?? ""} />
            </label>
          </>
        ) : (
          <>
            <label>
              Waiting Teacher (Owner/ETA) / 等老师（责任人/预计）
              <textarea name="waitingTeacher" rows={2} defaultValue={existing?.waitingTeacher ?? ""} />
            </label>
            <label>
              Exceptions/Escalations / 异常升级
              <textarea name="exceptionsEscalations" rows={2} defaultValue={existing?.exceptionsEscalations ?? ""} />
            </label>
          </>
        )}

        <label>
          Notes / 备注
          <textarea name="notes" rows={2} defaultValue={parsedExistingNotes.notes} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit">{t(lang, "Save Handover", "保存交接")}</button>
          <button type="submit" name="quickMode" value="all-clear">One-click All Clear / 一键无待办保存</button>
        </div>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Date / 日期</th>
              <th align="left">New / 新增</th>
              <th align="left">Done / 完成</th>
              <th align="left">Need Info</th>
              <th align="left">Waiting Teacher</th>
              <th align="left">Waiting Parent</th>
              <th align="left">Mgmt Note / 管理备注</th>
            </tr>
          </thead>
          <tbody>
            {shownRows.map((r) => {
              const parsed = parseComposedNotes(r.notes);
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td>{r.handoverDate.toLocaleDateString()}</td>
                  <td>{r.newTickets}</td>
                  <td>{r.completed}</td>
                  <td style={{ maxWidth: 220 }}>{r.needInfo ?? "-"}</td>
                  <td style={{ maxWidth: 220 }}>{r.waitingTeacher ?? "-"}</td>
                  <td style={{ maxWidth: 220 }}>{r.waitingParentPartner ?? "-"}</td>
                  <td style={{ maxWidth: 220 }}>{parsed.managementNote || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
