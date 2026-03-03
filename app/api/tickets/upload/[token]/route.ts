import { prisma } from "@/lib/prisma";
import { TICKET_UPLOAD_ACCEPT, TICKET_UPLOAD_MAX_BYTES } from "@/lib/tickets";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

async function ensureTokenOk(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true },
  });
  if (!row) return false;
  if (!row.isActive) return false;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!(await ensureTokenOk(token))) return bad("Intake link is invalid or expired", 403);

  const form = await req.formData().catch(() => null);
  if (!form) return bad("Invalid form data");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return bad("No file uploaded");
  if (files.length > 10) return bad("Too many files (max 10)");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "tickets");
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    if (file.size > TICKET_UPLOAD_MAX_BYTES) {
      return bad(`File too large: ${file.name} (max 10MB)`);
    }
    if (file.type && !TICKET_UPLOAD_ACCEPT.includes(file.type)) {
      return bad(`Unsupported file type: ${file.name}`);
    }

    const ext = path.extname(file.name).slice(0, 10).toLowerCase();
    const safeExt = /^[a-z0-9.]+$/.test(ext) ? ext : "";
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;
    const absPath = path.join(uploadDir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(absPath, buf);
    urls.push(`/api/tickets/files/${filename}`);
  }

  return Response.json({ ok: true, urls });
}
