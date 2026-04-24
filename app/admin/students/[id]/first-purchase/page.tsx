import { notFound, redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { createFirstPurchasePackageAndContractFromIntake } from "@/lib/student-parent-intake";

function buildFirstPurchaseHref(studentId: string, params?: URLSearchParams | null) {
  const query = params?.toString();
  return `/admin/students/${encodeURIComponent(studentId)}/first-purchase${query ? `?${query}` : ""}`;
}

function appendQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, "https://local.invalid");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function fmtDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function createFirstPurchaseFromIntakeAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const intakeId = String(formData.get("intakeId") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim();
  const totalMinutes = Number(String(formData.get("totalMinutes") ?? "").trim() || 0);
  const feeAmount = Number(String(formData.get("feeAmount") ?? "").trim() || 0);
  const billTo = String(formData.get("billTo") ?? "").trim();
  const agreementDateIso = String(formData.get("agreementDateIso") ?? "").trim();
  const lessonMode = String(formData.get("lessonMode") ?? "").trim();
  const campusName = String(formData.get("campusName") ?? "").trim();
  const back = buildFirstPurchaseHref(studentId);

  if (!studentId || !intakeId || !courseId) {
    redirect(appendQuery(back, { err: "Missing first-purchase setup target" }));
  }

  try {
    const result = await createFirstPurchasePackageAndContractFromIntake({
      intakeId,
      courseId,
      totalMinutes,
      feeAmount,
      billTo,
      agreementDateIso,
      lessonMode: lessonMode || null,
      campusName: campusName || null,
      actorUserId: admin.id,
    });
    redirect(`/admin/packages/${encodeURIComponent(result.contract.packageId)}/contract?msg=First+purchase+contract+is+ready+to+sign`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const msg = error instanceof Error ? error.message : "Create first purchase contract failed";
    redirect(appendQuery(back, { err: msg }));
  }
}

export default async function StudentFirstPurchaseSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const { id: studentId } = await params;
  const sp = await searchParams;

  const [student, courses, latestParentIntake] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.studentParentIntake.findFirst({
      where: { studentId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);

  if (!student) notFound();

  const latestParentIntakePayload =
    latestParentIntake?.payloadJson && typeof latestParentIntake.payloadJson === "object" && !Array.isArray(latestParentIntake.payloadJson)
      ? (latestParentIntake.payloadJson as Record<string, unknown>)
      : null;
  const canStartFirstPurchase =
    Boolean(latestParentIntake) &&
    latestParentIntake?.status === "SUBMITTED" &&
    !latestParentIntake?.packageId &&
    !latestParentIntake?.contractId;

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <a href={`/admin/students/${encodeURIComponent(studentId)}#first-purchase-setup`} style={{ fontSize: 13 }}>
            {t(lang, "Back to student detail", "返回学生详情")}
          </a>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>
            {t(lang, "First purchase setup", "首购建档")}
          </div>
          <div style={{ color: "#475569", fontSize: 14, maxWidth: 920, lineHeight: 1.5 }}>
            {t(
              lang,
              "Parent details are already on file. Complete course, hours, fee, and bill-to details here, then jump straight into the contract workspace.",
              "家长资料已经在系统里。请在这里补课程、课时、费用和开票对象，完成后会直接跳到合同工作台。"
            )}
          </div>
        </div>
      </div>

      {sp?.err ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", fontWeight: 700 }}>
          {sp.err}
        </div>
      ) : null}
      {sp?.msg ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", fontWeight: 700 }}>
          {sp.msg}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #dbeafe",
          borderRadius: 16,
          background: "#f8fbff",
          padding: 18,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{t(lang, "Student", "学生")}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>{student.name}</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                {String(latestParentIntakePayload?.parentFullNameEn ?? "-")}
                {" · "}
                {String(latestParentIntakePayload?.phone ?? "-")}
                {" · "}
                {String(latestParentIntakePayload?.email ?? "-")}
              </div>
            </div>
            <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{t(lang, "Current step", "当前步骤")}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>
                {canStartFirstPurchase
                  ? t(lang, "Create the first package and contract", "创建首购课包和合同")
                  : t(lang, "First purchase is not ready", "首购建档暂未就绪")}
              </div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                {canStartFirstPurchase
                  ? t(lang, "This page is dedicated to course, hours, fee, and bill-to details only.", "这个页面只负责补课程、课时、费用和开票对象。")
                  : t(lang, "The latest parent intake must be submitted and unused before the first purchase setup can start.", "必须先有一条已提交且尚未使用的家长资料记录，才能开始首购建档。")}
              </div>
            </div>
          </div>
        </div>

        {canStartFirstPurchase ? (
          <form action={createFirstPurchaseFromIntakeAction} style={{ display: "grid", gap: 16 }}>
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="intakeId" value={latestParentIntake!.id} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Course", "课程")}</span>
                <select name="courseId" defaultValue="" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  <option value="">{t(lang, "Choose course", "选择课程")}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Total minutes", "总课时分钟")}</span>
                <input name="totalMinutes" type="number" min={0} step={30} defaultValue="600" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Fee amount", "课时费用")}</span>
                <input name="feeAmount" type="number" min={0} step="0.01" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Bill to", "开票对象")}</span>
                <input name="billTo" defaultValue={String(latestParentIntakePayload?.parentFullNameEn ?? student.name)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Agreement date", "合同日期")}</span>
                <input name="agreementDateIso" type="date" defaultValue={fmtDateInput(new Date())} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Lesson mode", "上课方式")}</span>
                <input name="lessonMode" placeholder={t(lang, "Optional", "可选")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t(lang, "Campus", "校区")}</span>
                <input name="campusName" placeholder={t(lang, "Optional", "可选")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                {t(lang, "After submit, the system will create the first package and open the contract workspace.", "提交后系统会创建首购课包，并直接打开合同工作台。")}
              </div>
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 46,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                {t(lang, "Create first package and contract", "创建首购课包和合同")}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: "14px 16px", color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "This student does not currently have a submitted parent intake that is ready for first-purchase setup. Go back to the student detail page and send or check the parent info link first.",
              "这名学生当前没有可用于首购建档的已提交家长资料。请先回学生详情页发送或检查家长资料链接。"
            )}
          </div>
        )}
      </div>
    </main>
  );
}
