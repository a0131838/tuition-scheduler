import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TeachingLanguage } from "@prisma/client";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
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
  const subjectIds = Array.isArray(body?.subjectIds) ? body.subjectIds.map((v: any) => String(v)).filter(Boolean) : [];

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

  await prisma.teacher.update({
    where: { id },
    data: {
      name,
      nationality: nationality || null,
      almaMater: almaMater || null,
      intro: intro || null,
      yearsExperience,
      teachingLanguage,
      teachingLanguageOther: teachingLanguage ? null : teachingLanguageOther || null,
      offlineShanghai,
      offlineSingapore,
      subjects: { set: subjectIds.map((sid: string) => ({ id: sid })) },
    },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing teacher id", 409);

  await prisma.teacherAvailability.deleteMany({ where: { teacherId: id } });
  await prisma.teacherAvailabilityDate.deleteMany({ where: { teacherId: id } });
  await prisma.teacherOneOnOneTemplate.deleteMany({ where: { teacherId: id } });
  await prisma.appointment.deleteMany({ where: { teacherId: id } });
  const classes = await prisma.class.findMany({
    where: { teacherId: id },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);
  if (classIds.length > 0) {
    await prisma.enrollment.deleteMany({ where: { classId: { in: classIds } } });
    await prisma.attendance.deleteMany({ where: { session: { classId: { in: classIds } } } });
    await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
  }
  await prisma.class.deleteMany({ where: { teacherId: id } });
  await prisma.oneOnOneGroup.deleteMany({ where: { teacherId: id } });
  await prisma.user.updateMany({ where: { teacherId: id }, data: { teacherId: null } });
  await prisma.teacher.delete({ where: { id } });

  return Response.json({ ok: true });
}

