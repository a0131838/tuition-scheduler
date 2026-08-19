import { NextResponse } from "next/server";
import { HrDocumentSensitivity } from "@prisma/client";
import { requireHrManager } from "@/lib/hr-access";
import { storePrivateHrFile } from "@/lib/hr-private-files";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const actor = await requireHrManager();
  try {
    const form = await req.formData();
    const employeeId = String(form.get("employeeId") || "");
    const legalEntityId = String(form.get("legalEntityId") || "");
    const category = String(form.get("category") || "").trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, "_");
    const returnTo = String(form.get("returnTo") || "/admin/hr");
    const file = form.get("file");
    if (!employeeId || !legalEntityId || !category || !(file instanceof File)) throw new Error("Employee, entity, category and file are required");
    const sensitivityRaw = String(form.get("sensitivity") || "RESTRICTED") as HrDocumentSensitivity;
    const sensitivity = Object.values(HrDocumentSensitivity).includes(sensitivityRaw) ? sensitivityRaw : HrDocumentSensitivity.RESTRICTED;
    const stored = await storePrivateHrFile(file, employeeId, category);
    const row = await prisma.hrDocument.upsert({
      where: { employeeId_category_fileHash: { employeeId, category, fileHash: stored.fileHash } },
      create: {
        employeeId, legalEntityId, category, sensitivity,
        originalName: stored.originalName, privatePath: stored.privatePath, mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes, fileHash: stored.fileHash, source: "HR_UPLOAD",
        expiresAt: form.get("expiresAt") ? new Date(`${String(form.get("expiresAt"))}T23:59:59+08:00`) : null,
        uploadedById: actor.id,
      },
      update: { archivedAt: null, archiveReason: null, expiresAt: form.get("expiresAt") ? new Date(`${String(form.get("expiresAt"))}T23:59:59+08:00`) : null },
    });
    await logAudit({ actor, module: "hr", action: "PRIVATE_DOCUMENT_UPLOADED", entityType: "HrDocument", entityId: row.id, meta: { category, sensitivity, sizeBytes: stored.sizeBytes } });
    return NextResponse.redirect(new URL(`${returnTo}?msg=Private+document+uploaded`, req.url), 303);
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
