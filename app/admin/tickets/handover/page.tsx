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

function composeNotes(unresolvedTop3: string, ownerDeadline: string, notesRaw: string | null) {
  return [
    `[UNRESOLVED_TOP3]\n${unresolvedTop3 || "-"}`,
    `[OWNER_DEADLINE]\n${ownerDeadline || "-"}`,
    `[NOTES]\n${notesRaw || ""}`,
  ].join("\n\n");
}

function parseComposedNotes(raw: string | null | undefined) {
  const src = String(raw ?? "");
  if (!src.includes("[UNRESOLVED_TOP3]") || !src.includes("[OWNER_DEADLINE]")) {
    return {
      unresolvedTop3: src.trim(),
      ownerDeadline: "",
      notes: "",
    };
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
    ownerDeadline: readBlock("[OWNER_DEADLINE]", "[NOTES]"),
    notes: readBlock("[NOTES]"),
  };
}

async function saveHandoverAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const day = String(formData.get("handoverDate") ?? "").trim();
  const handoverDate = parseDateOnly(day);
  if (!handoverDate) redirect("/admin/tickets/handover?err=date");

  const unresolvedTop3 = txt(formData, "unresolvedTop3", 4000);
  const tomorrowRisk = txt(formData, "tomorrowRisk", 4000);
  const ownerDeadline = txt(formData, "ownerDeadline", 4000);
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
      notes: composeNotes(unresolvedTop3, ownerDeadline, notesRaw),
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
      notes: composeNotes(unresolvedTop3, ownerDeadline, notesRaw),
      createdByUserId: user.id,
    },
  });
  revalidatePath("/admin/tickets/handover");
  redirect(`/admin/tickets/handover?day=${encodeURIComponent(day)}&saved=1`);
}

export default async function TicketHandoverPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; day?: string; view?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const saved = sp?.saved === "1";
  const err = String(sp?.err ?? "").trim();
  const view = String(sp?.view ?? "cs").trim() === "ops" ? "ops" : "cs";
  const today = new Date().toISOString().slice(0, 10);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(String(sp?.day ?? "")) ? String(sp?.day) : today;
  const selectedDate = parseDateOnly(selectedDay) ?? parseDateOnly(today)!;
  const { start, end } = dayRange(selectedDate);

  const [existing, rows, allStatusCounts, createdTodayStatus, unresolvedCards, completedToday] = await Promise.all([
    prisma.ticketHandover.findUnique({ where: { handoverDate: selectedDate } }),
    prisma.ticketHandover.findMany({
      orderBy: { handoverDate: "desc" },
      take: 30,
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
        summary: true,
      },
    }),
    prisma.ticket.count({
      where: { isArchived: false, completedAt: { gte: start, lt: end } },
    }),
  ]);

  const statusCount = Object.fromEntries(allStatusCounts.map((x) => [x.status, x._count._all]));
  const createdToday = createdTodayStatus.reduce((sum, x) => sum + x._count._all, 0);

  const needInfoCards = unresolvedCards.filter((x) => x.status === "Need Info");
  const waitingTeacherCards = unresolvedCards.filter((x) => x.status === "Waiting Teacher");
  const waitingParentCards = unresolvedCards.filter((x) => x.status === "Waiting Parent");
  const exceptionCards = unresolvedCards.filter((x) => x.status === "Exception");
  const cardGroups = [
    { title: "Need Info", cards: needInfoCards },
    { title: "Waiting Teacher", cards: waitingTeacherCards },
    { title: "Waiting Parent", cards: waitingParentCards },
    { title: "Exception", cards: exceptionCards },
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
  const parsedExistingNotes = parseComposedNotes(existing?.notes);

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
          必填项缺失：未闭环Top3、明日风险、责任人+截止时间 / Required fields missing
        </div>
      ) : null}

      <form method="GET" className="ts-filter-bar" style={{ marginBottom: 10 }}>
        <label>
          Date / 日期
          <input type="date" name="day" defaultValue={selectedDay} />
        </label>
        <label>
          View / 视图
          <select name="view" defaultValue={view}>
            <option value="cs">客服视图 / CS View</option>
            <option value="ops">教务视图 / Ops View</option>
          </select>
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>
      <div style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Quick Fill Tips / 快速填写建议</div>
        {view === "cs" ? (
          <div>1) Top3按家长催进度优先 2) 明日风险写未确认时间/未回消息 3) 负责人和截止请精确到分钟</div>
        ) : (
          <div>1) Top3按排课冲突优先 2) 明日风险写老师/教室/签到风险 3) 负责人和截止请精确到分钟</div>
        )}
      </div>

      <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 10, padding: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>自动汇总 / Auto Summary</div>
        <div>New tickets: {createdToday}</div>
        <div>Completed: {completedToday}</div>
        <div>Need Info: {statusCount["Need Info"] ?? 0}</div>
        <div>Waiting Teacher: {statusCount["Waiting Teacher"] ?? 0}</div>
        <div>Waiting Parent: {statusCount["Waiting Parent"] ?? 0}</div>
        <div>Exception: {statusCount["Exception"] ?? 0}</div>
      </div>

      <div style={{ border: "1px solid #fbcfe8", background: "#fdf2f8", borderRadius: 10, padding: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>未闭环自动卡片 / Open Ticket Cards</div>
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
          未闭环Top3（必填）/ Unresolved Top3 (Required)
          <textarea
            name="unresolvedTop3"
            rows={3}
            defaultValue={parsedExistingNotes.unresolvedTop3 || defaultUnresolvedTop3}
            required
          />
        </label>

        <label>
          明日首课风险（必填）/ Tomorrow First-class Risks (Required)
          <textarea
            name="tomorrowRisk"
            rows={3}
            defaultValue={
              existing?.tomorrowLessonsCheck ??
              (view === "ops"
                ? "请填写：老师确认、教室、到课风险\nPlease fill: teacher confirmation, room, attendance risk"
                : "请填写：家长沟通、确认时间、未确认项\nPlease fill: parent communication, confirmed time, pending items")
            }
            required
          />
        </label>

        <label>
          责任人+截止时间（必填）/ Owner + Deadline (Required)
          <textarea
            name="ownerDeadline"
            rows={3}
            defaultValue={parsedExistingNotes.ownerDeadline || defaultOwnerDeadline}
            required
          />
        </label>

        {view === "cs" ? (
          <>
            <label>
              Need Info（责任人/截止）/ Need Info (Owner/Deadline)
              <textarea name="needInfo" rows={2} defaultValue={existing?.needInfo ?? ""} />
            </label>
            <label>
              Waiting Parent/Partner（责任人/最晚确认）/ Waiting Parent/Partner
              <textarea name="waitingParentPartner" rows={2} defaultValue={existing?.waitingParentPartner ?? ""} />
            </label>
          </>
        ) : (
          <>
            <label>
              Waiting Teacher（责任人/预计回）/ Waiting Teacher (Owner/ETA)
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
        <button type="submit">{t(lang, "Save Handover", "保存交接")}</button>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Date / 日期</th>
              <th align="left">New / 新增</th>
              <th align="left">Done / 完成</th>
              <th align="left">Need Info</th>
              <th align="left">Waiting Teacher</th>
              <th align="left">Waiting Parent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td>{r.handoverDate.toLocaleDateString()}</td>
                <td>{r.newTickets}</td>
                <td>{r.completed}</td>
                <td style={{ maxWidth: 220 }}>{r.needInfo ?? "-"}</td>
                <td style={{ maxWidth: 220 }}>{r.waitingTeacher ?? "-"}</td>
                <td style={{ maxWidth: 220 }}>{r.waitingParentPartner ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
