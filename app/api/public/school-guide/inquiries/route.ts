import { NextRequest, NextResponse } from "next/server";
import { allocateLeadNo, normalizeLeadText } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

const inquiryHits = new Map<string, number[]>();
const DEFAULT_OWNER_EMAIL = "zhaohongwei0880@gmail.com";
const DEFAULT_OWNER_NAME = "zhao hongwei";

function allowRequest(ip: string) {
  const now = Date.now();
  const recent = (inquiryHits.get(ip) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 5) return false;
  recent.push(now);
  inquiryHits.set(ip, recent);
  return true;
}

function text(value: unknown, max: number) {
  return normalizeLeadText(value, max);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowRequest(ip)) {
    return NextResponse.json({ ok: false, message: "提交过于频繁，请稍后再试。" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "资料格式不正确。" }, { status: 400 });
  }
  if (text(body.website, 100)) return NextResponse.json({ ok: true });

  const parentName = text(body.parentName, 80);
  const studentName = text(body.studentName, 80);
  const parentWechat = text(body.parentWechat, 80);
  const parentPhone = "";
  const needs = text(body.needs, 1800);
  const assessmentSummary = text(body.assessmentSummary, 500);
  const consent = text(body.consent, 10);
  if (!parentName || !studentName || !needs || !parentWechat || consent !== "yes") {
    return NextResponse.json({ ok: false, message: "请填写家长、孩子、微信号和需求，并确认授权。" }, { status: 400 });
  }

  const content = [
    "[新加坡学校指南公开咨询]",
    assessmentSummary ? `测评摘要：${assessmentSummary}` : "",
    `家长需求：${needs}`,
  ].filter(Boolean).join("\n");

  const duplicate = await prisma.lead.findFirst({
    where: {
      isArchived: false,
      status: { notIn: ["Won", "Lost"] },
      OR: [
        ...(parentWechat ? [{ parentWechat: { equals: parentWechat, mode: "insensitive" as const } }] : []),
        ...(parentPhone ? [{ parentPhone: { equals: parentPhone, mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, leadNo: true },
  });

  if (duplicate) {
    await prisma.$transaction([
      prisma.leadFollowUp.create({
        data: {
          leadId: duplicate.id,
          actorName: "学校指南公开表单",
          actorRole: "PUBLIC",
          channel: "官网/小程序表单",
          content,
          nextAction: "联系家长并核对官方择校资格",
          nextStatus: "New Lead",
          intentLevelAfter: "Warm",
        },
      }),
      prisma.lead.update({
        where: { id: duplicate.id },
        data: {
          latestSummary: content,
          nextAction: "联系家长并核对官方择校资格",
        },
      }),
    ]);
    return NextResponse.json({ ok: true, duplicate: true, leadNo: duplicate.leadNo });
  }

  const created = await prisma.$transaction(async (tx) => {
    const leadNo = await allocateLeadNo(tx);
    const owner = await tx.user.findFirst({
      where: { email: { equals: DEFAULT_OWNER_EMAIL, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    const lead = await tx.lead.create({
      data: {
        leadNo,
        sourceType: "官网/表单",
        sourcePlatform: "新加坡学校指南",
        sourceDetail: "公开网页或微信小程序学校指南",
        parentName,
        parentWechat: parentWechat || null,
        parentPhone: parentPhone || null,
        studentName,
        target: "新加坡学校择校与申请",
        needs: [needs, assessmentSummary].filter(Boolean).join("\n"),
        intentLevel: "Warm",
        status: "New Lead",
        ownerUserId: owner?.id ?? null,
        ownerName: owner?.name || DEFAULT_OWNER_NAME,
        assignedSalesName: owner?.name || DEFAULT_OWNER_NAME,
        nextAction: "联系家长并核对官方择校资格",
        latestSummary: content,
        createdByName: "学校指南公开表单",
      },
      select: { id: true, leadNo: true },
    });
    await tx.leadFollowUp.create({
      data: {
        leadId: lead.id,
        actorName: "学校指南公开表单",
        actorRole: "PUBLIC",
        channel: "官网/小程序表单",
        content,
        nextAction: "联系家长并核对官方择校资格",
        nextStatus: "New Lead",
        intentLevelAfter: "Warm",
      },
    });
    return lead;
  });

  return NextResponse.json({ ok: true, duplicate: false, leadNo: created.leadNo });
}
