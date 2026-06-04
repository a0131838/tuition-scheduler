import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  buildSchoolApplicationSignPath,
  createSchoolApplicationDraft,
  listSchoolApplicationsForStudent,
  prepareSchoolApplicationSignLink,
  saveSchoolApplicationDraft,
  voidSchoolApplication,
  type SchoolApplicationItem,
} from "@/lib/school-application";
import { formatDateOnly } from "@/lib/date-only";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";

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

function parseItems(formData: FormData): SchoolApplicationItem[] {
  const items: SchoolApplicationItem[] = [];
  for (let i = 0; i < 5; i += 1) {
    const schoolName = String(formData.get(`schoolName_${i}`) ?? "").trim();
    if (!schoolName) continue;
    items.push({
      schoolName,
      programme: String(formData.get(`programme_${i}`) ?? "").trim() || null,
      grade: String(formData.get(`grade_${i}`) ?? "").trim() || null,
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
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!studentId) redirect("/admin/students?err=Missing+student");
  try {
    const draft = await createSchoolApplicationDraft({
      studentId,
      packageId: packageId || null,
      createdByUserId: admin.id,
    });
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("School application draft created")}&open=${encodeURIComponent(draft.id)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create school application draft failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}`);
  }
}

async function saveDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  try {
    await saveSchoolApplicationDraft({
      id,
      packageId: String(formData.get("packageId") ?? "").trim() || null,
      parentInfo: {
        parentName: String(formData.get("parentName") ?? "").trim(),
        parentIdNo: String(formData.get("parentIdNo") ?? "").trim() || null,
        phone: String(formData.get("parentPhone") ?? "").trim() || null,
        email: String(formData.get("parentEmail") ?? "").trim() || null,
        address: String(formData.get("parentAddress") ?? "").trim() || null,
      },
      items: parseItems(formData),
      serviceHours: Number(formData.get("serviceHours") ?? 0) || null,
      addOnFeeAmount: Number(formData.get("addOnFeeAmount") ?? 0) || 0,
      billTo: String(formData.get("billTo") ?? "").trim(),
      agreementDate: String(formData.get("agreementDate") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim() || null,
      actorUserId: admin.id,
    });
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("School application draft saved")}&open=${encodeURIComponent(id)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save school application failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}`);
  }
}

async function prepareSignAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  try {
    await prepareSchoolApplicationSignLink({ id, actorUserId: admin.id });
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("Sign link ready")}&open=${encodeURIComponent(id)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Prepare sign link failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}`);
  }
}

async function voidAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const id = String(formData.get("applicationId") ?? "").trim();
  try {
    await voidSchoolApplication({
      id,
      reason: String(formData.get("reason") ?? "").trim() || null,
      actorUserId: admin.id,
    });
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?msg=${encodeURIComponent("School application voided")}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Void school application failed";
    redirect(`/admin/students/${encodeURIComponent(studentId)}/school-applications?err=${encodeURIComponent(msg)}&open=${encodeURIComponent(id)}`);
  }
}

export default async function SchoolApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string; open?: string }>;
}) {
  await requireAdmin();
  const { id: studentId } = await params;
  const sp = await searchParams;
  const [student, applications] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: { packages: { include: { course: true }, orderBy: { createdAt: "desc" } } },
    }),
    listSchoolApplicationsForStudent(studentId),
  ]);
  if (!student) redirect("/admin/students?err=Student+not+found");
  const openId = sp?.open ?? applications[0]?.id ?? "";
  const baseUrl = appBaseUrl();

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={cardStyle("#f8fbff")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800 }}>School Applications / 学校申请服务</div>
            <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>{student.name}</h1>
            <div style={{ color: "#475569", fontSize: 13 }}>Create school application service agreements without changing package hours.</div>
          </div>
          <a href={`/admin/students/${encodeURIComponent(student.id)}`} style={{ textDecoration: "none", color: "#2563eb", fontWeight: 800 }}>Back to student / 返回学生</a>
        </div>
        {sp?.msg ? <div style={{ color: "#166534", fontWeight: 700 }}>{decodeURIComponent(sp.msg)}</div> : null}
        {sp?.err ? <div style={{ color: "#b91c1c", fontWeight: 700 }}>{decodeURIComponent(sp.err)}</div> : null}
      </div>

      <div style={cardStyle()}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Create new service / 新建申请服务</h2>
        <form action={createDraftAction} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <input type="hidden" name="studentId" value={student.id} />
          <label style={{ display: "grid", gap: 6, minWidth: 320 }}>
            <span style={{ fontWeight: 700 }}>Billing package / 收款关联课包</span>
            <select name="packageId" style={inputStyle()}>
              <option value="">Auto pick latest package / 自动使用最新课包</option>
              {student.packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.course.name} · {pkg.type} · remaining {Math.round((pkg.remainingMinutes ?? 0) / 60)}h
                </option>
              ))}
            </select>
          </label>
          <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 800 }}>
            Create draft / 创建草稿
          </button>
        </form>
        <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
          First version links the invoice to a selected billing package for receipt workflow only. It does not add or deduct lesson hours.
        </div>
      </div>

      {applications.length === 0 ? (
        <div style={cardStyle("#fff7ed")}>No school application service records yet.</div>
      ) : (
        applications.map((app) => {
          const signHref = app.signToken ? `${baseUrl}${buildSchoolApplicationSignPath(app.signToken)}` : "";
          return (
            <section key={app.id} style={cardStyle(app.id === openId ? "#f8fbff" : "#fff")}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    {app.status} · {app.items.length || 0} school(s) · {money(app.totalAmount)}
                  </h2>
                  <div style={{ color: "#475569", fontSize: 13 }}>
                    Created {app.createdAt.toLocaleString("en-SG")} · Invoice {app.invoiceNo ?? "-"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/api/exports/school-application/${encodeURIComponent(app.id)}`} target="_blank" rel="noreferrer">PDF</a>
                  {app.invoiceId ? <a href={`/api/exports/parent-invoice/${encodeURIComponent(app.invoiceId)}`} target="_blank" rel="noreferrer">Invoice PDF</a> : null}
                  {app.packageId ? <a href={`/admin/packages/${encodeURIComponent(app.packageId)}/billing`}>Billing</a> : null}
                </div>
              </div>

              <form action={saveDraftAction} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="applicationId" value={app.id} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Billing package / 收款关联课包</span>
                    <select name="packageId" defaultValue={app.packageId ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"}>
                      <option value="">Select package / 请选择</option>
                      {student.packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>{pkg.course.name} · {pkg.type}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Parent name / 家长姓名</span>
                    <input name="parentName" defaultValue={app.parentInfo?.parentName ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Parent phone / 家长电话</span>
                    <input name="parentPhone" defaultValue={app.parentInfo?.phone ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Parent email / 家长邮箱</span>
                    <input name="parentEmail" defaultValue={app.parentInfo?.email ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Parent ID / 证件号</span>
                    <input name="parentIdNo" defaultValue={app.parentInfo?.parentIdNo ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Bill to / 开票对象</span>
                    <input name="billTo" defaultValue={app.billTo} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Agreement date / 合同日期</span>
                    <input name="agreementDate" type="date" defaultValue={formatDateOnly(app.agreementDate)} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Service hours / 服务时数</span>
                    <input name="serviceHours" type="number" step="0.1" defaultValue={app.serviceHours ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Parent address / 地址</span>
                  <input name="parentAddress" defaultValue={app.parentInfo?.address ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                </label>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#eff6ff" }}>
                        {["School", "Programme", "Grade", "Intake", "Service fee", "Official fee", "Official fee mode", "Notes"].map((x) => (
                          <th key={x} style={{ border: "1px solid #dbeafe", padding: 6, textAlign: "left" }}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const item = app.items[i];
                        return (
                          <tr key={i}>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`schoolName_${i}`} defaultValue={item?.schoolName ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`programme_${i}`} defaultValue={item?.programme ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`grade_${i}`} defaultValue={item?.grade ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`intake_${i}`} defaultValue={item?.intake ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`serviceFee_${i}`} type="number" step="0.01" defaultValue={item?.serviceFee ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`officialFee_${i}`} type="number" step="0.01" defaultValue={item?.officialFee ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`officialFeeMode_${i}`} defaultValue={item?.officialFeeMode ?? ""} placeholder="Parent pays school / We collect" style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                            <td style={{ border: "1px solid #e5e7eb", padding: 4 }}><input name={`notes_${i}`} defaultValue={item?.notes ?? ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Add-on fee / 增值服务费</span>
                    <input name="addOnFeeAmount" type="number" step="0.01" defaultValue={app.addOnFeeAmount || ""} style={inputStyle()} disabled={app.status === "INVOICE_CREATED"} />
                  </label>
                  <div style={{ ...cardStyle("#f0fdf4"), gap: 4 }}>
                    <strong>Total / 总额</strong>
                    <span>{money(app.totalAmount)}</span>
                    <span style={{ color: "#475569", fontSize: 12 }}>1-3 schools no refund; 4-5 schools all-fail refund 50%.</span>
                  </div>
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Note / 备注</span>
                  <textarea name="note" defaultValue={app.note ?? ""} style={{ ...inputStyle(), minHeight: 70 }} disabled={app.status === "INVOICE_CREATED"} />
                </label>
                {app.status !== "INVOICE_CREATED" ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 800 }}>
                      Save draft / 保存草稿
                    </button>
                  </div>
                ) : null}
              </form>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {app.status !== "INVOICE_CREATED" && app.status !== "VOID" ? (
                  <form action={prepareSignAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 800 }}>
                      Generate sign link / 生成签字链接
                    </button>
                  </form>
                ) : null}
                {signHref ? (
                  <>
                    <a href={signHref} target="_blank" rel="noreferrer">Open sign link</a>
                    <CopyTextButton text={signHref} label="Copy sign link / 复制签字链接" copiedLabel="Copied" style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }} />
                  </>
                ) : null}
                {app.status !== "VOID" ? (
                  <form action={voidAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    <input name="reason" placeholder="Void reason / 作废原因" style={{ ...inputStyle(), width: 220 }} required={app.status === "INVOICE_CREATED"} />
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #dc2626", background: "#fff1f2", color: "#b91c1c", fontWeight: 800 }}>
                      Void / 作废
                    </button>
                  </form>
                ) : null}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
