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

async function saveHandoverAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const day = String(formData.get("handoverDate") ?? "").trim();
  const handoverDate = parseDateOnly(day);
  if (!handoverDate) redirect("/admin/tickets/handover?err=date");

  const toInt = (name: string) => {
    const n = Number(String(formData.get(name) ?? "").trim());
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  };
  const text = (name: string, max = 2000) => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? v.slice(0, max) : null;
  };

  await prisma.ticketHandover.upsert({
    where: { handoverDate },
    create: {
      handoverDate,
      newTickets: toInt("newTickets"),
      completed: toInt("completed"),
      needInfo: text("needInfo"),
      waitingTeacher: text("waitingTeacher"),
      waitingParentPartner: text("waitingParentPartner"),
      tomorrowLessonsCheck: text("tomorrowLessonsCheck"),
      exceptionsEscalations: text("exceptionsEscalations"),
      notes: text("notes"),
      createdByUserId: user.id,
    },
    update: {
      newTickets: toInt("newTickets"),
      completed: toInt("completed"),
      needInfo: text("needInfo"),
      waitingTeacher: text("waitingTeacher"),
      waitingParentPartner: text("waitingParentPartner"),
      tomorrowLessonsCheck: text("tomorrowLessonsCheck"),
      exceptionsEscalations: text("exceptionsEscalations"),
      notes: text("notes"),
      createdByUserId: user.id,
    },
  });
  revalidatePath("/admin/tickets/handover");
  redirect("/admin/tickets/handover?saved=1");
}

export default async function TicketHandoverPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const saved = sp?.saved === "1";
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.ticketHandover.findMany({
    orderBy: { handoverDate: "desc" },
    take: 30,
  });

  return (
    <div>
      <h2>{t(lang, "Daily Handover", "每日交接")}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Back to Tickets", "返回工单中心")}</Link>
        <Link scroll={false} href="/admin/tickets/sop">{t(lang, "SOP One Pager", "SOP一页纸")}</Link>
      </div>
      {saved ? <div style={{ color: "#166534", marginBottom: 10 }}>{t(lang, "Saved", "已保存")}</div> : null}
      <form action={saveHandoverAction} style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <label>
          Date / 日期
          <input name="handoverDate" type="date" defaultValue={today} required />
        </label>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <label>
            New tickets / 新增工单
            <input name="newTickets" type="number" min={0} defaultValue={0} />
          </label>
          <label>
            Completed / 已完成
            <input name="completed" type="number" min={0} defaultValue={0} />
          </label>
        </div>
        <label>
          Need Info（责任人/截止）/ Need Info (Owner/Deadline)
          <textarea name="needInfo" rows={2} />
        </label>
        <label>
          Waiting Teacher（责任人/预计回）/ Waiting Teacher (Owner/ETA)
          <textarea name="waitingTeacher" rows={2} />
        </label>
        <label>
          Waiting Parent/Partner（责任人/最晚确认）/ Waiting Parent/Partner (Owner/Latest Confirm)
          <textarea name="waitingParentPartner" rows={2} />
        </label>
        <label>
          Tomorrow lessons check（A）/ 明日上课检查（A）
          <textarea name="tomorrowLessonsCheck" rows={2} />
        </label>
        <label>
          Exceptions/Escalations / 异常升级
          <textarea name="exceptionsEscalations" rows={2} />
        </label>
        <label>
          Notes / 备注
          <textarea name="notes" rows={2} />
        </label>
        <button type="submit">{t(lang, "Save Handover", "保存交接")}</button>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
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

