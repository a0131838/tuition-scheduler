import { getCurrentUser } from "@/lib/auth";
import { findTrainingModule } from "@/lib/training-center";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "STUDENT") return new Response("Unauthorized", { status: 401 });
  const { code } = await context.params;
  const item = findTrainingModule(code);
  if (!item || !item.roles.includes(user.role)) return new Response("Forbidden", { status: 403 });
  const file = await readFile(path.join(process.cwd(), "output", "pdf", item.pdfFile));
  return new Response(file, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(item.pdfFile)}`,
      "cache-control": "private, no-store",
    },
  });
}
