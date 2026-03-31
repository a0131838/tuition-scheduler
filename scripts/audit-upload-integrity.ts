import { prisma } from "@/lib/prisma";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";

type UploadSource =
  | "expense_claim"
  | "parent_payment_proof"
  | "partner_payment_proof"
  | "ticket_attachment"
  | "shared_document_local"
  | "shared_document_remote";

type UploadIntegrityRow = {
  source: UploadSource;
  refNo: string;
  owner: string;
  originalFileName: string;
  relativePath: string;
  missing: boolean;
  note: string | null;
};

type UploadIntegritySummary = {
  generatedAt: string;
  totalChecked: number;
  totalMissing: number;
  bySource: Record<string, { checked: number; missing: number }>;
  detailPath: string;
  summaryPath: string;
};

const PARENT_BILLING_KEYS = ["parent_billing_v1", "parent_billing_records_v1"] as const;
const PARTNER_BILLING_KEYS = ["partner_billing_v1", "partner_billing_records_v1"] as const;

function toStoredUploadAbsolutePath(relativePath: string) {
  const raw = String(relativePath || "").trim();
  if (!raw.startsWith("/uploads/")) return null;
  if (raw.includes("..") || raw.includes("\\")) return null;
  return path.join(process.cwd(), "public", ...raw.replace(/^\//, "").split("/"));
}

async function fileExists(relativePath: string) {
  const absPath = toStoredUploadAbsolutePath(relativePath);
  if (!absPath) return false;
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

async function collectTicketRows() {
  const tickets = await prisma.ticket.findMany({
    select: { ticketNo: true, studentName: true, proof: true },
    orderBy: { createdAt: "desc" },
  });

  const rows: UploadIntegrityRow[] = [];
  for (const row of tickets) {
    const files = String(row.proof ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    for (const item of files) {
      let relativePath = item;
      if (item.startsWith("/api/tickets/files/")) {
        const filename = decodeURIComponent(item.split("/").pop() ?? "").trim();
        if (!filename) continue;
        relativePath = `/uploads/tickets/${filename}`;
      }
      if (!relativePath.startsWith("/uploads/")) continue;
      rows.push({
        source: "ticket_attachment",
        refNo: row.ticketNo,
        owner: row.studentName,
        originalFileName: path.basename(relativePath),
        relativePath,
        missing: !(await fileExists(relativePath)),
        note: null,
      });
    }
  }
  return rows;
}

async function collectExpenseRows() {
  const claims = await prisma.expenseClaim.findMany({
    select: { claimRefNo: true, submitterName: true, receiptOriginalName: true, receiptPath: true },
    orderBy: { createdAt: "desc" },
  });

  const rows: UploadIntegrityRow[] = [];
  for (const row of claims) {
    const relativePath = String(row.receiptPath ?? "").trim();
    if (!relativePath.startsWith("/uploads/")) continue;
    rows.push({
      source: "expense_claim",
      refNo: row.claimRefNo,
      owner: row.submitterName,
      originalFileName: String(row.receiptOriginalName ?? "").trim() || path.basename(relativePath),
      relativePath,
      missing: !(await fileExists(relativePath)),
      note: null,
    });
  }
  return rows;
}

async function collectSharedDocumentRows() {
  const documents = await prisma.sharedDocument.findMany({
    select: { id: true, title: true, originalFileName: true, filePath: true },
    orderBy: { createdAt: "desc" },
  });

  const rows: UploadIntegrityRow[] = [];
  for (const row of documents) {
    const filePath = String(row.filePath ?? "").trim();
    if (!filePath) continue;
    if (filePath.startsWith("s3://")) {
      rows.push({
        source: "shared_document_remote",
        refNo: row.id,
        owner: row.title,
        originalFileName: row.originalFileName,
        relativePath: filePath,
        missing: false,
        note: "remote_s3_not_checked",
      });
      continue;
    }
    if (!filePath.startsWith("/uploads/")) continue;
    rows.push({
      source: "shared_document_local",
      refNo: row.id,
      owner: row.title,
      originalFileName: row.originalFileName,
      relativePath: filePath,
      missing: !(await fileExists(filePath)),
      note: null,
    });
  }
  return rows;
}

async function collectAppSettingPaymentRows() {
  const appSettings = await prisma.appSetting.findMany({
    where: { key: { in: [...PARENT_BILLING_KEYS, ...PARTNER_BILLING_KEYS] } },
    select: { key: true, value: true },
  });

  const rows: UploadIntegrityRow[] = [];
  for (const setting of appSettings) {
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(setting.value) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    const paymentRecords = Array.isArray(parsed?.paymentRecords) ? parsed.paymentRecords : [];
    for (const item of paymentRecords) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const relativePath = String(row.relativePath ?? "").trim();
      if (!relativePath.startsWith("/uploads/")) continue;
      const isParent = PARENT_BILLING_KEYS.includes(setting.key as (typeof PARENT_BILLING_KEYS)[number]);
      rows.push({
        source: isParent ? "parent_payment_proof" : "partner_payment_proof",
        refNo: isParent ? String(row.packageId ?? "").trim() : String(row.monthKey ?? "").trim(),
        owner: String(row.originalFileName ?? "").trim() || "payment-proof",
        originalFileName: String(row.originalFileName ?? "").trim() || path.basename(relativePath),
        relativePath,
        missing: !(await fileExists(relativePath)),
        note: null,
      });
    }
  }
  return rows;
}

function buildSourceSummary(rows: UploadIntegrityRow[]) {
  const out: Record<string, { checked: number; missing: number }> = {};
  for (const row of rows) {
    const bucket = out[row.source] ?? { checked: 0, missing: 0 };
    bucket.checked += 1;
    if (row.missing) bucket.missing += 1;
    out[row.source] = bucket;
  }
  return out;
}

async function writeReports(rows: UploadIntegrityRow[]) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const reportsDir = path.join(process.cwd(), "ops", "reports");
  await mkdir(reportsDir, { recursive: true });

  const detailPath = path.join(reportsDir, `uploads-integrity-detail-${stamp}.csv`);
  const summaryPath = path.join(reportsDir, `uploads-integrity-summary-${stamp}.json`);

  const csvLines = [
    ["source", "refNo", "owner", "originalFileName", "relativePath", "missing", "note"].join(","),
    ...rows.map((row) =>
      [
        row.source,
        row.refNo,
        row.owner,
        row.originalFileName,
        row.relativePath,
        row.missing ? "yes" : "no",
        row.note ?? "",
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];
  await writeFile(detailPath, `${csvLines.join("\n")}\n`, "utf8");

  const summary: UploadIntegritySummary = {
    generatedAt: now.toISOString(),
    totalChecked: rows.length,
    totalMissing: rows.filter((row) => row.missing).length,
    bySource: buildSourceSummary(rows),
    detailPath,
    summaryPath,
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}

async function main() {
  const rows = [
    ...(await collectExpenseRows()),
    ...(await collectAppSettingPaymentRows()),
    ...(await collectTicketRows()),
    ...(await collectSharedDocumentRows()),
  ];

  const summary = await writeReports(rows);
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
