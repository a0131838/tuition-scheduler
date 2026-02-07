import {
  createPasswordHash,
  getManagerEmailSet,
  isOwnerManager,
  managerEmailsFromEnv,
  requireManager,
  requireOwnerManager,
} from "@/lib/auth";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";
import ConfirmSubmitButton from "@/app/admin/_components/ConfirmSubmitButton";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";

function pickRole(v: string) {
  return v === "ADMIN" || v === "TEACHER" || v === "STUDENT" ? v : "ADMIN";
}

function pickLang(v: string) {
  return v === "BILINGUAL" || v === "ZH" || v === "EN" ? v : "BILINGUAL";
}

function editRedirect(query: string) {
  redirect(`/admin/manager/users?mode=edit&${query}`);
}

async function createSystemUser(formData: FormData) {
  "use server";
  await requireOwnerManager();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = pickRole(String(formData.get("role") ?? ""));
  const language = pickLang(String(formData.get("language") ?? ""));
  const teacherIdRaw = String(formData.get("teacherId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name || !password) editRedirect("err=Email,+name,+and+password+are+required");
  if (password.length < 8) editRedirect("err=Password+must+be+at+least+8+characters");

  const teacherId = role === "TEACHER" || role === "ADMIN" ? teacherIdRaw || null : null;
  if (teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
    if (!teacher) editRedirect("err=Teacher+not+found");
    const linked = await prisma.user.findFirst({ where: { teacherId }, select: { email: true } });
    if (linked) editRedirect(`err=Teacher+already+linked+to+${encodeURIComponent(linked.email)}`);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) editRedirect("err=Email+already+exists");

  const { salt, hash } = createPasswordHash(password);
  await prisma.user.create({
    data: {
      email,
      name,
      role: role as any,
      language: language as any,
      teacherId,
      passwordSalt: salt,
      passwordHash: hash,
    },
  });

  editRedirect("msg=User+created");
}

async function updateSystemUser(formData: FormData) {
  "use server";
  const manager = await requireOwnerManager();

  const id = String(formData.get("id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = pickRole(String(formData.get("role") ?? ""));
  const language = pickLang(String(formData.get("language") ?? ""));
  const teacherIdRaw = String(formData.get("teacherId") ?? "").trim();

  if (!id || !email || !name) editRedirect("err=Missing+required+fields");
  if (id === manager.id && role !== "ADMIN") editRedirect("err=You+cannot+change+your+own+role+from+ADMIN");

  const teacherId = role === "TEACHER" || role === "ADMIN" ? teacherIdRaw || null : null;
  if (teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
    if (!teacher) editRedirect("err=Teacher+not+found");
    const linked = await prisma.user.findFirst({ where: { teacherId, NOT: { id } }, select: { email: true } });
    if (linked) editRedirect(`err=Teacher+already+linked+to+${encodeURIComponent(linked.email)}`);
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { email, name, role: role as any, language: language as any, teacherId },
    });
  } catch {
    editRedirect("err=Save+failed+(email+may+already+exist)");
  }

  editRedirect("msg=User+updated");
}

async function resetSystemUserPassword(formData: FormData) {
  "use server";
  await requireOwnerManager();

  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!id || !password) editRedirect("err=Missing+user+or+password");
  if (password.length < 8) editRedirect("err=Password+must+be+at+least+8+characters");

  const { salt, hash } = createPasswordHash(password);
  await prisma.user.update({
    where: { id },
    data: { passwordSalt: salt, passwordHash: hash },
  });
  await prisma.authSession.deleteMany({ where: { userId: id } });

  editRedirect("msg=Password+reset+(all+sessions+revoked)");
}

async function deleteSystemUser(formData: FormData) {
  "use server";
  const manager = await requireOwnerManager();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) editRedirect("err=Missing+user+id");
  if (id === manager.id) editRedirect("err=You+cannot+delete+your+own+account");

  await prisma.authSession.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  editRedirect("msg=User+deleted");
}

async function addManagerEmail(formData: FormData) {
  "use server";
  await requireOwnerManager();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim();

  if (!email || !email.includes("@")) editRedirect("err=Invalid+manager+email");
  await prisma.managerAcl.upsert({
    where: { email },
    update: { isActive: true, note: note || null },
    create: { email, isActive: true, note: note || null },
  });

  editRedirect("msg=Manager+added");
}

async function removeManagerEmail(formData: FormData) {
  "use server";
  await requireOwnerManager();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) editRedirect("err=Missing+manager+id");

  await prisma.managerAcl.delete({ where: { id } });
  editRedirect("msg=Manager+removed");
}

export default async function ManagerUsersPage({
  searchParams,
}: {
  searchParams?: { msg?: string; err?: string; mode?: string };
}) {
  const currentUser = await requireManager();
  const lang = await getLang();
  const now = new Date();
  const canEdit = isOwnerManager(currentUser);
  const isEditMode = canEdit && (searchParams?.mode ?? "").toLowerCase() === "edit";

  const [users, teachers, sessions, managerAclRows, managerSet] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: { teacher: { select: { id: true, name: true } } },
    }),
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.authSession.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { userId: true, createdAt: true },
    }),
    prisma.managerAcl.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    getManagerEmailSet(),
  ]);
  const envManagerEmails = managerEmailsFromEnv();

  const sessionInfo = new Map<string, { count: number; lastCreatedAt: Date | null }>();
  for (const s of sessions) {
    const prev = sessionInfo.get(s.userId) ?? { count: 0, lastCreatedAt: null };
    sessionInfo.set(s.userId, {
      count: prev.count + 1,
      lastCreatedAt: prev.lastCreatedAt && prev.lastCreatedAt > s.createdAt ? prev.lastCreatedAt : s.createdAt,
    });
  }

  const roleCount = users.reduce(
    (acc, x) => {
      acc[x.role] += 1;
      return acc;
    },
    { ADMIN: 0, TEACHER: 0, STUDENT: 0 } as Record<string, number>
  );

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(lang, "System User Admin", "系统使用者管理")}</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            {t(lang, "Default is read-only monitor mode.", "默认只读监控模式。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && isEditMode ? (
            <a href="/admin/manager/users">{t(lang, "Switch to Monitor", "切换到监控模式")}</a>
          ) : null}
          {canEdit && !isEditMode ? (
            <a href="/admin/manager/users?mode=edit">{t(lang, "Enter Edit Mode", "进入编辑模式")}</a>
          ) : null}
        </div>
      </div>

      {!canEdit ? (
        <NoticeBanner
          type="info"
          title={t(lang, "Read-only", "只读")}
          message={t(lang, "Only zhao hongwei account can edit on this page.", "该页面仅 zhao hongwei 账号可编辑，其他管理者只读。")}
        />
      ) : null}

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={msg} /> : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div><b>{t(lang, "Total Users", "用户总数")}</b>: {users.length}</div>
          <div><b>ADMIN</b>: {roleCount.ADMIN}</div>
          <div><b>TEACHER</b>: {roleCount.TEACHER}</div>
          <div><b>STUDENT</b>: {roleCount.STUDENT}</div>
          <div><b>{t(lang, "Active Sessions", "活跃会话")}</b>: {sessions.length}</div>
          <div><b>{t(lang, "Manager Emails", "管理者名单")}</b>: {managerSet.size}</div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Manager Access List", "管理者名单维护")}</h3>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          {t(
            lang,
            "Final manager list = env MANAGER_EMAILS + entries below.",
            "最终管理者名单 = 环境变量 MANAGER_EMAILS + 下方数据库名单。"
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <b>MANAGER_EMAILS (.env)</b>: {envManagerEmails.length ? envManagerEmails.join(", ") : "(empty)"}
        </div>

        {isEditMode ? (
          <form action={addManagerEmail} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 10 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Manager Email", "管理者邮箱")}</span>
              <input name="email" type="email" required style={{ minWidth: 240 }} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Note (optional)", "备注(可选)")}</span>
              <input name="note" style={{ minWidth: 220 }} />
            </label>
            <button type="submit">{t(lang, "Add Manager", "新增管理者")}</button>
          </form>
        ) : null}

        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Email</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Created", "创建")}</th>
              {isEditMode ? <th align="left">{t(lang, "Action", "操作")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {managerAclRows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td>{row.email}</td>
                <td>{row.note || "-"}</td>
                <td>{row.createdAt.toLocaleString()}</td>
                {isEditMode ? (
                  <td>
                    <form action={removeManagerEmail}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmSubmitButton message={t(lang, "Remove this manager email?", "确认移除该管理者邮箱？")}>
                        {t(lang, "Remove", "移除")}
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
            {managerAclRows.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 4 : 3}>{t(lang, "No DB manager emails.", "数据库中暂无管理者邮箱。")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isEditMode ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>{t(lang, "Create User", "新增用户")}</h3>
          <form action={createSystemUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>Email</span>
              <input name="email" type="email" required style={{ minWidth: 240 }} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Name", "姓名")}</span>
              <input name="name" required style={{ minWidth: 160 }} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Role", "角色")}</span>
              <select name="role" defaultValue="ADMIN">
                <option value="ADMIN">ADMIN</option>
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Language", "语言")}</span>
              <select name="language" defaultValue="BILINGUAL">
                <option value="BILINGUAL">BILINGUAL</option>
                <option value="ZH">ZH</option>
                <option value="EN">EN</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Bind Teacher (optional)", "绑定老师(可选)")}</span>
              <select name="teacherId" defaultValue="">
                <option value="">{t(lang, "No binding", "不绑定")}</option>
                {teachers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>{t(lang, "Initial Password", "初始密码")}</span>
              <input name="password" type="password" required minLength={8} style={{ minWidth: 180 }} />
            </label>
            <button type="submit">{t(lang, "Create", "创建")}</button>
          </form>
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Current Users", "当前用户")}</h3>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">{t(lang, "User", "用户")}</th>
              <th align="left">{t(lang, "Role / Lang", "角色 / 语言")}</th>
              <th align="left">{t(lang, "Teacher Link", "老师绑定")}</th>
              <th align="left">{t(lang, "Session", "会话")}</th>
              {isEditMode ? <th align="left">{t(lang, "Actions", "操作")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const sess = sessionInfo.get(u.id);
              const isManager = managerSet.has(u.email.toLowerCase()) && u.role === "ADMIN";
              return (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div>{u.email}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t(lang, "Created", "创建")}: {u.createdAt.toLocaleString()}
                      {isManager ? ` | ${t(lang, "Manager", "管理者")}` : ""}
                    </div>
                  </td>
                  <td>
                    {isEditMode ? (
                      <form action={updateSystemUser} style={{ display: "grid", gap: 6, minWidth: 250 }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input name="name" defaultValue={u.name} placeholder={t(lang, "Name", "姓名")} />
                        <input name="email" type="email" defaultValue={u.email} placeholder="Email" />
                        <div style={{ display: "flex", gap: 6 }}>
                          <select name="role" defaultValue={u.role}>
                            <option value="ADMIN">ADMIN</option>
                            <option value="TEACHER">TEACHER</option>
                            <option value="STUDENT">STUDENT</option>
                          </select>
                          <select name="language" defaultValue={u.language}>
                            <option value="BILINGUAL">BILINGUAL</option>
                            <option value="ZH">ZH</option>
                            <option value="EN">EN</option>
                          </select>
                        </div>
                        <select name="teacherId" defaultValue={u.teacherId ?? ""}>
                          <option value="">{t(lang, "No teacher", "不绑定老师")}</option>
                          {teachers.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit">{t(lang, "Save", "保存")}</button>
                      </form>
                    ) : (
                      <div>{u.role} / {u.language}</div>
                    )}
                  </td>
                  <td>{u.teacher ? u.teacher.name : t(lang, "Not linked", "未绑定")}</td>
                  <td>
                    <div>{t(lang, "Active", "活跃")}: {sess?.count ?? 0}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t(lang, "Last login", "最近登录")}: {sess?.lastCreatedAt ? sess.lastCreatedAt.toLocaleString() : "-"}
                    </div>
                  </td>
                  {isEditMode ? (
                    <td>
                      <form action={resetSystemUserPassword} style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input
                          name="password"
                          type="password"
                          minLength={8}
                          placeholder={t(lang, "New password (>=8)", "新密码(至少8位)")}
                        />
                        <button type="submit">{t(lang, "Reset Password", "重置密码")}</button>
                      </form>
                      <form action={deleteSystemUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <ConfirmSubmitButton message={t(lang, "Delete this user?", "确认删除该用户？")}>
                          {t(lang, "Delete User", "删除用户")}
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 5 : 4}>{t(lang, "No users.", "暂无用户")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
