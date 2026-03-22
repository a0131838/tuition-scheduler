import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stat } from "fs/promises";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { redirect } from "next/navigation";

type MissingRecord = {
  relPath: string;
  source: "ticket" | "expense" | "package_payment" | "partner_payment";
  refNo: string;
  owner: string;
};

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
    where: { key: { in: ["parent_billing_records_v1", "partner_billing_records_v1"] } },
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
      if (row.key === "parent_billing_records_v1") {
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
  searchParams?: Promise<{ ok?: string; err?: string; recovered?: string; unmatched?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const err = String(sp?.err ?? "").trim();
  const ok = String(sp?.ok ?? "").trim();
  const recovered = Number(String(sp?.recovered ?? "0")) || 0;
  const unmatched = Number(String(sp?.unmatched ?? "0")) || 0;

  const missing = await getMissingUploads();
  const byType = {
    ticket: missing.filter((x) => x.source === "ticket"),
    expense: missing.filter((x) => x.source === "expense"),
    packagePayment: missing.filter((x) => x.source === "package_payment"),
    partnerPayment: missing.filter((x) => x.source === "partner_payment"),
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>附件恢复中心 / Upload Recovery</h2>
        <Link scroll={false} href="/admin/tickets" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
          返回工单中心
        </Link>
      </div>

      <div style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 10, padding: 10, color: "#7f1d1d" }}>
        当前缺失：工单附件 {byType.ticket.length}，报销附件 {byType.expense.length}，家长缴费 {byType.packagePayment.length}，合作方凭证 {byType.partnerPayment.length}
      </div>

      {err === "no-files" ? <div style={{ color: "#b91c1c" }}>请先选择文件再上传。/ Please select files first.</div> : null}
      {ok === "1" ? (
        <div style={{ color: "#166534", border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: 10 }}>
          补回完成：成功写回 {recovered} 项；未匹配文件 {unmatched} 个。
        </div>
      ) : null}

      <form action={recoverUploadsAction} encType="multipart/form-data" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>批量上传补回 / Bulk Re-upload</div>
        <div style={{ color: "#475569", fontSize: 12 }}>
          按缺失清单中的原文件名自动匹配并写回到原路径。支持一次多选上传。
        </div>
        <input name="files" type="file" multiple />
        <button type="submit" style={{ width: 220 }}>上传并自动回填</button>
      </form>

      <div style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>缺失明细（前60条）</div>
        <div style={{ maxHeight: 420, overflow: "auto" }}>
          <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left">类型</th>
                <th align="left">单号</th>
                <th align="left">归属</th>
                <th align="left">路径</th>
                <th align="left">文件名</th>
              </tr>
            </thead>
            <tbody>
              {missing.slice(0, 60).map((m, idx) => (
                <tr key={`${m.relPath}-${idx}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td>{m.source}</td>
                  <td>{m.refNo || "-"}</td>
                  <td>{m.owner || "-"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.relPath}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{path.basename(m.relPath)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
