import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

function safeFilename(raw: string) {
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(decoded)) return null;
  return decoded;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = safeFilename(filename);
  if (!safe) return new Response("Not Found", { status: 404 });

  const absPath = path.join(process.cwd(), "public", "uploads", "tickets", safe);
  try {
    const st = await stat(absPath);
    if (!st.isFile()) return new Response("Not Found", { status: 404 });
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const stream = createReadStream(absPath);
  return new Response(stream as any, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=3600",
      "content-disposition": `inline; filename="${safe}"`,
    },
  });
}

