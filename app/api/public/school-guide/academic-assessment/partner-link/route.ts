import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("code") || "";
  if (!/^[a-f0-9]{32}$/.test(slug)) return NextResponse.json({ ok: false, message: "测评入口无效" }, { status: 404 });
  const link = await prisma.schoolGuideAssessmentPartnerLink.findUnique({ where: { slug }, select: { name: true, isActive: true } });
  if (!link?.isActive) return NextResponse.json({ ok: false, message: "测评入口已停用" }, { status: 404 });
  return NextResponse.json({ ok: true, name: link.name }, { headers: { "Cache-Control": "no-store" } });
}
