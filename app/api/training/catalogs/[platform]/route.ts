import { getCurrentUser } from "@/lib/auth";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOGUES = {
  web: "00-SGT网页端逐功能培训目录-中英文版-20260803.pdf",
  miniapp: "00-SGT小程序逐功能培训目录-中英文版-20260803.pdf",
} as const;

export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "STUDENT") return new Response("Unauthorized", { status: 401 });

  const { platform } = await context.params;
  const fileName = CATALOGUES[platform as keyof typeof CATALOGUES];
  if (!fileName) return new Response("Not found", { status: 404 });

  const file = await readFile(path.join(process.cwd(), "output", "pdf", fileName));
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  const etag = `"training-catalogue-20260803A-${platform}-${file.byteLength}"`;
  const headers = {
    "content-type": "application/pdf",
    "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "content-length": String(file.byteLength),
    "cache-control": "private, max-age=3600, must-revalidate",
    "x-content-type-options": "nosniff",
    etag,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(file, { headers });
}
