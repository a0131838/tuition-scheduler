import { redirect } from "next/navigation";
import { getLang, t, type Lang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  buildSchoolApplicationParentInfoPath,
  buildSchoolApplicationSignPath,
  createSchoolApplicationDraft,
  deleteSchoolApplicationParentInfoLink,
  deleteVoidedSchoolApplication,
  listSchoolApplicationsForStudent,
  prepareSchoolApplicationParentInfoLink,
  prepareSchoolApplicationSignLink,
  saveSchoolApplicationDraft,
  voidSchoolApplication,
  type SchoolApplicationItem,
} from "@/lib/school-application";
import { formatDateOnly } from "@/lib/date-only";
import {
  SCHOOL_APPLICATION_EQUIVALENT_LEVELS,
  SCHOOL_APPLICATION_GRADES,
  SCHOOL_APPLICATION_INTAKES,
  SCHOOL_APPLICATION_PROGRAMMES,
  SCHOOL_APPLICATION_TARGETS,
} from "@/lib/school-application-directory";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";
import SchoolApplicationDraftGuard from "./SchoolApplicationDraftGuard";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
}

function inputStyle() {
  return { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 10, width: "100%" };
}

function cardStyle(bg = "#fff") {
  return { border: "1px solid #dbeafe", borderRadius: 14, background: bg, padding: 14, display: "grid", gap: 12 };
}

function money(value: number) {
  return `SGD ${Number(value || 0).toFixed(2)}`;
}

function parentNameDefault(app: { status: string; studentName: string; parentInfo: { parentName: string; phone?: string | null; email?: string | null; address?: string | null; parentIdNo?: string | null } | null }) {
  const info = app.parentInfo;
  if (!info) return "";
  const looksLikeOldStudentDefault =
    app.status === "DRAFT" &&
    info.parentName.trim() === app.studentName.trim() &&
    !info.phone &&
    !info.email &&
    !info.address &&
    !info.parentIdNo;
  return looksLikeOldStudentDefault ? "" : info.parentName;
}

function parentInfoStatus(lang: Lang, app: { parentInfoSubmittedAt: Date | null; parentInfoViewedAt: Date | null; parentInfoToken: string | null }) {
  if (app.parentInfoSubmittedAt) return t(lang,"Submitted","已提交") + ' ' + app.parentInfoSubmittedAt.toLocaleString("en-SG");
  const history = app.parentInfoViewedAt ? t(lang,"First opened (history)","历史首次打开") + ' ' + app.parentInfoViewedAt.toLocaleString("en-SG") + ' · ' : '';
  return history + (app.parentInfoToken ? t(lang,"Link available; awaiting information","链接可用，等待资料") : t(lang,"No active information link","当前无有效资料链接"));
}

function canExportAgreementPdf(app: { parentInfo: unknown; items: unknown[] }) {
  return Boolean(app.parentInfo) && app.items.length >= 1;
}

function requiredStar() {
  return <span style={{ color: "#dc2626" }}>*</span>;
}

function sourceQuery(formData: FormData) {
  return String(formData.get("from") ?? "").trim() === "school-applications" ? "&from=school-applications" : "";
}

function parseItems(formData: FormData): SchoolApplicationItem[] {
  const items: SchoolApplicationItem[] = [];
  for (let i = 0; i < 5; i += 1) {
    const targetId = String(formData.get(`targetId_${i}`) ?? "").trim();
    if (!targetId) continue;
    items.push({
      targetId,
      schoolName: "",
      programme: String(formData.get(`programme_${i}`) ?? "").trim() || null,
      grade: String(formData.get(`grade_${i}`) ?? "").trim() || null,
      equivalentLevel: String(formData.get(`equivalentLevel_${i}`) ?? "").trim() || null,
      intake: String(formData.get(`intake_${i}`) ?? "").trim() || null,
      serviceFee: Number(formData.get(`serviceFee_${i}`) ?? 0),
      officialFee: Number(formData.get(`officialFee_${i}`) ?? 0),
      officialFeeMode: String(formData.get(`officialFeeMode_${i}`) ?? "").trim() || null,
      notes: String(formData.get(`notes_${i}`) ?? "").trim() || null,
    });
  }
  return items;
}

async function createDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const source = sourceQuery(formData);
  if (!studentId) redirect("/admin/students?err=Missing+student");
  let draft;
  try {
    draft = await createSchoolApplicationDraft({
      studentId,
      createdByUserId: admin.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create school application draft failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("School application draft created")}&open=${encodeURIComponent(draft.id)}${source}`);
}

async function saveDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  const source = sourceQuery(formData);
  try {
    await saveSchoolApplicationDraft({
      id,
      parentInfo: {
        parentName: String(formData.get("parentName") ?? "").trim(),
        parentIdNo: String(formData.get("parentIdNo") ?? "").trim() || null,
        phone: String(formData.get("parentPhone") ?? "").trim() || null,
        email: String(formData.get("parentEmail") ?? "").trim() || null,
        address: String(formData.get("parentAddress") ?? "").trim() || null,
      },
      items: parseItems(formData),
      serviceHours: null,
      addOnFeeAmount: Number(formData.get("addOnFeeAmount") ?? 0) || 0,
      billTo: String(formData.get("billTo") ?? "").trim(),
      agreementDate: String(formData.get("agreementDate") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim() || null,
      actorUserId: admin.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save school application failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("School application draft saved")}&open=${encodeURIComponent(id)}${source}`);
}

async function prepareParentInfoAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  const source = sourceQuery(formData);
  try {
    await prepareSchoolApplicationParentInfoLink({ id, actorUserId: admin.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Prepare parent info link failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("Parent info link ready")}&open=${encodeURIComponent(id)}${source}`);
}

async function deleteParentInfoAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  const source = sourceQuery(formData);
  try {
    await deleteSchoolApplicationParentInfoLink({ id, actorUserId: admin.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete parent info link failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("Parent info link deleted")}&open=${encodeURIComponent(id)}${source}`);
}

async function prepareSignAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  const source = sourceQuery(formData);
  try {
    await prepareSchoolApplicationSignLink({ id, actorUserId: admin.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Prepare sign link failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("Sign link ready")}&open=${encodeURIComponent(id)}${source}`);
}

async function voidAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  const source = sourceQuery(formData);
  try {
    await voidSchoolApplication({
      id,
      reason: String(formData.get("reason") ?? "").trim() || null,
      actorUserId: admin.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Void school application failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("School application voided")}${source}`);
}

async function deleteVoidedAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  const source = sourceQuery(formData);
  try {
    await deleteVoidedSchoolApplication({ id, actorUserId: admin.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete school application failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}${source}`);
  }
  redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("Voided school application deleted")}${source}`);
}

export default async function SchoolApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string; open?: string; from?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const { id: studentId } = await params;
  const sp = await searchParams;
  const [student, applications] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    }),
    listSchoolApplicationsForStudent(studentId),
  ]);
  if (!student) redirect("/admin/students?err=Student+not+found");
  const openId = sp?.open ?? applications[0]?.id ?? "";
  const baseUrl = appBaseUrl();
  const returnToList = sp?.from === "school-applications";

  return (
    <main style={{ padding: 24, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: 16 }}>
      <div style={cardStyle("#f8fbff")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800 }}>{t(lang,"School Applications","学校申请服务")}</div>
            <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>{student.name}</h1>
            <div style={{ color: "#475569", fontSize: 13 }}>{t(lang,"Create school application service agreements without changing package hours.","创建学校申请服务协议，不改变课程课时。")}</div>
          </div>
          <a
            href={returnToList ? "/admin/school-applications" : `/admin/students/${encodeURIComponent(student.id)}`}
            style={{ textDecoration: "none", color: "#2563eb", fontWeight: 800 }}
          >
            {returnToList ? t(lang,"Back to school applications","返回学校申请列表") : t(lang,"Back to student","返回学生")}
          </a>
        </div>
        {sp?.msg ? <div style={{ color: "#166534", fontWeight: 700 }}>{decodeURIComponent(sp.msg)}</div> : null}
        {sp?.err ? <div style={{ color: "#b91c1c", fontWeight: 700 }}>{decodeURIComponent(sp.err)}</div> : null}
      </div>

      <div style={cardStyle()}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{t(lang,"Create new service","新建申请服务")}</h2>
        <form action={createDraftAction} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <input type="hidden" name="studentId" value={student.id} />
          {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
          <div style={{ minWidth: 0, flex: "1 1 360px", display: "grid", gap: 4, padding: "8px 0" }}>
            <strong>{t(lang,"Billing case","收款记录")}</strong>
            <span style={{ color: "#475569", fontSize: 13 }}>{t(lang,"The system will use a separate School Application Service billing case for both new and existing students.","新生和老生均使用独立的学校申请服务收款记录。")}</span>
          </div>
          <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 800 }}>{t(lang,"Create draft","创建草稿")}</button>
        </form>
        <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>{t(lang,"This service billing case is only for invoice, payment proof, receipt creation, and finance approval. It does not add or deduct lesson hours.","此收款记录仅用于发票、付款凭证、收据及财务审批，不增减课程课时。")}</div>
      </div>

      {applications.length === 0 ? (
        <div style={cardStyle("#fff7ed")}>{t(lang,"No school application service records yet.","暂无学校申请服务记录。")}</div>
      ) : (
        applications.map((app) => {
          const editable = app.status === "DRAFT" || app.status === "READY_TO_SIGN";
          const signHref = app.signToken ? `${baseUrl}${buildSchoolApplicationSignPath(app.signToken)}` : "";
          const parentInfoHref = app.parentInfoToken ? `${baseUrl}${buildSchoolApplicationParentInfoPath(app.parentInfoToken)}` : "";
          const agreementPdfReady = canExportAgreementPdf(app);
          return (
            <section key={app.id} style={cardStyle(app.id === openId ? "#f8fbff" : "#fff")}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    {t(lang, app.status === "DRAFT" ? "Draft" : app.status === "READY_TO_SIGN" ? "Ready to sign" : app.status === "SIGNED" ? "Signed" : app.status === "INVOICE_CREATED" ? "Invoiced" : app.status === "VOID" ? "Voided" : app.status, app.status === "DRAFT" ? "草稿" : app.status === "READY_TO_SIGN" ? "待签署" : app.status === "SIGNED" ? "已签署" : app.status === "INVOICE_CREATED" ? "已开票" : app.status === "VOID" ? "已作废" : app.status)} · {app.items.length || 0}{" "}{t(lang,"school(s)","所学校")} · {money(app.totalAmount)}
                  </h2>
                  <div style={{ color: "#475569", fontSize: 13 }}>{t(lang,"Created","创建时间")}{" "}{app.createdAt.toLocaleString("en-SG")} · {t(lang,"Invoice","发票")}{" "}{app.invoiceNo ?? "-"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {agreementPdfReady ? (
                    <a href={`/api/exports/school-application/${encodeURIComponent(app.id)}`} target="_blank" rel="noreferrer">{t(lang,"Agreement PDF","合同PDF")}</a>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>{t(lang,"Agreement PDF available after parent info and at least 1 school","填好家长资料和至少1所学校后可导出合同PDF")}</span>
                  )}
                  {app.signedAt ? <a href={`/api/exports/school-application/${encodeURIComponent(app.id)}?seal=1`} target="_blank" rel="noreferrer">{t(lang,"Sealed Agreement PDF","盖章合同PDF")}</a> : null}
                  {app.invoiceId ? <a href={`/api/exports/parent-invoice/${encodeURIComponent(app.invoiceId)}`} target="_blank" rel="noreferrer">{t(lang,"Invoice PDF","发票 PDF")}</a> : null}
                  {app.packageId ? <a href={`/admin/packages/${encodeURIComponent(app.packageId)}/billing`}>{t(lang,"Billing","账务")}</a> : null}
                </div>
              </div>

              <div style={{ ...cardStyle(app.parentInfoSubmittedAt ? "#f0fdf4" : "#fff7ed"), gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <strong>{t(lang,"Parent info link","家长资料链接")}</strong>
                    <div style={{ color: "#475569", fontSize: 12 }}>
                      {parentInfoStatus(lang,app)}{t(lang,"· Use this before the formal signing link when parent details need confirmation.","· 家长资料需确认时，请先使用此链接，再准备正式签署链接。")}</div>
                  </div>
                  {editable ? (
                    <form action={prepareParentInfoAction}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="applicationId" value={app.id} />
                      {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #f59e0b", background: "#fffbeb", color: "#92400e", fontWeight: 800 }}>{t(lang,"Generate parent info link","生成家长资料链接")}</button>
                      <div style={{ color: "#475569", fontSize: 12 }}>
                        {t(lang, "Requesting or updating parent information pauses signing. Review the details and generate the sign link again.", "申请或更新家长资料后将暂停签署，请核对资料后重新生成签字链接。")}
                      </div>
                    </form>
                  ) : null}
                </div>
                {parentInfoHref ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <a href={parentInfoHref} target="_blank" rel="noreferrer">{t(lang,"Open parent info link","打开家长资料链接")}</a>
                    <CopyTextButton text={parentInfoHref} label={t(lang,"Copy parent info link","复制家长资料链接")} copiedLabel={t(lang,"Copied","已复制")} style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }} />
                    <form action={deleteParentInfoAction}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="applicationId" value={app.id} />
                      {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
                      <button type="submit" style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid #dc2626", background: "#fff1f2", color: "#b91c1c", fontWeight: 800 }}>{t(lang,"Delete link","删除链接")}</button>
                    </form>
                  </div>
                ) : null}
              </div>

              <form action={saveDraftAction} style={{ display: "grid", gap: 12 }}>
                <SchoolApplicationDraftGuard lang={lang} />
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="applicationId" value={app.id} />
                {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
                {editable ? (
                  <div style={{ border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412", borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 1.5 }}>{t(lang,"Required: parent name, agreement date, first school/application and a total greater than 0.","必填：家长姓名、合同日期、第一所学校／申请项目，以及大于0的总金额。")}</div>
                ) : null}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div style={{ display: "grid", gap: 4, padding: "8px 0" }}>
                    <strong>{t(lang,"Billing case","收款记录")}</strong>
                    <span style={{ color: "#475569", fontSize: 13 }}>{t(lang,"School Application Service case. Use Billing to upload payment proof and create receipts.","学校申请服务收款记录。请进入账务上传付款凭证及创建收据。")}</span>
                  </div>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Parent name","家长姓名")}{requiredStar()}</span>
                    <input name="parentName" defaultValue={parentNameDefault(app)} placeholder={t(lang,"Fill parent name","填写家长姓名")} style={inputStyle()} disabled={!editable} required={editable} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Parent phone","家长电话")}</span>
                    <input name="parentPhone" defaultValue={app.parentInfo?.phone ?? ""} style={inputStyle()} disabled={!editable} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Parent email","家长邮箱")}</span>
                    <input name="parentEmail" defaultValue={app.parentInfo?.email ?? ""} style={inputStyle()} disabled={!editable} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Parent ID","证件号")}</span>
                    <input name="parentIdNo" defaultValue={app.parentInfo?.parentIdNo ?? ""} style={inputStyle()} disabled={!editable} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Bill to","开票对象")}</span>
                    <input name="billTo" defaultValue={app.billTo} style={inputStyle()} disabled={!editable} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Agreement date","合同日期")}{requiredStar()}</span>
                    <input name="agreementDate" type="date" defaultValue={formatDateOnly(app.agreementDate)} style={inputStyle()} disabled={!editable} required={editable} />
                  </label>
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>{t(lang,"Parent address","地址")}</span>
                  <input name="parentAddress" defaultValue={app.parentInfo?.address ?? ""} style={inputStyle()} disabled={!editable} />
                </label>

                <div style={{ overflowX: "auto" }}>
                  <div style={{ marginBottom: 6, color: "#475569", fontSize: 12 }}>{t(lang,"Fee total","费用合计")}{requiredStar()}{t(lang,": service fee, official fee, and add-on fee combined must be greater than 0.","服务费、官方费、增值服务费合计必须大于 0。")}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#eff6ff" }}>
                        {["School / application", "Programme", "School grade", "Equivalent level", "Intake", "Service fee", "Official fee", "Official fee mode", "Notes"].map((x) => (
                          <th key={x} style={{ border: "1px solid #dbeafe", padding: 6, textAlign: "left" }}>
                            {t(lang,x,({"School / application":"学校／申请项目","Programme":"课程","School grade":"申请年级","Equivalent level":"对应级别","Intake":"入学时间","Service fee":"服务费","Official fee":"官方费用","Official fee mode":"官方费用方式","Notes":"备注"} as Record<string,string>)[x])}
                            {x === "School / application" ? <> {requiredStar()}</> : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const item = app.items[i];
                        return (
                          <tr key={i}>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}>
                              <select name={`targetId_${i}`} defaultValue={item?.targetId ?? ""} style={{ ...inputStyle(), minWidth: 260 }} disabled={!editable} required={i === 0 && editable}>
                                <option value="">{t(lang,"Select","请选择")}</option>
                                <optgroup label="MOE / AEIS">
                                  {SCHOOL_APPLICATION_TARGETS.filter((target) => target.kind === "MOE_EXERCISE").map((target) => (
                                    <option key={target.id} value={target.id}>{target.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label={t(lang,"International schools","国际学校")}>
                                  {SCHOOL_APPLICATION_TARGETS.filter((target) => target.kind === "INTERNATIONAL_SCHOOL").map((target) => (
                                    <option key={target.id} value={target.id}>{target.name}</option>
                                  ))}
                                </optgroup>
                              </select>
                              {item?.schoolName ? <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.schoolName}</div> : null}
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}>
                              <select name={`programme_${i}`} defaultValue={item?.programme ?? ""} style={{ ...inputStyle(), minWidth: 150 }} disabled={!editable}>
                                <option value="">{t(lang,"Select","请选择")}</option>
                                {SCHOOL_APPLICATION_PROGRAMMES.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}>
                              <select name={`grade_${i}`} defaultValue={item?.grade ?? ""} style={{ ...inputStyle(), minWidth: 140 }} disabled={!editable}>
                                <option value="">{t(lang,"Select","请选择")}</option>
                                {SCHOOL_APPLICATION_GRADES.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}>
                              <select name={`equivalentLevel_${i}`} defaultValue={item?.equivalentLevel ?? ""} style={{ ...inputStyle(), minWidth: 170 }} disabled={!editable}>
                                <option value="">{t(lang,"Auto/default","自动／默认")}</option>
                                {SCHOOL_APPLICATION_EQUIVALENT_LEVELS.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}>
                              <select name={`intake_${i}`} defaultValue={item?.intake ?? ""} style={{ ...inputStyle(), minWidth: 140 }} disabled={!editable}>
                                <option value="">{t(lang,"Select","请选择")}</option>
                                {SCHOOL_APPLICATION_INTAKES.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`serviceFee_${i}`} type="number" step="0.01" min="0" defaultValue={item?.serviceFee ?? ""} style={inputStyle()} disabled={!editable} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`officialFee_${i}`} type="number" step="0.01" min="0" defaultValue={item?.officialFee ?? ""} style={inputStyle()} disabled={!editable} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}>
                              <select name={`officialFeeMode_${i}`} defaultValue={item?.officialFeeMode ?? ""} style={{ ...inputStyle(), minWidth: 180 }} disabled={!editable}>
                                <option value="">{t(lang,"Use directory default","使用目录默认值")}</option>
                                <option value="Parent pays school / official fee varies">{t(lang,"Parent pays school / official fee varies","家长向学校支付／官方费用以实际为准")}</option>
                                <option value="We collect and pay school">{t(lang,"We collect and pay school","我方代收代付学校")}</option>
                                <option value="Included in service fee">{t(lang,"Included in service fee","已包含在服务费内")}</option>
                                <option value="MOE application fee, non-refundable">{t(lang,"MOE application fee, non-refundable","教育部申请费，不可退还")}</option>
                              </select>
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`notes_${i}`} defaultValue={item?.notes ?? ""} style={inputStyle()} disabled={!editable} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{t(lang,"Add-on fee","增值服务费")}</span>
                    <input name="addOnFeeAmount" type="number" step="0.01" min="0" defaultValue={app.addOnFeeAmount || ""} style={inputStyle()} disabled={!editable} />
                  </label>
                  <div style={{ ...cardStyle("#f0fdf4"), gap: 4 }}>
                    <strong>{t(lang,"Total","总额")}</strong>
                    <span>{money(app.totalAmount)}</span>
                    <span style={{ color: "#475569", fontSize: 12 }}>{t(lang,"1-3 schools no refund; 4-5 schools all-fail refund 50%.","申请1–3所学校不退款；申请4–5所全部失败时退还50%。")}</span>
                  </div>
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>{t(lang,"Note","备注")}</span>
                  <textarea name="note" defaultValue={app.note ?? ""} style={{ ...inputStyle(), minHeight: 70 }} disabled={!editable} />
                </label>
                {editable ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 800 }}>{t(lang,"Save draft","保存草稿")}</button>
                    <span style={{ color: "#475569", fontSize: 12 }}>
                      {t(lang, "Saving changes pauses signing. Generate the sign link again after reviewing the updated agreement.", "保存修改后将暂停签署，请核对更新后的协议，再生成签字链接。")}
                    </span>
                  </div>
                ) : null}
              </form>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {editable ? (
                  <form action={prepareSignAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
                    <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 800 }}>{t(lang,"Generate sign link","生成签字链接")}</button>
                  </form>
                ) : null}
                {signHref ? (
                  <>
                    <a href={signHref} target="_blank" rel="noreferrer">{t(lang,"Open sign link","打开签署链接")}</a>
                    <CopyTextButton text={signHref} label={t(lang,"Copy sign link","复制签字链接")} copiedLabel={t(lang,"Copied","已复制")} style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }} />
                  </>
                ) : null}
                {app.status !== "VOID" ? (
                  <form action={voidAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
                    <input name="reason" placeholder={t(lang,"Void reason","作废原因")} style={{ ...inputStyle(), width: 220 }} required={app.status === "INVOICE_CREATED"} />
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #dc2626", background: "#fff1f2", color: "#b91c1c", fontWeight: 800 }}>{t(lang,"Void","作废")}</button>
                  </form>
                ) : null}
                {app.canDeleteVoided ? (
                  <form action={deleteVoidedAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    {returnToList ? <input type="hidden" name="from" value="school-applications" /> : null}
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #991b1b", background: "#991b1b", color: "#fff", fontWeight: 800 }}>
                      {t(lang, "Delete unused voided draft", "删除未使用的已作废草稿")}
                    </button>
                  </form>
                ) : null}
                {app.status === "VOID" && !app.canDeleteVoided ? (
                  <div style={{ color: "#92400e", fontSize: 12 }}>
                    {t(lang, "Application links, submissions, signatures and billing history are retained. This voided record cannot be deleted.", "申请链接、资料提交、签署和账务历史须保留，此作废记录不能删除。")}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
