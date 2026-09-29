import {deleteUnusedSchedulingContainer} from '@/lib/scheduling-container-deletion';
import {requireSessionDeletionActor} from '@/lib/session-deletion-auth';
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TeachingLanguage } from "@prisma/client";
import { cleanTeacherPaymentProfile } from "@/lib/teacher-payment-profile";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing teacher id", 409);

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
  const teachingOnline = !!body?.teachingOnline;
  const teachingHome = !!body?.teachingHome;
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

  try {
    await prisma.teacher.update({
      where: { id },
      data: {
        name,
        tutorCode: paymentProfile.tutorCode,
        nationality: nationality || null,
        almaMater: almaMater || null,
        intro: intro || null,
        yearsExperience,
        teachingLanguage,
        teachingLanguageOther: teachingLanguage ? null : teachingLanguageOther || null,
        offlineShanghai,
        offlineSingapore,
        teachingOnline,
        teachingHome,
        paymentMethod: paymentProfile.paymentMethod,
        payNowType: paymentProfile.payNowType,
        payNowValue: paymentProfile.payNowValue,
        payNowName: paymentProfile.payNowName,
        payNowNote: paymentProfile.payNowNote,
        wiseAccountName: paymentProfile.wiseAccountName,
        wiseEmail: paymentProfile.wiseEmail,
        wisePhone: paymentProfile.wisePhone,
        wiseTag: paymentProfile.wiseTag,
        wiseCountry: paymentProfile.wiseCountry,
        wiseCurrency: paymentProfile.wiseCurrency,
        wiseNote: paymentProfile.wiseNote,
        paymentProfileStatus: paymentProfile.paymentProfileStatus ?? "PENDING_REVIEW",
        paymentProfileRejectReason: paymentProfile.paymentProfileRejectReason,
        paymentProfileVerifiedAt: paymentProfile.paymentProfileStatus === "VERIFIED" ? new Date() : null,
        paymentProfileVerifiedBy: paymentProfile.paymentProfileStatus === "VERIFIED" ? admin.email : null,
        subjects: { set: subjectIds.map((sid: string) => ({ id: sid })) },
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") return bad("Tutor code already exists", 409);
    throw err;
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let actor;try{actor=await requireSessionDeletionActor();}catch{return bad('Teaching management permission required / 需要教学管理权限',403);}
  const {id}=await ctx.params;
  try{return Response.json(await deleteUnusedSchedulingContainer('Teacher',id,actor));}
  catch(e){return bad(e instanceof Error?e.message:'Delete failed / 删除失败',409);}
}
