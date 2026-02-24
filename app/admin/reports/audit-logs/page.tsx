import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type Search = {
  actor?: string;
  module?: string;
  days?: string;
};

const MODULE_OPTIONS = ["ATTENDANCE", "PACKAGE_LEDGER", "TEACHER_PAYROLL", "PARTNER_SETTLEMENT"] as const;

function parseDays(v?: string) {
  const n = Number(v ?? "30");
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(180, Math.round(n));
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;

  const actor = String(sp?.actor ?? "").trim().toLowerCase();
  const moduleName = String(sp?.module ?? "").trim();
  const days = parseDays(sp?.days);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let rows: Array<{
    id: string;
    actorEmail: string;
    actorRole: string | null;
    module: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
    meta: Prisma.JsonValue | null;
  }> = [];
  let loadError = "";
  try {
    rows = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: from },
        ...(actor ? { actorEmail: { contains: actor } } : {}),
        ...(moduleName ? { module: moduleName } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
      loadError = t(lang, "Audit table is not ready yet. Run migration first.", "审计表尚未初始化，请先执行数据库迁移。");
    } else {
      throw err;
    }
  }

  return (
    <div>
      <h2>{t(lang, "Audit Logs", "操作审计日志")}</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        {t(lang, "Track who did what and when in key business flows.", "用于查看关键流程中谁在什么时间做了什么操作。")}
      </div>

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "Actor Email", "操作人邮箱")}:
          <input name="actor" defaultValue={actor} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "Module", "模块")}:
          <select name="module" defaultValue={moduleName} style={{ marginLeft: 6 }}>
            <option value="">{t(lang, "All", "全部")}</option>
            {MODULE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, "Days", "天数")}:
          <input name="days" type="number" min={1} max={180} defaultValue={String(days)} style={{ marginLeft: 6, width: 84 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      {loadError ? <div style={{ color: "#b00", marginBottom: 8 }}>{loadError}</div> : null}
      <div style={{ color: "#666", marginBottom: 8 }}>
        {t(lang, "Showing latest", "当前显示最近")} {days} {t(lang, "days,", "天，")} {rows.length} {t(lang, "rows.", "条记录。")}
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No logs found.", "未找到日志记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Time", "时间")}</th>
              <th align="left">{t(lang, "Actor", "操作人")}</th>
              <th align="left">{t(lang, "Module", "模块")}</th>
              <th align="left">{t(lang, "Action", "动作")}</th>
              <th align="left">{t(lang, "Target", "目标")}</th>
              <th align="left">{t(lang, "Detail", "详情")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id} style={{ borderTop: "1px solid #eee", verticalAlign: "top" }}>
                <td>{new Date(x.createdAt).toLocaleString()}</td>
                <td>
                  <div>{x.actorEmail}</div>
                  {x.actorRole ? <div style={{ color: "#666", fontSize: 12 }}>{x.actorRole}</div> : null}
                </td>
                <td>{x.module}</td>
                <td>{x.action}</td>
                <td>
                  <div>{x.entityType ?? "-"}</div>
                  <div style={{ color: "#666", fontSize: 12 }}>{x.entityId ?? "-"}</div>
                </td>
                <td style={{ maxWidth: 420, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#444", fontSize: 12 }}>
                  {x.meta ? JSON.stringify(x.meta) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
