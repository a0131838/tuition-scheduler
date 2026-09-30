import { getCurrentUser, isOwnerManager } from "@/lib/auth";
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile } from "@/lib/business-file-storage";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { createTrainingMaterial, updateTrainingMaterial, transitionTrainingMaterial } from "@/lib/training-material-write";
import { storeSharedDocFile } from "@/lib/shared-doc-files";
import { deleteSharedDocFromS3, parseSharedDocS3Path } from "@/lib/shared-doc-storage";
import {
  getTeacherTrainingMaterials,
  isTeacherTrainingMaterialOperator,
  TEACHER_TRAINING_CATEGORY,
  type TeacherTrainingMaterialState,
  type TeacherTrainingMaterialDecision,
} from "@/lib/teacher-training-materials";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

const panel = { border: "1px solid #dbe5ef", borderRadius: 8, padding: 16, background: "#fff" };

function text(value: FormDataEntryValue | null | undefined) {
  return String(value ?? "").trim();
}

function materialError(error: unknown): never {
  redirect(`/training/materials?err=${encodeURIComponent(error instanceof Error ? error.message : "Material update failed / 材料更新失败")}`);
}

async function requireMaterialOperator() {
  const user = await getCurrentUser();
  if (!user || user.isObserver || !(await isTeacherTrainingMaterialOperator(user))) materialError(new Error("Teacher training material access required / 需要培训材料管理权限"));
  return user;
}

async function uploadMaterialAction(formData: FormData) {
  "use server";
  const user = await requireMaterialOperator();
  const title = text(formData.get("title")).slice(0, 120);
  const version = text(formData.get("version")).slice(0, 30);
  const summary = text(formData.get("summary")).slice(0, 500);
  const file = formData.get("file");
  if (!title || !version || !(file instanceof File) || !file.size) materialError(new Error("Title, version and file are required / 请填写标题、版本及文件"));

  const stored = await storeSharedDocFile(file, { categoryName: TEACHER_TRAINING_CATEGORY });
  try {
    await createTrainingMaterial({ actorId: user.id, title, version, summary, file: stored });
  } catch (error) {
    await deleteMaterialFile(stored.relativePath).catch(() => false);
    materialError(error);
  }

  revalidatePath("/training/materials");
  redirect("/training/materials?msg=draft-created");
}

async function deleteMaterialFile(filePath: string) {
  if (parseSharedDocS3Path(filePath)) return deleteSharedDocFromS3(filePath);
  return deleteStoredBusinessFile(filePath, BUSINESS_UPLOAD_PREFIX.sharedDocs);
}

async function updateMaterialDraftAction(formData: FormData) {
  "use server";
  const user = await requireMaterialOperator();
  const id = text(formData.get("id"));
  const title = text(formData.get("title")).slice(0, 120);
  const version = text(formData.get("version")).slice(0, 30);
  const summary = text(formData.get("summary")).slice(0, 500);
  const file = formData.get("file");
  if (!id || !title || !version || !(file instanceof File) || !file.size) {
    materialError(new Error("Title, version and replacement file are required / 请填写标题、版本及替换文件"));
  }

  const stored = await storeSharedDocFile(file, { categoryName: TEACHER_TRAINING_CATEGORY });
  try {
    await updateTrainingMaterial({ actorId: user.id, id, expectedUpdatedAt: text(formData.get("expectedUpdatedAt")), title, version, summary, file: stored });
  } catch (error) {
    await deleteMaterialFile(stored.relativePath).catch(() => false);
    materialError(error);
  }
  // Keep previous bytes referenced by audit history; unlinked raw URLs are not public.

  revalidatePath("/training/materials");
  redirect("/training/materials?msg=draft-updated");
}

async function transitionMaterialAction(formData: FormData) {
  "use server";
  const user = await requireMaterialOperator();
  const id = text(formData.get("id"));
  const decision = text(formData.get("decision")) as TeacherTrainingMaterialDecision;
  const note = text(formData.get("note")).slice(0, 500);
  try { await transitionTrainingMaterial({ actorId: user.id, id, expectedUpdatedAt: text(formData.get("expectedUpdatedAt")), decision, note }); }
  catch (error) { materialError(error); }
  revalidatePath("/training/materials");
  redirect(`/training/materials?msg=${decision.toLowerCase()}`);
}

const stateLabel: Record<TeacherTrainingMaterialState, { en: string; zh: string; color: string }> = {
  DRAFT: { en: "Draft", zh: "草稿", color: "#475569" },
  SUBMITTED: { en: "Pending owner review", zh: "待负责人复核", color: "#a16207" },
  PUBLISHED: { en: "Published", zh: "已发布", color: "#047857" },
  NEEDS_REVISION: { en: "Needs revision", zh: "需修改", color: "#b45309" },
  ARCHIVED: { en: "Archived", zh: "已归档", color: "#64748b" },
};

export default async function TeacherTrainingMaterialsPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const operator = await isTeacherTrainingMaterialOperator(user);
  const canWrite = !user.isObserver && operator;
  if (user.role !== "TEACHER" && !operator) redirect("/training");
  const owner = !user.isObserver && isOwnerManager(user);
  const materials = await getTeacherTrainingMaterials(user);
  const lang = await getLang();
  const sp = await searchParams;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh", color: "#172033" }}>
      <section style={{ ...panel, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)", marginBottom: 16 }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>{t(lang, "Teacher training materials", "老师培训材料")}</div>
        <h1>{t(lang, "Teacher Training Material Library", "老师培训材料库")}</h1>
        <p>{operator ? t(lang, "Teacher leads prepare drafts and submit them. Only the owner can publish materials to teachers.", "老师主管准备草稿并提交复核，只有负责人可以正式发布给老师。") : t(lang, "Only owner-approved published materials are visible here.", "这里只显示负责人已经批准发布的材料。")}</p>
        <Link href="/training">{t(lang, "Back to Training Centre", "返回培训中心")}</Link>
      </section>

      {sp?.err ? <section role="alert" style={{ ...panel, color: "#b42318", marginBottom: 16 }}>{sp.err}</section> : null}
      {sp?.msg ? <section style={{ ...panel, borderColor: "#86efac", background: "#f0fdf4", marginBottom: 16 }}>{t(lang, "Training material status updated.", "培训材料状态已更新。")}</section> : null}

      {canWrite ? (
        <section style={{ ...panel, marginBottom: 16 }}>
          <h2>{t(lang, "Create a material draft", "创建培训材料草稿")}</h2>
          <form action={uploadMaterialAction} encType="multipart/form-data" style={{ display: "grid", gap: 10 }}>
            <label>{t(lang, "Title", "标题")}<input name="title" maxLength={120} required style={{ display: "block", width: "100%" }} /></label>
            <label>{t(lang, "Version", "版本")}<input name="version" maxLength={30} placeholder="2026-08 v1" required style={{ display: "block", width: "100%" }} /></label>
            <label>{t(lang, "Summary", "内容说明")}<textarea name="summary" maxLength={500} rows={3} style={{ display: "block", width: "100%" }} /></label>
            <label>{t(lang, "File", "文件")}<input name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" required style={{ display: "block" }} /></label>
            <button type="submit">{t(lang, "Save draft", "保存草稿")}</button>
          </form>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 12 }}>
        {materials.length === 0 ? <div style={panel}>{t(lang, "No materials available.", "目前没有可用材料。")}</div> : null}
        {materials.map((material) => {
          const label = stateLabel[material.materialState];
          const latestNote = material.audits.find((audit) => audit.note)?.note || material.remarks || "";
          return (
            <article key={material.id} style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div><h3 style={{ margin: 0 }}>{material.title}</h3><small>{material.originalFileName} · {formatBusinessDateTime(material.createdAt)} · {material.uploader.name}</small></div>
                <strong style={{ color: label.color }}>{t(lang, label.en, label.zh)}</strong>
              </div>
              {latestNote ? <p style={{ whiteSpace: "pre-wrap" }}>{latestNote}</p> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={`/api/training/materials/${material.id}/file`} target="_blank" rel="noreferrer">{t(lang, "Open", "打开")}</a>
                <a href={`/api/training/materials/${material.id}/file?download=1`}>{t(lang, "Download", "下载")}</a>
              </div>
              {canWrite && ["DRAFT", "NEEDS_REVISION"].includes(material.materialState) ? (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <details>
                    <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t(lang, "Replace or revise draft", "替换或修改草稿")}</summary>
                    <form action={updateMaterialDraftAction} encType="multipart/form-data" style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <input type="hidden" name="id" value={material.id} /><input type="hidden" name="expectedUpdatedAt" value={material.updatedAt.toISOString()} />
                      <label>{t(lang, "Title", "标题")}<input name="title" defaultValue={material.title} maxLength={120} required style={{ display: "block", width: "100%" }} /></label>
                      <label>{t(lang, "New version", "新版本")}<input name="version" maxLength={30} placeholder="2026-08 v2" required style={{ display: "block", width: "100%" }} /></label>
                      <label>{t(lang, "Revision summary", "修改说明")}<textarea name="summary" maxLength={500} rows={2} style={{ display: "block", width: "100%" }} /></label>
                      <label>{t(lang, "Replacement file", "替换文件")}<input name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" required style={{ display: "block" }} /></label>
                      <button type="submit">{t(lang, "Update draft", "更新草稿")}</button>
                    </form>
                  </details>
                  <form action={transitionMaterialAction}><input type="hidden" name="id" value={material.id} /><input type="hidden" name="expectedUpdatedAt" value={material.updatedAt.toISOString()} /><button name="decision" value="SUBMIT">{t(lang, "Submit for owner review", "提交负责人复核")}</button></form>
                </div>
              ) : null}
              {owner && material.materialState === "SUBMITTED" ? (
                <form action={transitionMaterialAction} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <input type="hidden" name="id" value={material.id} /><input type="hidden" name="expectedUpdatedAt" value={material.updatedAt.toISOString()} /><textarea name="note" rows={2} placeholder={t(lang, "Publication note or revision instructions", "发布备注或修改要求")} />
                  <div style={{ display: "flex", gap: 8 }}><button name="decision" value="PUBLISH">{t(lang, "Publish", "发布")}</button><button name="decision" value="REVISION">{t(lang, "Return for revision", "退回修改")}</button></div>
                </form>
              ) : null}
              {owner && material.materialState === "PUBLISHED" ? (
                <form action={transitionMaterialAction} style={{ marginTop: 10 }}><input type="hidden" name="id" value={material.id} /><input type="hidden" name="expectedUpdatedAt" value={material.updatedAt.toISOString()} /><button name="decision" value="ARCHIVE">{t(lang, "Archive", "归档")}</button></form>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
