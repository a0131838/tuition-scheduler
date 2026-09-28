import type { Prisma } from "@prisma/client";

// Called in the existing package-edit transaction, after reading the locked row.
// A renewal verifier can then prove a period extension without inventing hours.
export async function recordPackageValidityChange(db: Prisma.TransactionClient, input: {
  packageId: string; studentId: string; courseId: string; actor: { email: string; name?: string | null; role?: string | null };
  before: { validFrom: Date; validTo: Date | null }; after: { validFrom: Date; validTo: Date | null };
}) {
  const before = { validFrom: input.before.validFrom.toISOString(), validTo: input.before.validTo?.toISOString() || null };
  const after = { validFrom: input.after.validFrom.toISOString(), validTo: input.after.validTo?.toISOString() || null };
  if (before.validFrom === after.validFrom && before.validTo === after.validTo) return;
  await db.auditLog.create({ data: {
    actorEmail: input.actor.email, actorName: input.actor.name || null, actorRole: input.actor.role || null,
    module: "PACKAGE", action: "UPDATE_PACKAGE_VALIDITY", entityType: "CoursePackage", entityId: input.packageId,
    meta: { studentId: input.studentId, courseId: input.courseId, before, after },
  } });
}
