import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(value: string) {
  if (!value) return null;
  const [Y, M, D] = value.split("-").map(Number);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return "invalid";
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
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
  const school = String(body?.school ?? "").trim();
  const grade = String(body?.grade ?? "").trim();
  const targetSchool = String(body?.targetSchool ?? "").trim();
  const currentMajor = String(body?.currentMajor ?? "").trim();
  const coachingContent = String(body?.coachingContent ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const curriculum = String(body?.curriculum ?? "").trim();
  const englishLevel = String(body?.englishLevel ?? "").trim();
  const parentExpectation = String(body?.parentExpectation ?? "").trim();
  const mainAnxiety = String(body?.mainAnxiety ?? "").trim();
  const personalityNotes = String(body?.personalityNotes ?? "").trim();
  const academicRiskLevel = String(body?.academicRiskLevel ?? "").trim();
  const currentRiskSummary = String(body?.currentRiskSummary ?? "").trim();
  const nextAction = String(body?.nextAction ?? "").trim();
  const nextActionDueStr = String(body?.nextActionDue ?? "").trim();
  const advisorOwner = String(body?.advisorOwner ?? "").trim();
  const servicePlanType = String(body?.servicePlanType ?? "").trim();
  const birthDateStr = String(body?.birthDate ?? "").trim();
  const sourceChannelId = String(body?.sourceChannelId ?? "").trim() || null;
  const studentTypeId = String(body?.studentTypeId ?? "").trim() || null;

  if (!name) return bad("Name is required", 409);

  const birthDate = parseDateOnly(birthDateStr);
  if (birthDate === "invalid") return bad("Invalid birthDate", 409);
  const nextActionDue = parseDateOnly(nextActionDueStr);
  if (nextActionDue === "invalid") return bad("Invalid nextActionDue", 409);

  const created = await prisma.student.create({
    data: {
      name,
      school: school || null,
      grade: grade || null,
      targetSchool: targetSchool || null,
      currentMajor: currentMajor || null,
      coachingContent: coachingContent || null,
      note: note || null,
      curriculum: curriculum || null,
      englishLevel: englishLevel || null,
      parentExpectation: parentExpectation || null,
      mainAnxiety: mainAnxiety || null,
      personalityNotes: personalityNotes || null,
      academicRiskLevel: academicRiskLevel || null,
      currentRiskSummary: currentRiskSummary || null,
      nextAction: nextAction || null,
      nextActionDue,
      advisorOwner: advisorOwner || null,
      servicePlanType: servicePlanType || null,
      birthDate,
      sourceChannelId,
      studentTypeId,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, studentId: created.id }, { status: 201 });
}
