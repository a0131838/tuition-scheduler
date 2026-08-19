import path from "path";
import { readdir, stat } from "fs/promises";
import { HrDocumentSensitivity } from "@prisma/client";
import { importPrivateHrFile } from "@/lib/hr-private-files";
import { prisma } from "@/lib/prisma";

const MIME_CATEGORY: Array<[RegExp, string, HrDocumentSensitivity]> = [
  [/employment contract/i, "EMPLOYMENT_CONTRACT", HrDocumentSensitivity.HIGHLY_RESTRICTED],
  [/job description/i, "JOB_DESCRIPTION", HrDocumentSensitivity.RESTRICTED],
  [/resume|curriculum|cv/i, "RECRUITMENT_CV", HrDocumentSensitivity.RESTRICTED],
  [/\b(ic|nric|fin|passport)\b/i, "IDENTITY_DOCUMENT", HrDocumentSensitivity.HIGHLY_RESTRICTED],
  [/degree|diploma|certificate|\bdip\b/i, "QUALIFICATION", HrDocumentSensitivity.RESTRICTED],
];

function classify(fileName: string) {
  return MIME_CATEGORY.find(([pattern]) => pattern.test(fileName))?.slice(1) as [string, HrDocumentSensitivity] | undefined
    || ["LEGACY_HR_DOCUMENT", HrDocumentSensitivity.RESTRICTED];
}

async function collectFiles(root: string): Promise<string[]> {
  const rows = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(rows.filter((row) => !row.name.startsWith(".")).map(async (row) => {
    const fullPath = path.join(root, row.name);
    if (row.isDirectory()) return collectFiles(fullPath);
    if (!row.isFile()) return [];
    const info = await stat(fullPath);
    return info.size > 0 ? [fullPath] : [];
  }));
  return nested.flat();
}

async function main() {
  const sourceDir = path.resolve(process.env.LEGACY_HR_SOURCE_DIR || "");
  const employeeEmail = String(process.env.LEGACY_HR_EMPLOYEE_EMAIL || "").trim().toLowerCase();
  const actorEmail = String(process.env.LEGACY_HR_ACTOR_EMAIL || "zhaohongwei0880@gmail.com").trim().toLowerCase();
  if (!process.env.LEGACY_HR_SOURCE_DIR || !employeeEmail) {
    throw new Error("Set LEGACY_HR_SOURCE_DIR and LEGACY_HR_EMPLOYEE_EMAIL before importing");
  }
  const [employee, actor] = await Promise.all([
    prisma.employeeProfile.findFirst({ where: { user: { email: { equals: employeeEmail, mode: "insensitive" } } } }),
    prisma.user.findFirst({ where: { email: { equals: actorEmail, mode: "insensitive" } } }),
  ]);
  if (!employee) throw new Error(`Employee HR profile not found for ${employeeEmail}`);
  if (!actor) throw new Error(`Import actor not found for ${actorEmail}`);

  const files = await collectFiles(sourceDir);
  let imported = 0;
  let existing = 0;
  for (const sourcePath of files) {
    const [category, sensitivity] = classify(path.basename(sourcePath));
    const stored = await importPrivateHrFile(sourcePath, employee.id, category);
    const found = await prisma.hrDocument.findUnique({
      where: { employeeId_category_fileHash: { employeeId: employee.id, category, fileHash: stored.fileHash } },
    });
    if (found) { existing += 1; continue; }
    await prisma.hrDocument.create({
      data: {
        employeeId: employee.id,
        legalEntityId: employee.legalEntityId,
        category,
        sensitivity,
        originalName: stored.originalName,
        privatePath: stored.privatePath,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        fileHash: stored.fileHash,
        source: "LEGACY_HR_IMPORT",
        uploadedById: actor.id,
      },
    });
    imported += 1;
  }
  await prisma.auditLog.create({
    data: {
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      module: "hr",
      action: "LEGACY_DOCUMENTS_IMPORTED",
      entityType: "EmployeeProfile",
      entityId: employee.id,
      meta: { imported, existing, sourceDirectoryName: path.basename(sourceDir) },
    },
  });
  console.log(`[hr-import] complete: imported=${imported}, existing=${existing}, files=${files.length}`);
}

main().finally(() => prisma.$disconnect());
