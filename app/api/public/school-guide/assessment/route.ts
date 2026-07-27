import { NextRequest, NextResponse } from "next/server";
import { assessSchoolGuidePath } from "@/lib/school-guide-assessment";

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
  return NextResponse.json({
    ok: true,
    result: assessSchoolGuidePath({
      birthDate: String(body.birthDate ?? ""),
      targetEntryYear,
      residency,
      preferredSystem,
    }),
  });
}
