"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacherProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRenewalReportDraft, validateRenewalReportDraft } from "@/lib/renewal-progress-report";

export async function saveRenewalProgressReport(form: FormData) {
  const { user, teacher } = await requireTeacherProfile();
  if (user.isObserver) throw Error("READ_ONLY");
  const id = String(form.get("reportId") || "");
  const mode = String(form.get("mode") || "save");
  if (mode !== "save" && mode !== "submit") throw Error("INVALID_MODE");
  const raw = Object.fromEntries(["progress", "strengths", "evidence", "challenges", "nextSteps", "familyNote"].map(key => [key, String(form.get(key) || "").trim()]));
  const draft = mode === "submit" ? validateRenewalReportDraft(raw) : parseRenewalReportDraft(raw);
  if (Object.values(draft).some(value => value.length > 8000)) throw Error("REPORT_TOO_LONG");
  await prisma.$transaction(async tx => {
    const updated = await tx.renewalProgressReport.updateMany({
      where: { id, teacherId: teacher.id, status: "ASSIGNED" },
      data: { reportJson: draft, ...(mode === "submit" ? { status: "SUBMITTED", submittedAt: new Date(), reviewNote: null } : {}) },
    });
    if (!updated.count) throw Error("REPORT_NOT_EDITABLE");
    if (mode === "submit") await tx.auditLog.create({ data: { actorEmail: user.email, module: "LEARNING_REPORT", action: "SUBMIT_RENEWAL_PROGRESS", entityType: "RENEWAL", entityId: id } });
  });
  revalidatePath(`/teacher/renewal-reports/${id}`);
  revalidatePath("/teacher/renewal-reports");
  redirect(`/teacher/renewal-reports/${id}?saved=${mode}`);
}
