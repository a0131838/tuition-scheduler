import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  allocateLeadNo,
  LEAD_FOLLOW_UP_CHANNELS,
  LEAD_INTENT_LEVELS,
  LEAD_SOURCE_PLATFORMS,
  LEAD_SOURCE_TYPES,
  normalizeLeadFlexibleOption,
  normalizeLeadOption,
  normalizeLeadText,
  parseLeadDateTime,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

function read(formData: FormData, key: string, max = 500) {
  return normalizeLeadText(formData.get(key), max);
}

async function createLeadAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const studentName = read(formData, "studentName", 120);
  const sourceType = normalizeLeadOption(formData.get("sourceType"), LEAD_SOURCE_TYPES, "");
  const sourcePlatform = normalizeLeadFlexibleOption(formData.get("sourcePlatform"), LEAD_SOURCE_PLATFORMS, "");
  const intentLevel = normalizeLeadOption(formData.get("intentLevel"), LEAD_INTENT_LEVELS, "Warm");
  const ownerNameInput = read(formData, "ownerName", 120);
  const initialContent = read(formData, "initialContent", 2000);
  const forceDuplicate = read(formData, "forceDuplicate", 5) === "1";
  if (!studentName || !sourceType || !initialContent) {
    redirect("/admin/leads/new?err=required");
  }
  const owner = ownerNameInput
    ? await prisma.user.findFirst({ where: { name: ownerNameInput }, select: { id: true, name: true, role: true } })
    : null;
  const resolvedOwnerName = ownerNameInput || null;
  const parentWechat = read(formData, "parentWechat", 120);
  const parentPhone = read(formData, "parentPhone", 80);
  if (!forceDuplicate && (parentWechat || parentPhone)) {
    const duplicate = await prisma.lead.findFirst({
      where: {
        OR: [
          ...(parentWechat ? [{ parentWechat: { equals: parentWechat, mode: "insensitive" as const } }] : []),
          ...(parentPhone ? [{ parentPhone: { equals: parentPhone, mode: "insensitive" as const } }] : []),
        ],
      },
      select: { leadNo: true },
      orderBy: { createdAt: "desc" },
    });
    if (duplicate) redirect(`/admin/leads/new?err=duplicate&leadNo=${encodeURIComponent(duplicate.leadNo)}`);
  }

  const nextAction = read(formData, "nextAction", 500);
  const nextActionDue = parseLeadDateTime(formData.get("nextActionDue"));
  const created = await prisma.$transaction(async (tx) => {
    const leadNo = await allocateLeadNo(tx);
    const lead = await tx.lead.create({
      data: {
        leadNo,
        sourceType,
        sourcePlatform: sourcePlatform || null,
        sourceDetail: read(formData, "sourceDetail", 1000) || null,
        referralName: read(formData, "referralName", 120) || null,
        parentName: read(formData, "parentName", 120) || null,
        parentWechat: parentWechat || null,
        parentPhone: parentPhone || null,
        studentName,
        grade: read(formData, "grade", 40) || null,
        school: read(formData, "school", 160) || null,
        target: read(formData, "target", 1000) || null,
        needs: read(formData, "needs", 2000) || null,
        preferredCourse: read(formData, "preferredCourse", 160) || null,
        budgetRange: read(formData, "budgetRange", 120) || null,
        urgency: read(formData, "urgency", 120) || null,
        intentLevel,
        status: "New Lead",
        ownerUserId: owner?.id ?? null,
        ownerName: resolvedOwnerName,
        assignedSalesName: resolvedOwnerName,
        nextAction: nextAction || null,
        nextActionDue,
        latestSummary: initialContent,
        createdByUserId: user.id,
        createdByName: user.name,
      },
      select: { id: true },
    });
    await tx.leadFollowUp.create({
      data: {
        leadId: lead.id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        channel: normalizeLeadFlexibleOption(formData.get("channel"), LEAD_FOLLOW_UP_CHANNELS, "微信"),
        content: initialContent,
        nextAction: nextAction || null,
        nextActionDue,
        nextStatus: "New Lead",
        intentLevelAfter: intentLevel,
      },
    });
    return lead;
  });
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${created.id}?ok=created`);
}

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string; leadNo?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const err = String(sp?.err ?? "");
  const leadNo = String(sp?.leadNo ?? "");
  const owners = await prisma.leadResourceOwner.findMany({
    where: { isActive: true },
    select: { name: true, email: true },
    orderBy: { name: "asc" },
  });
  const fieldStyle = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    minHeight: 38,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 10px",
  } as const;
  const labelStyle = { display: "grid", gap: 5, minWidth: 0, fontWeight: 800, fontSize: 13 } as const;

  return (
    <main style={{ maxWidth: 980, display: "grid", gap: 14 }}>
      <p><Link href="/admin/leads">{t(lang, "Back to resources", "返回资源列表")}</Link></p>
      <section style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: "0 0 6px" }}>{t(lang, "New Resource", "新增资源")}</h2>
        <div style={{ color: "#475569" }}>{t(lang, "Create the first system record as soon as a parent asks about classes.", "家长一咨询就先落系统，后面销售、老师、教务都从这里接。")}</div>
      </section>
      {err === "required" ? <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", padding: 10, borderRadius: 8 }}>{t(lang, "Student, source, and first follow-up content are required.", "学生、来源和首次跟进内容必填。")}</div> : null}
      {err === "duplicate" ? (
        <div style={{ color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", padding: 10, borderRadius: 8 }}>
          {t(lang, `Possible duplicate resource: ${leadNo}. Tick force create if this is a new inquiry.`, `可能已有重复资源：${leadNo}。如确认是新咨询，请勾选强制创建。`)}
        </div>
      ) : null}
      <form action={createLeadAction} style={{ display: "grid", gap: 14 }}>
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{t(lang, "Source & Owner", "来源与负责人")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={labelStyle}>{t(lang, "Main source", "主来源")}*
              <select name="sourceType" required style={fieldStyle}>
                <option value="">{t(lang, "Select", "请选择")}</option>
                {LEAD_SOURCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label style={labelStyle}>{t(lang, "Platform / channel", "具体平台/渠道")}
              <input name="sourcePlatform" list="lead-platforms" placeholder="小红书 / TikTok / 渠道人..." style={fieldStyle} />
              <datalist id="lead-platforms">{LEAD_SOURCE_PLATFORMS.map((item) => <option key={item} value={item} />)}</datalist>
            </label>
            <label style={labelStyle}>{t(lang, "Owner", "负责人")}
              <select name="ownerName" style={fieldStyle}>
                <option value="">{t(lang, "Unassigned", "暂不分配")}</option>
                {owners.map((item) => <option key={item.name} value={item.name}>{item.name}{item.email ? ` (${item.email})` : ""}</option>)}
              </select>
              <Link href="/admin/leads/owners" style={{ fontSize: 12 }}>{t(lang, "Manage owner list", "维护负责人名单")}</Link>
            </label>
            <label style={labelStyle}>{t(lang, "Intent", "意向等级")}
              <select name="intentLevel" defaultValue="Warm" style={fieldStyle}>{LEAD_INTENT_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </label>
          </div>
          <label style={labelStyle}>{t(lang, "Source detail", "来源备注")}
            <textarea name="sourceDetail" rows={3} placeholder={t(lang, "Account name, video link, referrer, campaign, or channel note", "账号名、视频链接、介绍人、活动或渠道备注")} style={fieldStyle} />
          </label>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{t(lang, "Parent & Student", "家长与学生")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={labelStyle}>{t(lang, "Student name", "学生姓名")}*<input name="studentName" required style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Grade", "年级")}<input name="grade" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "School", "学校")}<input name="school" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Parent name", "家长姓名")}<input name="parentName" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Parent WeChat", "家长微信")}<input name="parentWechat" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Parent phone", "家长电话")}<input name="parentPhone" style={fieldStyle} /></label>
          </div>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{t(lang, "Needs & First Follow-up", "需求与首次跟进")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={labelStyle}>{t(lang, "Preferred course", "咨询课程")}<input name="preferredCourse" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Budget", "预算")}<input name="budgetRange" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Urgency", "紧急程度")}<input name="urgency" placeholder="This week / This month..." style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Channel", "沟通渠道")}
              <select name="channel" defaultValue="微信" style={fieldStyle}>{LEAD_FOLLOW_UP_CHANNELS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </label>
          </div>
          <label style={labelStyle}>{t(lang, "Target", "目标")}<textarea name="target" rows={2} style={fieldStyle} /></label>
          <label style={labelStyle}>{t(lang, "Needs", "当前需求/问题")}<textarea name="needs" rows={3} style={fieldStyle} /></label>
          <label style={labelStyle}>{t(lang, "First follow-up content", "首次跟进内容")}*<textarea name="initialContent" required rows={4} style={fieldStyle} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={labelStyle}>{t(lang, "Next action", "下一步动作")}<input name="nextAction" style={fieldStyle} /></label>
            <label style={labelStyle}>{t(lang, "Next action due", "下一步截止时间")}<input name="nextActionDue" type="datetime-local" style={fieldStyle} /></label>
          </div>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 800 }}>
            <input type="checkbox" name="forceDuplicate" value="1" />
            {t(lang, "Force create if duplicate contact exists", "如有重复联系方式仍强制创建")}
          </label>
        </section>

        <button type="submit" style={{ minHeight: 42, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontWeight: 900 }}>
          {t(lang, "Create Resource", "创建资源")}
        </button>
      </form>
    </main>
  );
}
