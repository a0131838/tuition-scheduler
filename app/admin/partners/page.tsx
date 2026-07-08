import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PARTNER_LESSON_MINUTES,
  DEFAULT_PARTNER_OFFLINE_RATE_PER_45,
  DEFAULT_PARTNER_ONLINE_RATE_PER_45,
  DEFAULT_PARTNER_PACKAGE_MINUTES,
  DEFAULT_PARTNER_TOP_UP_MINUTES,
} from "@/lib/partners";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readNonNegativeInt(formData: FormData, key: string, fallback: number) {
  const raw = readString(formData, key);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${key} must be a non-negative number`);
  return Math.round(n);
}

function readPositiveInt(formData: FormData, key: string, fallback: number) {
  const raw = readString(formData, key);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${key} must be greater than 0`);
  return Math.round(n);
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function resolveSourceChannel(input: { currentSourceChannelId?: string | null; sourceChannelName: string }) {
  const sourceChannelName = input.sourceChannelName.trim();
  if (!sourceChannelName) throw new Error("Source channel name is required");

  const existing = await prisma.studentSourceChannel.findUnique({
    where: { name: sourceChannelName },
    select: { id: true },
  });
  if (existing) return existing.id;

  const currentId = String(input.currentSourceChannelId ?? "").trim();
  if (currentId) {
    const updated = await prisma.studentSourceChannel.update({
      where: { id: currentId },
      data: { name: sourceChannelName, isActive: true },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.studentSourceChannel.create({
    data: { name: sourceChannelName, isActive: true },
    select: { id: true },
  });
  return created.id;
}

async function createPartnerAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") redirect("/admin/partners?err=forbidden");

  try {
    const name = readString(formData, "name");
    const sourceChannelName = readString(formData, "sourceChannelName");
    const billTo = readString(formData, "billTo") || name;
    if (!name) throw new Error("Partner name is required");
    if (!sourceChannelName) throw new Error("Source channel name is required");

    const sourceChannelId = await resolveSourceChannel({ sourceChannelName });
    await prisma.partner.create({
      data: {
        name,
        sourceChannelId,
        billTo,
        invoiceDisplayName: readString(formData, "invoiceDisplayName") || name,
        onlineRatePer45: readNonNegativeInt(formData, "onlineRatePer45", DEFAULT_PARTNER_ONLINE_RATE_PER_45),
        offlineRatePer45: readNonNegativeInt(formData, "offlineRatePer45", DEFAULT_PARTNER_OFFLINE_RATE_PER_45),
        lessonMinutes: readPositiveInt(formData, "lessonMinutes", DEFAULT_PARTNER_LESSON_MINUTES),
        defaultPackageMinutes: readPositiveInt(formData, "defaultPackageMinutes", DEFAULT_PARTNER_PACKAGE_MINUTES),
        defaultTopUpMinutes: readPositiveInt(formData, "defaultTopUpMinutes", DEFAULT_PARTNER_TOP_UP_MINUTES),
        supportsOnlineSettlement: boolValue(formData, "supportsOnlineSettlement"),
        supportsOfflineMonthly: boolValue(formData, "supportsOfflineMonthly"),
        intakeEnabled: boolValue(formData, "intakeEnabled"),
        isActive: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create partner failed";
    redirect(`/admin/partners?err=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/partners");
  redirect("/admin/partners?msg=created");
}

async function updatePartnerAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") redirect("/admin/partners?err=forbidden");

  const id = readString(formData, "id");
  if (!id) redirect("/admin/partners?err=missing-id");

  try {
    const current = await prisma.partner.findUnique({
      where: { id },
      select: { sourceChannelId: true },
    });
    if (!current) throw new Error("Partner not found");

    const name = readString(formData, "name");
    const sourceChannelName = readString(formData, "sourceChannelName");
    const billTo = readString(formData, "billTo") || name;
    if (!name) throw new Error("Partner name is required");
    if (!sourceChannelName) throw new Error("Source channel name is required");

    const sourceChannelId = await resolveSourceChannel({
      currentSourceChannelId: current.sourceChannelId,
      sourceChannelName,
    });

    await prisma.partner.update({
      where: { id },
      data: {
        name,
        sourceChannelId,
        billTo,
        invoiceDisplayName: readString(formData, "invoiceDisplayName") || name,
        onlineRatePer45: readNonNegativeInt(formData, "onlineRatePer45", DEFAULT_PARTNER_ONLINE_RATE_PER_45),
        offlineRatePer45: readNonNegativeInt(formData, "offlineRatePer45", DEFAULT_PARTNER_OFFLINE_RATE_PER_45),
        lessonMinutes: readPositiveInt(formData, "lessonMinutes", DEFAULT_PARTNER_LESSON_MINUTES),
        defaultPackageMinutes: readPositiveInt(formData, "defaultPackageMinutes", DEFAULT_PARTNER_PACKAGE_MINUTES),
        defaultTopUpMinutes: readPositiveInt(formData, "defaultTopUpMinutes", DEFAULT_PARTNER_TOP_UP_MINUTES),
        supportsOnlineSettlement: boolValue(formData, "supportsOnlineSettlement"),
        supportsOfflineMonthly: boolValue(formData, "supportsOfflineMonthly"),
        intakeEnabled: boolValue(formData, "intakeEnabled"),
        isActive: boolValue(formData, "isActive"),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update partner failed";
    redirect(`/admin/partners?err=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/partners");
  redirect("/admin/partners?msg=updated");
}

async function togglePartnerAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") redirect("/admin/partners?err=forbidden");
  const id = readString(formData, "id");
  const isActive = boolValue(formData, "isActive");
  if (!id) redirect("/admin/partners?err=missing-id");
  await prisma.partner.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/partners");
  redirect("/admin/partners?msg=updated");
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const user = await requireAdmin();
  if (user.role === "FINANCE") redirect("/admin/reports/partner-settlement");
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";

  const partners = await prisma.partner.findMany({
    include: {
      sourceChannel: { select: { id: true, name: true } },
      _count: { select: { settlements: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const sourceStudentCounts = await prisma.student.groupBy({
    by: ["sourceChannelId"],
    where: { sourceChannelId: { in: partners.map((p) => p.sourceChannelId) } },
    _count: { _all: true },
  });
  const studentCountBySource = new Map(sourceStudentCounts.map((row) => [row.sourceChannelId, row._count._all]));

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    background: "#fff",
  } as const;
  const inputStyle = { width: "100%", minHeight: 34 } as const;
  const thStyle = { background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 } as const;
  const primaryBtn = {
    border: "1px solid #93c5fd",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 8,
    padding: "6px 10px",
    fontWeight: 700,
  } as const;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>
            Partner Setup / 合作方配置
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Partners", "合作方")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(
              lang,
              "Maintain partner settlement rules, invoice billing names, rates, and linked student sources here.",
              "在这里维护合作方结算规则、发票抬头、结算单价和绑定的学生来源。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Partners", "合作方")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{partners.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Active", "启用")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{partners.filter((p) => p.isActive).length}</div>
          </div>
        </div>
      </section>

      {msg ? <div style={{ color: "#166534", fontWeight: 700 }}>{msg}</div> : null}
      {err ? <div style={{ color: "#b91c1c", fontWeight: 700 }}>{decodeURIComponent(err)}</div> : null}

      <section id="new-partner" style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Add partner", "新增合作方")}</h3>
        <form action={createPartnerAction} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            <label>{t(lang, "Partner name", "合作方名称")}<input name="name" required placeholder="上海新卓思" style={inputStyle} /></label>
            <label>{t(lang, "Student source", "学生来源")}<input name="sourceChannelName" required placeholder="上海新卓思学生" style={inputStyle} /></label>
            <label>{t(lang, "Bill To", "发票抬头")}<input name="billTo" required placeholder="公司正式发票抬头" style={inputStyle} /></label>
            <label>{t(lang, "Display name", "显示名称")}<input name="invoiceDisplayName" placeholder="可选" style={inputStyle} /></label>
            <label>{t(lang, "Online rate / 45min", "线上每45分钟单价")}<input name="onlineRatePer45" type="number" min={0} defaultValue={DEFAULT_PARTNER_ONLINE_RATE_PER_45} style={inputStyle} /></label>
            <label>{t(lang, "Offline rate / 45min", "线下每45分钟单价")}<input name="offlineRatePer45" type="number" min={0} defaultValue={DEFAULT_PARTNER_OFFLINE_RATE_PER_45} style={inputStyle} /></label>
            <label>{t(lang, "Lesson minutes", "每课时分钟数")}<input name="lessonMinutes" type="number" min={1} defaultValue={DEFAULT_PARTNER_LESSON_MINUTES} style={inputStyle} /></label>
            <label>{t(lang, "Default package minutes", "默认开课包分钟")}<input name="defaultPackageMinutes" type="number" min={1} defaultValue={DEFAULT_PARTNER_PACKAGE_MINUTES} style={inputStyle} /></label>
            <label>{t(lang, "Default top-up minutes", "默认充值分钟")}<input name="defaultTopUpMinutes" type="number" min={1} defaultValue={DEFAULT_PARTNER_TOP_UP_MINUTES} style={inputStyle} /></label>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <label><input type="checkbox" name="supportsOnlineSettlement" defaultChecked /> {t(lang, "Online package-end settlement", "线上课包结束结算")}</label>
            <label><input type="checkbox" name="supportsOfflineMonthly" defaultChecked /> {t(lang, "Offline monthly settlement", "线下按月结算")}</label>
            <label><input type="checkbox" name="intakeEnabled" defaultChecked /> {t(lang, "Partner intake enabled", "启用合作方录入")}</label>
          </div>
          <div><button type="submit" style={primaryBtn}>{t(lang, "Create", "创建")}</button></div>
        </form>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Existing partners", "现有合作方")}</h3>
        <div style={{ overflowX: "auto" }}>
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 1280 }}>
            <thead>
              <tr>
                <th align="left" style={thStyle}>{t(lang, "Partner", "合作方")}</th>
                <th align="left" style={thStyle}>{t(lang, "Student source", "学生来源")}</th>
                <th align="left" style={thStyle}>{t(lang, "Bill To", "发票抬头")}</th>
                <th align="left" style={thStyle}>{t(lang, "Rates", "单价")}</th>
                <th align="left" style={thStyle}>{t(lang, "Defaults", "默认值")}</th>
                <th align="left" style={thStyle}>{t(lang, "Rules", "规则")}</th>
                <th align="left" style={thStyle}>{t(lang, "Usage", "使用情况")}</th>
                <th align="left" style={thStyle}>{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} style={{ borderTop: "1px solid #e5e7eb", verticalAlign: "top" }}>
                  <td>
                    <form id={`partner-${partner.id}`} action={updatePartnerAction} style={{ display: "grid", gap: 8 }}>
                      <input type="hidden" name="id" value={partner.id} />
                      <input name="name" defaultValue={partner.name} required style={inputStyle} />
                      <label style={{ fontSize: 13 }}>
                        <input type="checkbox" name="isActive" defaultChecked={partner.isActive} /> {t(lang, "Active", "启用")}
                      </label>
                    </form>
                  </td>
                  <td>
                    <input form={`partner-${partner.id}`} name="sourceChannelName" defaultValue={partner.sourceChannel.name} required style={inputStyle} />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {t(lang, "Students", "学生")}: {studentCountBySource.get(partner.sourceChannelId) ?? 0}
                    </div>
                  </td>
                  <td>
                    <input form={`partner-${partner.id}`} name="billTo" defaultValue={partner.billTo} required style={inputStyle} />
                    <input form={`partner-${partner.id}`} name="invoiceDisplayName" defaultValue={partner.invoiceDisplayName ?? ""} placeholder={t(lang, "Display name", "显示名称")} style={{ ...inputStyle, marginTop: 6 }} />
                  </td>
                  <td>
                    <label style={{ display: "grid", gap: 2, fontSize: 12 }}>
                      {t(lang, "Online", "线上")}
                      <input form={`partner-${partner.id}`} name="onlineRatePer45" type="number" min={0} defaultValue={partner.onlineRatePer45} style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 12, marginTop: 6 }}>
                      {t(lang, "Offline", "线下")}
                      <input form={`partner-${partner.id}`} name="offlineRatePer45" type="number" min={0} defaultValue={partner.offlineRatePer45} style={inputStyle} />
                    </label>
                  </td>
                  <td>
                    <label style={{ display: "grid", gap: 2, fontSize: 12 }}>
                      {t(lang, "Lesson min", "课时分钟")}
                      <input form={`partner-${partner.id}`} name="lessonMinutes" type="number" min={1} defaultValue={partner.lessonMinutes} style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 12, marginTop: 6 }}>
                      {t(lang, "Package min", "课包分钟")}
                      <input form={`partner-${partner.id}`} name="defaultPackageMinutes" type="number" min={1} defaultValue={partner.defaultPackageMinutes} style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 12, marginTop: 6 }}>
                      {t(lang, "Top-up min", "充值分钟")}
                      <input form={`partner-${partner.id}`} name="defaultTopUpMinutes" type="number" min={1} defaultValue={partner.defaultTopUpMinutes} style={inputStyle} />
                    </label>
                  </td>
                  <td style={{ minWidth: 190 }}>
                    <label style={{ display: "block" }}><input form={`partner-${partner.id}`} type="checkbox" name="supportsOnlineSettlement" defaultChecked={partner.supportsOnlineSettlement} /> {t(lang, "Online", "线上")}</label>
                    <label style={{ display: "block", marginTop: 6 }}><input form={`partner-${partner.id}`} type="checkbox" name="supportsOfflineMonthly" defaultChecked={partner.supportsOfflineMonthly} /> {t(lang, "Offline monthly", "线下按月")}</label>
                    <label style={{ display: "block", marginTop: 6 }}><input form={`partner-${partner.id}`} type="checkbox" name="intakeEnabled" defaultChecked={partner.intakeEnabled} /> {t(lang, "Intake", "录入")}</label>
                  </td>
                  <td>
                    <div>{t(lang, "Settlements", "结算")}: {partner._count.settlements}</div>
                    <div style={{ marginTop: 6 }}>
                      <a href={`/admin/reports/partner-settlement?partnerId=${encodeURIComponent(partner.id)}`}>{t(lang, "Open settlement", "打开结算")}</a>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <a href={`/admin/students?sourceChannelId=${encodeURIComponent(partner.sourceChannelId)}`}>{t(lang, "Filter students", "筛选学生")}</a>
                    </div>
                  </td>
                  <td>
                    <button form={`partner-${partner.id}`} type="submit" style={primaryBtn}>{t(lang, "Save", "保存")}</button>
                    <form action={togglePartnerAction} style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={partner.id} />
                      <input type="hidden" name="isActive" value={partner.isActive ? "" : "on"} />
                      <button type="submit" style={primaryBtn}>
                        {partner.isActive ? t(lang, "Disable", "停用") : t(lang, "Enable", "启用")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
