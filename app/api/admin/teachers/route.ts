import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TeachingLanguage } from "@prisma/client";
import { allocateNextTutorCode, cleanTeacherPaymentProfile } from "@/lib/teacher-payment-profile";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = String(body?.name ?? "").trim();
  const nationality = String(body?.nationality ?? "").trim();
  const almaMater = String(body?.almaMater ?? "").trim();
  const intro = String(body?.intro ?? "").trim();
  const yearsExperienceRaw = String(body?.yearsExperience ?? "").trim();
  const teachingLanguageRaw = String(body?.teachingLanguage ?? "").trim();
  const teachingLanguageOther = String(body?.teachingLanguageOther ?? "").trim();
  const offlineShanghai = !!body?.offlineShanghai;
  const offlineSingapore = !!body?.offlineSingapore;
  const subjectIds = Array.isArray(body?.subjectIds) ? body.subjectIds.map((v: any) => String(v)).filter(Boolean) : [];
  const paymentProfile = cleanTeacherPaymentProfile(body ?? {});

  if (!name) return bad("Name is required", 409);

  let yearsExperience: number | null = null;
  if (yearsExperienceRaw) {
    const n = Number(yearsExperienceRaw);
    if (Number.isFinite(n) && n >= 0) yearsExperience = n;
  }

  const teachingLanguage =
    teachingLanguageRaw === "CHINESE" || teachingLanguageRaw === "ENGLISH" || teachingLanguageRaw === "BILINGUAL"
      ? (teachingLanguageRaw as TeachingLanguage)
      : null;
  if (teachingLanguageRaw === "OTHER" && !teachingLanguageOther) {
    return bad("Other language is required", 409);
  }

  let created: { id: string };
  try {
    created = await prisma.teacher.create({
      data: {
        name,
        tutorCode: paymentProfile.tutorCode || (await allocateNextTutorCode()),
        nationality: nationality || null,
        almaMater: almaMater || null,
        intro: intro || null,
        yearsExperience,
        teachingLanguage,
        teachingLanguageOther: teachingLanguage ? null : teachingLanguageOther || null,
        offlineShanghai,
        offlineSingapore,
        paymentMethod: paymentProfile.paymentMethod,
        payNowType: paymentProfile.payNowType,
        payNowValue: paymentProfile.payNowValue,
        payNowName: paymentProfile.payNowName,
        payNowNote: paymentProfile.payNowNote,
        bankName: paymentProfile.bankName,
        bankAccountName: paymentProfile.bankAccountName,
        bankAccountNumber: paymentProfile.bankAccountNumber,
        bankBranchCode: paymentProfile.bankBranchCode,
        subjects: { connect: subjectIds.map((id: string) => ({ id })) },
      },
      select: { id: true },
    });
  } catch (err: any) {
    if (err?.code === "P2002") return bad("Tutor code already exists", 409);
    throw err;
  }

  return Response.json({ ok: true, id: created.id }, { status: 201 });
}
