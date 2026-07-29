import { getCurrentUser } from "@/lib/auth";
import { canAccessTrainingModule, findTrainingModule } from "@/lib/training-center";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "STUDENT") return new Response("Unauthorized", { status: 401 });
  const { code } = await context.params;
  const item = findTrainingModule(code);
  if (!item || !canAccessTrainingModule(user.role, user.trainingRoles, code)) return new Response("Forbidden", { status: 403 });
  const file = await readFile(path.join(process.cwd(), "output", "pdf", item.pdfFile));
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  const etag = `"training-${encodeURIComponent(item.version)}-${file.byteLength}"`;
  const responseHeaders = {
    "content-type": "application/pdf",
    "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(item.pdfFile)}`,
    "content-length": String(file.byteLength),
    "cache-control": "private, max-age=3600, must-revalidate",
    "x-content-type-options": "nosniff",
    etag,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: responseHeaders });
  }

  return new Response(file, {
    headers: responseHeaders,
  });
}
