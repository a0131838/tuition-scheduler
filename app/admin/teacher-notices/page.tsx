import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  archiveTeacherNotice,
  getAllTeacherNotices,
  getTeacherNoticeReadStore,
  normalizeTeacherNoticeCategory,
  resetTeacherNoticeReads,
  seedDefaultTeacherNoticesIfMissing,
  type TeacherNotice,
  upsertTeacherNotice,
} from "@/lib/teacher-notices";

function cardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 10,
  } as const;
}

function textInputStyle() {
  return { width: "100%", minHeight: 38 } as const;
}

function labelStyle() {
  return { display: "grid", gap: 4, fontSize: 13, fontWeight: 700 } as const;
}

function formString(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function buildNoticeFromForm(fd: FormData, existing?: TeacherNotice): TeacherNotice {
  const now = new Date().toISOString();
  const titleEn = formString(fd, "titleEn");
  const titleZh = formString(fd, "titleZh");
  const bodyEn = formString(fd, "bodyEn");
  const bodyZh = formString(fd, "bodyZh");
  if (!titleEn || !titleZh || !bodyEn || !bodyZh) throw new Error("Title and body are required in both languages");
  return {
    id: existing?.id ?? randomUUID(),
    category: normalizeTeacherNoticeCategory(fd.get("category")),
    titleEn,
    titleZh,
    bodyEn,
    bodyZh,
    publishedAt: formString(fd, "publishedAt") || new Date().toISOString().slice(0, 10),
    expiresAt: formString(fd, "expiresAt"),
    important: fd.get("important") === "on",
    requiresAck: fd.get("requiresAck") === "on",
    active: existing ? fd.get("active") === "on" : true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

async function createNoticeAction(fd: FormData) {
  "use server";
  await requireAdmin();
  try {
    await upsertTeacherNotice(buildNoticeFromForm(fd));
  } catch (error) {
    redirect(`/admin/teacher-notices?err=${encodeURIComponent(error instanceof Error ? error.message : "Create failed")}`);
  }
  revalidatePath("/admin/teacher-notices");
  revalidatePath("/teacher");
  revalidatePath("/teacher/notices");
  redirect("/admin/teacher-notices?msg=created");
}

async function updateNoticeAction(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = formString(fd, "id");
  const { notices } = await getAllTeacherNotices();
  const existing = notices.find((notice) => notice.id === id);
  if (!existing) redirect("/admin/teacher-notices?err=notice-not-found");
  try {
    await upsertTeacherNotice(buildNoticeFromForm(fd, existing));
  } catch (error) {
    redirect(`/admin/teacher-notices?err=${encodeURIComponent(error instanceof Error ? error.message : "Update failed")}`);
  }
  revalidatePath("/admin/teacher-notices");
  revalidatePath("/teacher");
  revalidatePath("/teacher/notices");
  redirect("/admin/teacher-notices?msg=updated");
}

async function archiveNoticeAction(fd: FormData) {
  "use server";
  await requireAdmin();
  await archiveTeacherNotice(formString(fd, "id"));
  revalidatePath("/admin/teacher-notices");
  revalidatePath("/teacher");
  revalidatePath("/teacher/notices");
  redirect("/admin/teacher-notices?msg=archived");
}

async function resetReadsAction(fd: FormData) {
  "use server";
  await requireAdmin();
  await resetTeacherNoticeReads(formString(fd, "id"));
  revalidatePath("/admin/teacher-notices");
  revalidatePath("/teacher");
  revalidatePath("/teacher/notices");
  redirect("/admin/teacher-notices?msg=reads-reset");
}

async function seedDefaultsAction() {
  "use server";
  await requireAdmin();
  await seedDefaultTeacherNoticesIfMissing();
  revalidatePath("/admin/teacher-notices");
  revalidatePath("/teacher");
  revalidatePath("/teacher/notices");
  redirect("/admin/teacher-notices?msg=seeded");
}

function NoticeForm({ notice }: { notice?: TeacherNotice }) {
  const action = notice ? updateNoticeAction : createNoticeAction;
  return (
    <form action={action} style={{ ...cardStyle("#ffffff", "#e2e8f0"), gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      {notice ? <input type="hidden" name="id" value={notice.id} /> : null}
      <label style={labelStyle()}>
        Category / 类型
        <select name="category" defaultValue={notice?.category ?? "COMPANY"} style={textInputStyle()}>
          <option value="COMPANY">Company / 公司公告</option>
          <option value="FINANCE">Finance / 财务通知</option>
          <option value="SCHEDULE">Schedule / 排课通知</option>
          <option value="POLICY">Policy / 制度更新</option>
          <option value="GENERAL">General / 一般通知</option>
        </select>
      </label>
      <label style={labelStyle()}>
        Publish date / 发布时间
        <input name="publishedAt" type="date" defaultValue={notice?.publishedAt ?? new Date().toISOString().slice(0, 10)} style={textInputStyle()} />
      </label>
      <label style={labelStyle()}>
        English title / 英文标题
        <input name="titleEn" defaultValue={notice?.titleEn ?? ""} style={textInputStyle()} />
      </label>
      <label style={labelStyle()}>
        Chinese title / 中文标题
        <input name="titleZh" defaultValue={notice?.titleZh ?? ""} style={textInputStyle()} />
      </label>
      <label style={{ ...labelStyle(), gridColumn: "1 / -1" }}>
        English body / 英文内容
        <textarea name="bodyEn" defaultValue={notice?.bodyEn ?? ""} rows={3} />
      </label>
      <label style={{ ...labelStyle(), gridColumn: "1 / -1" }}>
        Chinese body / 中文内容
        <textarea name="bodyZh" defaultValue={notice?.bodyZh ?? ""} rows={3} />
      </label>
      <label style={labelStyle()}>
        Expiry date optional / 截止日期可选
        <input name="expiresAt" type="date" defaultValue={notice?.expiresAt ?? ""} style={textInputStyle()} />
      </label>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <label><input name="important" type="checkbox" defaultChecked={notice?.important ?? true} /> Important / 重要</label>
        <label><input name="requiresAck" type="checkbox" defaultChecked={notice?.requiresAck ?? true} /> Require acknowledgement / 需要确认</label>
        {notice ? <label><input name="active" type="checkbox" defaultChecked={notice.active} /> Active / 启用</label> : null}
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <button type="submit">{notice ? "Save notice / 保存通知" : "Create notice / 新建通知"}</button>
      </div>
    </form>
  );
}

export default async function AdminTeacherNoticesPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  await requireAdmin();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const [{ notices }, readStore, teacherUsers] = await Promise.all([
    getAllTeacherNotices(),
    getTeacherNoticeReadStore(),
    prisma.user.findMany({
      where: { OR: [{ role: "TEACHER" }, { teacherId: { not: null } }] },
      select: { id: true, name: true, email: true, teacherId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const teacherUserCount = teacherUsers.length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle("linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)", "#bfdbfe")}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{t(lang, "Teacher Notices", "老师通知管理")}</div>
        <div style={{ color: "#475569" }}>
          {t(lang, "Publish company, finance, schedule, and policy messages to the teacher portal.", "向老师端发布公司、财务、排课和制度通知。")}
        </div>
        <form action={seedDefaultsAction}>
          <button type="submit">{t(lang, "Seed default company notice", "写入默认公司名称通知")}</button>
        </form>
      </section>

      {err ? <div style={{ color: "#b91c1c" }}>{err}</div> : null}
      {msg ? <div style={{ color: "#166534" }}>{msg}</div> : null}

      <section style={cardStyle("#f8fafc", "#e2e8f0")}>
        <div style={{ fontWeight: 800 }}>{t(lang, "Create Notice", "新建通知")}</div>
        <NoticeForm />
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>{t(lang, "Current Notices", "当前通知")}</h3>
        {notices.map((notice) => {
          const readEntries = teacherUsers.filter((user) => readStore.readsByUser[user.id]?.[notice.id]);
          const unreadCount = Math.max(0, teacherUserCount - readEntries.length);
          return (
            <details key={notice.id} open={notice.active} style={cardStyle(notice.active ? "#ffffff" : "#f8fafc", notice.important ? "#f59e0b" : "#e2e8f0")}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {notice.titleEn} / {notice.titleZh} · {notice.category} · {notice.active ? "Active / 启用" : "Archived / 已下架"}
              </summary>
              <div style={{ color: "#475569" }}>
                Published: {notice.publishedAt || "-"} {notice.expiresAt ? `· Expires: ${notice.expiresAt}` : ""} ·
                Read/Ack: {readEntries.length}/{teacherUserCount} · Unread: {unreadCount}
              </div>
              <NoticeForm notice={notice} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <form action={archiveNoticeAction}>
                  <input type="hidden" name="id" value={notice.id} />
                  <button type="submit">{t(lang, "Archive", "下架")}</button>
                </form>
                <form action={resetReadsAction}>
                  <input type="hidden" name="id" value={notice.id} />
                  <button type="submit">{t(lang, "Reset read records", "重置已读记录")}</button>
                </form>
              </div>
              <details>
                <summary>{t(lang, "Read / unread detail", "已读/未读明细")}</summary>
                <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                  {teacherUsers.map((user) => {
                    const readAt = readStore.readsByUser[user.id]?.[notice.id];
                    return (
                      <div key={user.id} style={{ color: readAt ? "#166534" : "#b45309", fontSize: 13 }}>
                        {user.name} ({user.email}) - {readAt ? `${t(lang, "Read", "已读")}: ${readAt}` : t(lang, "Unread", "未读")}
                      </div>
                    );
                  })}
                </div>
              </details>
            </details>
          );
        })}
      </section>
    </div>
  );
}
