import { NextRequest, NextResponse } from "next/server";
import { assessSchoolGuidePath } from "@/lib/school-guide-assessment";
import { schoolGuideSchools } from "@/lib/school-guide-data";
import { matchSchoolGuideSchools, selectBalancedSchoolGuideMatches } from "@/lib/school-guide-match";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "资料格式不正确。" }, { status: 400 });
  }
  const targetEntryYear = Number(body.targetEntryYear);
  const residency = body.residency;
  const preferredSystem = body.preferredSystem;
  if (
    !["SC", "PR", "IS"].includes(residency) ||
    !["MOE", "INTERNATIONAL", "UNSURE"].includes(preferredSystem) ||
    !Number.isInteger(targetEntryYear)
  ) {
    return NextResponse.json({ ok: false, message: "请完整填写身份、目标年份和体系偏好。" }, { status: 400 });
  }
  const matches = selectBalancedSchoolGuideMatches(matchSchoolGuideSchools(schoolGuideSchools, {
    budgetMax: Number(body.budgetMax) > 0 ? Number(body.budgetMax) : null,
    curriculum: ["ANY", "IB", "BRITISH", "AMERICAN", "FRENCH", "AUSTRALIAN"].includes(body.curriculum) ? body.curriculum : "ANY",
    englishSupportNeeded: body.englishSupportNeeded === true,
    boardingNeeded: body.boardingNeeded === true,
    currentSchoolType: ["INTERNATIONAL", "MOE", "PRIVATE", "OVERSEAS_LOCAL", "PRESCHOOL", "NOT_ENROLLED"].includes(body.currentSchoolType) ? body.currentSchoolType : "NOT_ENROLLED",
    currentCurriculum: ["ANY", "IB", "BRITISH", "AMERICAN", "MOE", "CHINA", "OTHER"].includes(body.currentCurriculum) ? body.currentCurriculum : "ANY",
    academicLevel: ["NEEDS_SUPPORT", "DEVELOPING", "ON_LEVEL", "STRONG"].includes(body.academicLevel) ? body.academicLevel : "ON_LEVEL",
    assessmentScore: typeof body.assessmentScore === "number" ? body.assessmentScore : null,
  })).map((item) => ({ ...item.school, band: item.band, bandLabel: item.bandLabel, score: item.score, reasons: item.reasons, cautions: item.cautions }));
  return NextResponse.json({
    ok: true,
    result: assessSchoolGuidePath({
      birthDate: String(body.birthDate ?? ""),
      targetEntryYear,
      residency,
      preferredSystem,
    }),
    schoolMatches: matches,
  });
}
