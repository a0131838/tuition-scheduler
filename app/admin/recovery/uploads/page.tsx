import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stat } from "fs/promises";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import {
  workbenchHeroStyle,
  workbenchInfoBarStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";

type MissingRecord = {
  relPath: string;
  source: "ticket" | "expense" | "package_payment" | "partner_payment";
  refNo: string;
  owner: string;
};

type SourceFilter = "ALL" | MissingRecord["source"];

const PARENT_BILLING_KEYS = ["parent_billing_v1", "parent_billing_records_v1"] as const;
const PARTNER_BILLING_KEYS = ["partner_billing_v1", "partner_billing_records_v1"] as const;

function safeRelUploadPath(relPath: string) {
  const trimmed = String(relPath || "").trim();
  if (!trimmed.startsWith("/uploads/")) return null;
  if (trimmed.includes("..") || trimmed.includes("\\")) return null;
  const clean = trimmed.replace(/^\//, "");
  return path.join(process.cwd(), "public", ...clean.split("/"));
}

async function missingIfNotExists(record: MissingRecord, out: MissingRecord[]) {
  const abs = safeRelUploadPath(record.relPath);
  if (!abs) return;
  const st = await stat(abs).catch(() => null);
  if (!st || !st.isFile()) out.push(record);
}

async function getMissingUploads(): Promise<MissingRecord[]> {
  const out: MissingRecord[] = [];

  const tickets = await prisma.ticket.findMany({
    select: { ticketNo: true, studentName: true, proof: true },
    orderBy: { createdAt: "desc" },
  });
  for (const row of tickets) {
    const files = String(row.proof ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    for (const item of files) {
      let relPath = item;
      if (item.startsWith("/api/tickets/files/")) {
        const filename = decodeURIComponent(item.split("/").pop() ?? "").trim();
        if (!filename) continue;
        relPath = `/uploads/tickets/${filename}`;
      }
      await missingIfNotExists(
        {
          relPath,
          source: "ticket",
          refNo: row.ticketNo,
          owner: row.studentName,
        },
        out
      );
    }
  }

  const expenses = await prisma.expenseClaim.findMany({
    select: { claimRefNo: true, submitterName: true, receiptPath: true },
    orderBy: { createdAt: "desc" },
  });
  for (const row of expenses) {
    const relPath = String(row.receiptPath ?? "").trim();
    if (!relPath.startsWith("/uploads/")) continue;
    await missingIfNotExists(
      {
        relPath,
        source: "expense",
        refNo: row.claimRefNo,
        owner: row.submitterName,
      },
      out
    );
  }

  const appSettings = await prisma.appSetting.findMany({
    where: { key: { in: [...PARENT_BILLING_KEYS, ...PARTNER_BILLING_KEYS] } },
    select: { key: true, value: true },
  });

  for (const row of appSettings) {
    let parsed: any = null;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      parsed = null;
    }
    const records = Array.isArray(parsed?.paymentRecords) ? parsed.paymentRecords : [];
    for (const rec of records) {
      const relPath = String(rec?.relativePath ?? "").trim();
      if (!relPath.startsWith("/uploads/")) continue;
      if (PARENT_BILLING_KEYS.includes(row.key as (typeof PARENT_BILLING_KEYS)[number])) {
        await missingIfNotExists(
          {
            relPath,
            source: "package_payment",
            refNo: String(rec?.packageId ?? ""),
            owner: String(rec?.originalFileName ?? ""),
          },
          out
        );
      } else {
        await missingIfNotExists(
          {
            relPath,
            source: "partner_payment",
            refNo: String(rec?.monthKey ?? ""),
            owner: String(rec?.originalFileName ?? ""),
          },
          out
        );
      }
    }
  }

  return out;
}

function sourceLabel(lang: Awaited<ReturnType<typeof getLang>>, source: MissingRecord["source"]) {
  switch (source) {
    case "ticket":
      return t(lang, "Ticket attachments", "工单附件");
    case "expense":
      return t(lang, "Expense attachments", "报销附件");
    case "package_payment":
      return t(lang, "Parent payment proofs", "家长缴费凭证");
    case "partner_payment":
      return t(lang, "Partner payment proofs", "合作方付款凭证");
  }
}

function sourceBadgeColor(source: MissingRecord["source"]) {
  switch (source) {
    case "ticket":
      return { border: "#93c5fd", bg: "#eff6ff", fg: "#1d4ed8" };
    case "expense":
      return { border: "#fda4af", bg: "#fff1f2", fg: "#be123c" };
    case "package_payment":
      return { border: "#fdba74", bg: "#fff7ed", fg: "#c2410c" };
    case "partner_payment":
      return { border: "#c4b5fd", bg: "#f5f3ff", fg: "#6d28d9" };
  }
}

function sourceWorkflowHref(source: MissingRecord["source"], record?: MissingRecord) {
  switch (source) {
    case "ticket":
      return "/admin/tickets";
    case "expense":
      return "/admin/expense-claims?attachmentIssueOnly=1";
    case "package_payment":
      if (record?.refNo) return `/admin/receipts-approvals?packageId=${encodeURIComponent(record.refNo)}&queueFilter=FILE_ISSUE`;
      return "/admin/receipts-approvals?queueFilter=FILE_ISSUE";
    case "partner_payment":
      return "/admin/reports/partner-settlement/billing";
  }
}

function sourceWorkflowLabel(lang: Awaited<ReturnType<typeof getLang>>, source: MissingRecord["source"]) {
  switch (source) {
    case "ticket":
      return t(lang, "Open ticket center", "打开工单中心");
    case "expense":
      return t(lang, "Open expense attachment issues", "打开报销附件异常");
    case "package_payment":
      return t(lang, "Open receipt proof issues", "打开收据凭证异常");
    case "partner_payment":
      return t(lang, "Open partner settlement billing", "打开合作方结算账单");
  }
}

function recoverySummaryCardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 6,
    alignContent: "start",
  } as const;
}

function recoverySectionLinkStyle(background: string, border: string) {
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

async function recoverUploadsAction(formData: FormData) {
  "use server";
  await requireAdmin();

  const files = formData.getAll("files").filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    redirect("/admin/recovery/uploads?err=no-files");
  }

  const missing = await getMissingUploads();
  const byBasename = new Map<string, MissingRecord[]>();
  for (const item of missing) {
    const base = path.basename(item.relPath);
    const arr = byBasename.get(base) ?? [];
    arr.push(item);
    byBasename.set(base, arr);
  }

  let recoveredCount = 0;
  let unmatchedCount = 0;
  for (const file of files) {
    const targets = byBasename.get(file.name) ?? [];
    if (targets.length === 0) {
      unmatchedCount += 1;
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    for (const target of targets) {
      const abs = safeRelUploadPath(target.relPath);
      if (!abs) continue;
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, buffer);
      recoveredCount += 1;
    }
  }

  redirect(
    `/admin/recovery/uploads?ok=1&recovered=${encodeURIComponent(String(recoveredCount))}&unmatched=${encodeURIComponent(String(unmatchedCount))}`
  );
}

export default async function AdminRecoveryUploadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string; recovered?: string; unmatched?: string; source?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const err = String(sp?.err ?? "").trim();
  const ok = String(sp?.ok ?? "").trim();
  const recovered = Number(String(sp?.recovered ?? "0")) || 0;
  const unmatched = Number(String(sp?.unmatched ?? "0")) || 0;
  const sourceFilter = (["ticket", "expense", "package_payment", "partner_payment"].includes(String(sp?.source ?? ""))
    ? String(sp?.source)
    : "ALL") as SourceFilter;

  const missing = await getMissingUploads();
  const byType = {
    ticket: missing.filter((x) => x.source === "ticket"),
    expense: missing.filter((x) => x.source === "expense"),
    packagePayment: missing.filter((x) => x.source === "package_payment"),
    partnerPayment: missing.filter((x) => x.source === "partner_payment"),
  };
  const filteredMissing = sourceFilter === "ALL" ? missing : missing.filter((item) => item.source === sourceFilter);
  const financeIssueCount = byType.expense.length + byType.packagePayment.length + byType.partnerPayment.length;
  const dominantSource = [
    { source: "ticket" as const, count: byType.ticket.length },
    { source: "expense" as const, count: byType.expense.length },
    { source: "package_payment" as const, count: byType.packagePayment.length },
    { source: "partner_payment" as const, count: byType.partnerPayment.length },
  ].sort((a, b) => b.count - a.count)[0];
  const filterHref = (value: SourceFilter) => (value === "ALL" ? "/admin/recovery/uploads" : `/admin/recovery/uploads?source=${encodeURIComponent(value)}`);
  const recoveryFocusTitle =
    missing.length === 0
      ? t(lang, "Attachment health desk is clear", "附件异常工作台当前已清空")
      : sourceFilter === "ALL"
        ? t(lang, "Start with the largest anomaly source", "先处理当前最大异常来源")
        : t(lang, "This source is now your repair lane", "当前来源就是你的修复队列");
  const recoveryFocusDetail =
    missing.length === 0
      ? t(lang, "No missing file is currently blocking tickets, expenses, or finance proof flows.", "当前没有缺失附件在阻塞工单、报销或财务凭证流程。")
      : sourceFilter === "ALL"
        ? t(lang, `The largest bucket is ${sourceLabel(lang, dominantSource.source)}. Narrow to one source before bulk repair so the next workflow jump stays clear.`, `当前最大来源是${sourceLabel(lang, dominantSource.source)}。建议先切单一来源，再做批量修复，这样回原流程更清楚。`)
        : t(lang, `You are only viewing ${sourceLabel(lang, sourceFilter)}. Repair here, then jump back to that workflow instead of searching again.`, `当前只看${sourceLabel(lang, sourceFilter)}。在这里修复后，直接回对应工作流继续，不用重新找。`);
  const recoverySummaryCards = [
    {
      title: t(lang, "Current focus", "当前建议起点"),
      value: recoveryFocusTitle,
      detail: recoveryFocusDetail,
      background: missing.length > 0 ? "#fff7ed" : "#f0fdf4",
      border: missing.length > 0 ? "#fdba74" : "#86efac",
    },
    {
      title: t(lang, "Current scope", "当前范围"),
      value: sourceFilter === "ALL" ? t(lang, "All anomaly sources", "全部异常来源") : sourceLabel(lang, sourceFilter),
      detail: t(lang, `${filteredMissing.length} visible row(s) in this scope.`, `当前范围里有 ${filteredMissing.length} 条可见记录。`),
      background: "#f8fafc",
      border: "#dbe4f0",
    },
    {
      title: t(lang, "Main pressure points", "当前主要压力点"),
      value: t(lang, `${financeIssueCount} finance-linked · ${byType.ticket.length} ticket-linked`, `${financeIssueCount} 条财务相关 · ${byType.ticket.length} 条工单相关`),
      detail: t(lang, `${missing.length} total missing file row(s).`, `总共有 ${missing.length} 条缺失附件记录。`),
      background: "#fffaf0",
      border: "#fde68a",
    },
  ];
  const recoverySectionLinks = [
    {
      href: "#recovery-filters",
      label: t(lang, "Source filters", "来源筛选"),
      detail: t(lang, "Narrow the anomaly source before repairing", "先缩小来源，再开始修复"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#recovery-upload",
      label: t(lang, "Bulk restore", "批量回填"),
      detail: t(lang, "Upload recovered files back to original paths", "把找回的文件批量写回原路径"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#recovery-source-guide",
      label: t(lang, "Workflow guide", "工作流指引"),
      detail: t(lang, "Jump back to the right source page after repair", "修复后回到正确业务页"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#recovery-detail",
      label: t(lang, "Missing detail", "缺失明细"),
      detail: t(lang, `${Math.min(filteredMissing.length, 80)} visible row(s)`, `当前显示 ${Math.min(filteredMissing.length, 80)} 条`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2, color: "#9a3412" }}>Attachment Health Desk / 附件异常工作台</div>
            <h2 style={{ margin: 0 }}>{t(lang, "Catch missing files early, then jump back to the right workflow.", "先发现缺失文件，再回到正确工作流继续处理。")}</h2>
            <div style={{ color: "#475569", maxWidth: 880, fontSize: 14 }}>
              {t(lang, "This desk brings together missing files from tickets, expense claims, parent payment proofs, and partner payment proofs. Identify the source first, then jump back to the matching workflow instead of hunting across separate pages.", "这里汇总工单、报销、家长缴费凭证和合作方付款凭证的文件缺失情况。先判断异常来源，再回到对应工作流修复，不用分散到每个页面单独查找。")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link scroll={false} href="/admin/receipts-approvals?queueFilter=FILE_ISSUE" style={{ padding: "8px 12px", border: "1px solid #fdba74", borderRadius: 999, background: "#fff7ed" }}>
              {t(lang, "Receipt proof issues", "收据凭证异常")}
            </Link>
            <Link scroll={false} href="/admin/expense-claims?attachmentIssueOnly=1" style={{ padding: "8px 12px", border: "1px solid #fda4af", borderRadius: 999, background: "#fff1f2" }}>
              {t(lang, "Expense attachment issues", "报销附件异常")}
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={workbenchMetricCardStyle("rose")}>
            <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Open anomalies", "当前异常总数")}</div>
            <div style={workbenchMetricValueStyle("rose")}>{missing.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Finance-linked", "财务相关")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{financeIssueCount}</div>
          </div>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Ticket-linked", "工单相关")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{byType.ticket.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Largest bucket", "当前最大来源")}</div>
            <div style={{ ...workbenchMetricValueStyle("slate"), fontSize: 18 }}>{sourceLabel(lang, dominantSource.source)}</div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {recoverySummaryCards.map((card) => (
          <div key={card.title} style={recoverySummaryCardStyle(card.background, card.border)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{card.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{card.value}</div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{card.detail}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          ...workbenchInfoBarStyle,
          position: "sticky",
          top: 12,
          zIndex: 5,
          alignItems: "flex-start",
          background: "#ffffffee",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Attachment repair map", "附件修复地图")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(lang, "Use this strip to switch source scope, restore files, and jump back to the right workflow without rescanning the full page.", "通过这条导航快速切来源、做回填、回主流程，不用每次重新扫整页。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {recoverySectionLinks.map((link) => (
            <a key={link.label} href={link.href} style={recoverySectionLinkStyle(link.background, link.border)}>
              <div style={{ fontWeight: 700 }}>{link.label}</div>
              <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{link.detail}</div>
            </a>
          ))}
        </div>
      </section>

      <div style={workbenchInfoBarStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Next step shortcuts", "下一步快捷入口")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {sourceFilter === "ALL"
              ? t(lang, "You are viewing every source right now. Narrow to one source first if you want a cleaner repair pass.", "当前显示全部异常来源。可先切到某一类，再回到对应工作流。")
              : t(lang, `You are only viewing ${sourceLabel(lang, sourceFilter)}. After the repair, jump straight back to that workflow to continue.`, `当前只看${sourceLabel(lang, sourceFilter)}。修复后可直接回到对应工作流继续处理。`)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/receipts-approvals?queueFilter=FILE_ISSUE">{t(lang, "Open receipt queue", "打开收据异常队列")}</Link>
          <Link href="/admin/expense-claims?attachmentIssueOnly=1">{t(lang, "Open expense queue", "打开报销异常队列")}</Link>
          <Link href="/admin/reports/partner-settlement/billing">{t(lang, "Open partner billing", "打开合作方账单")}</Link>
          <Link href="/admin/tickets">{t(lang, "Open ticket center", "打开工单中心")}</Link>
        </div>
      </div>

      <div id="recovery-filters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([
          { key: "ALL", label: t(lang, "All anomalies", "全部异常"), count: missing.length },
          { key: "expense", label: t(lang, "Expense", "报销"), count: byType.expense.length },
          { key: "package_payment", label: t(lang, "Receipt proofs", "收据凭证"), count: byType.packagePayment.length },
          { key: "partner_payment", label: t(lang, "Partner billing", "合作方结算"), count: byType.partnerPayment.length },
          { key: "ticket", label: t(lang, "Tickets", "工单"), count: byType.ticket.length },
        ] as { key: SourceFilter; label: string; count: number }[]).map((item) => {
          const active = sourceFilter === item.key;
          return (
            <Link
              key={item.key}
              href={filterHref(item.key)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? "#f97316" : "#cbd5e1"}`,
                background: active ? "#fff7ed" : "#ffffff",
                color: active ? "#9a3412" : "#334155",
                fontWeight: active ? 700 : 500,
              }}
            >
              {item.label}: {item.count}
            </Link>
          );
        })}
      </div>

      {err === "no-files" ? <div style={{ color: "#b91c1c" }}>{t(lang, "Please select files before uploading.", "请先选择文件再上传。")}</div> : null}
      {ok === "1" ? (
        <div style={{ color: "#166534", border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: 10 }}>
          {t(lang, `Restore complete: wrote back ${recovered} file entries; ${unmatched} uploads did not match any missing path.`, `补回完成：成功写回 ${recovered} 项；未匹配文件 ${unmatched} 个。`)}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)", gap: 14 }}>
        <form id="recovery-upload" action={recoverUploadsAction} encType="multipart/form-data" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Bulk re-upload", "批量补回附件")}</div>
          <div style={{ color: "#475569", fontSize: 12 }}>
            {t(lang, "Files are matched by the original filename in the missing list and written back to the original path. Use this after you recover files from chat history, email, or a local backup.", "按缺失清单里的原文件名自动匹配并写回原路径。适合已经从聊天记录、邮箱或本地备份中找回文件后，一次性回填。")}
          </div>
          <input name="files" type="file" multiple />
          <button type="submit" style={{ width: 220 }}>{t(lang, "Upload and restore", "上传并回填")}</button>
        </form>

        <div id="recovery-source-guide" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Source workflow guide", "来源工作流指引")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>{t(lang, "Different sources need different repair pages. Check the source first, then use the matching shortcut.", "不同来源的异常需要回到不同的业务页处理。先看来源，再用右侧快捷入口跳回去。")}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {(["expense", "package_payment", "partner_payment", "ticket"] as MissingRecord["source"][]).map((source) => {
              const tone = sourceBadgeColor(source);
              return (
                <div key={source} style={{ border: `1px solid ${tone.border}`, background: tone.bg, color: tone.fg, borderRadius: 12, padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 700 }}>{sourceLabel(lang, source)}</div>
                  <Link href={sourceWorkflowHref(source)} style={{ color: tone.fg }}>
                    {sourceWorkflowLabel(lang, source)}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div id="recovery-detail" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>
            {t(lang, "Missing file detail", "缺失明细")}
            <span style={{ color: "#64748b", fontWeight: 500 }}> {t(lang, `(showing ${Math.min(filteredMissing.length, 80)} / ${filteredMissing.length})`, `（显示 ${Math.min(filteredMissing.length, 80)} / ${filteredMissing.length}）`)}</span>
          </div>
          {sourceFilter !== "ALL" ? <Link href="/admin/recovery/uploads">{t(lang, "Show all sources", "查看全部来源")}</Link> : null}
        </div>
        <div style={{ maxHeight: 420, overflow: "auto" }}>
          <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left">{t(lang, "Source", "类型")}</th>
                <th align="left">{t(lang, "Reference", "单号")}</th>
                <th align="left">{t(lang, "Owner", "归属")}</th>
                <th align="left">{t(lang, "Path", "路径")}</th>
                <th align="left">{t(lang, "Filename", "文件名")}</th>
                <th align="left">{t(lang, "Next step", "下一步")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMissing.slice(0, 80).map((m, idx) => {
                const tone = sourceBadgeColor(m.source);
                return (
                <tr key={`${m.relPath}-${idx}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td>
                    <span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, border: `1px solid ${tone.border}`, background: tone.bg, color: tone.fg, fontSize: 12 }}>
                      {sourceLabel(lang, m.source)}
                    </span>
                  </td>
                  <td>{m.refNo || "-"}</td>
                  <td>{m.owner || "-"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.relPath}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{path.basename(m.relPath)}</td>
                  <td>
                    <Link href={sourceWorkflowHref(m.source, m)}>{sourceWorkflowLabel(lang, m.source)}</Link>
                  </td>
                </tr>
                );
              })}
              {filteredMissing.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 18, color: "#166534", background: "#f0fdf4" }}>
                    {t(lang, "No missing files match this filter. You can return to the original workflow or switch to another source.", "当前筛选下没有缺失附件。可以回到原工作流继续处理，或切换其他来源查看。")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
