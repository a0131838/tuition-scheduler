import { readFile, stat } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { getParentPaymentRecordById } from "@/lib/student-parent-billing";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

function toAsciiFilename(name: string) {
  const ext = path.extname(name);
  const base = path
    .basename(name, ext)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "payment-proof"}${ext}`;
}

function buildParentPaymentProofPath(relativePath: string) {
  const normalized = String(relativePath || "").trim();
  if (!normalized.startsWith("/uploads/payment-proofs/")) return null;
  const rel = normalized.replace(/^\//, "");
  if (rel.includes("..") || rel.includes("\\")) return null;
  return path.join(process.cwd(), "public", ...rel.split("/"));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;
  const record = await getParentPaymentRecordById(id);
  if (!record) return new Response("Not Found", { status: 404 });

  const absPath = buildParentPaymentProofPath(record.relativePath);
  if (!absPath) return new Response("Not Found", { status: 404 });

  try {
    const st = await stat(absPath);
    if (!st.isFile()) return new Response("Not Found", { status: 404 });
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = path.basename(record.originalFileName || "payment-proof");
  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const body = await readFile(absPath);
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const asciiName = toAsciiFilename(safeName);
  const encodedName = encodeURIComponent(safeName);

  const headers = new Headers({
    "content-type": contentType,
    "cache-control": "private, max-age=3600",
    "content-length": String(body.byteLength),
  });

  if (download) {
    headers.set(
      "content-disposition",
      `attachment; filename="${asciiName.replace(/"/g, "")}"; filename*=UTF-8''${encodedName}`
    );
  }

  return new Response(body, {
    status: 200,
    headers,
  });
}
