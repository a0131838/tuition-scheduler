import {
  getManagerEmailSet,
  getOperationsAdminEmailSet,
  getTeacherLeadEmailSet,
  isOwnerManager,
  managerEmailsFromEnv,
  teacherLeadEmailsFromEnv,
  requireManager,
} from "@/lib/auth";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import ManagerEmailAddClient from "./_components/ManagerEmailAddClient";
import ManagerEmailRemoveClient from "./_components/ManagerEmailRemoveClient";
import TeacherLeadEmailAddClient from "./_components/TeacherLeadEmailAddClient";
import TeacherLeadEmailRemoveClient from "./_components/TeacherLeadEmailRemoveClient";
import SystemUserCreateClient from "./_components/SystemUserCreateClient";
import SystemUserUpdateFormClient from "./_components/SystemUserUpdateFormClient";
import SystemUserActionsClient from "./_components/SystemUserActionsClient";
import UserWorkspaceAccessFormClient from "./_components/UserWorkspaceAccessFormClient";
import UserTrainingRoleFormClient from "./_components/UserTrainingRoleFormClient";
import UserObserverModeClient from "./_components/UserObserverModeClient";
import UserOperationsAdminModeClient from "./_components/UserOperationsAdminModeClient";
import { formatBusinessDateTime } from "@/lib/date-only";
import { StaffWorkspace, SystemUserRole } from "@/lib/staff-roles";

type BasicUser = { id: string; email: string; role: SystemUserRole };

function canEditTargetUser(
  actor: BasicUser,
  target: BasicUser,
  managerSet: Set<string>
): { ok: true } | { ok: false; reason: string } {
  const actorIsOwner = isOwnerManager(actor);
  const targetIsOwner = isOwnerManager(target);
  const targetIsManagerAdmin = target.role === "ADMIN" && managerSet.has(target.email.toLowerCase());

  if (!actorIsOwner && targetIsOwner) {
    return { ok: false, reason: "Only owner manager can edit zhao hongwei account" };
  }
  if (targetIsManagerAdmin) {
    return { ok: false, reason: "Manager-admin accounts are protected and cannot be edited" };
  }
  return { ok: true };
}

// Server actions were removed; this page uses client fetch + /api routes.

export default async function ManagerUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; mode?: string }>;
}) {
  const currentUser = await requireManager();
  const lang = await getLang();
  const now = new Date();
  const canEdit = true;
  const canEditWorkspaces = isOwnerManager(currentUser);
  const canViewAllPasswordControls = currentUser.email.trim().toLowerCase() === "zhaohongwei0880@gmail.com";
  const sp = await searchParams;
  const isEditMode = canEdit && (sp?.mode ?? "").toLowerCase() === "edit";

  const [users, teachers, sessions, managerAclRows, teacherLeadAclRows, managerSet, teacherLeadSet, operationsAdminSet] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: {
        teacher: { select: { id: true, name: true } },
        workspaceAccesses: {
          where: { isActive: true },
          select: { workspace: true },
          orderBy: { workspace: "asc" },
        },
        trainingRoleAssignments: {
          where: { isActive: true },
          select: { role: true },
          orderBy: { role: "asc" },
        },
      },
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
    prisma.teacherLeadAcl.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    getManagerEmailSet(),
    getTeacherLeadEmailSet(),
    getOperationsAdminEmailSet(),
  ]);
  const envManagerEmails = managerEmailsFromEnv();
  const envTeacherLeadEmails = teacherLeadEmailsFromEnv();

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
    { ADMIN: 0, FINANCE: 0, SALES: 0, CS: 0, TEACHER: 0, STUDENT: 0 } as Record<string, number>
  );
  const unlinkedTeacherUsers = users.filter((user) => user.role === "TEACHER" && !user.teacherId);

  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(lang, "System User Admin", "系统使用者管理")}</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            {t(lang, "Default is read-only monitor mode.", "默认是只读监控模式。")}
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

      {!isOwnerManager(currentUser) ? (
        <NoticeBanner
          type="info"
          title={t(lang, "Scoped edit permissions", "受限编辑权限")}
          message={t(
            lang,
            "Managers can edit users except protected manager-admin accounts. Non-owner managers cannot edit zhao hongwei.",
            "管理者可编辑用户，但不能编辑受保护的管理者账号；非 owner 管理者不能编辑 zhao hongwei。"
          )}
        />
      ) : null}

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={msg} /> : null}
      {unlinkedTeacherUsers.length ? (
        <NoticeBanner
          type="error"
          title={t(lang, "Teacher profiles require attention", "教师档案需要处理")}
          message={t(
            lang,
            `${unlinkedTeacherUsers.length} teacher account(s) cannot enter the teacher workspace until the exact profile is linked: ${unlinkedTeacherUsers.map((user) => `${user.name} (${user.email})`).join(", ")}`,
            `有 ${unlinkedTeacherUsers.length} 个教师账号尚未绑定准确教师档案，绑定前无法进入教师工作台：${unlinkedTeacherUsers.map((user) => `${user.name}（${user.email}）`).join("、")}`
          )}
        >
          {!isEditMode ? <a href="/admin/manager/users?mode=edit">{t(lang, "Open Edit Mode", "进入编辑模式")}</a> : null}
        </NoticeBanner>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div><b>{t(lang, "Total Users", "用户总数")}</b>: {users.length}</div>
          <div><b>ADMIN</b>: {roleCount.ADMIN}</div>
          <div><b>FINANCE</b>: {roleCount.FINANCE}</div>
          <div><b>SALES</b>: {roleCount.SALES}</div>
          <div><b>CS</b>: {roleCount.CS}</div>
          <div><b>TEACHER</b>: {roleCount.TEACHER}</div>
          <div><b>STUDENT</b>: {roleCount.STUDENT}</div>
          <div><b>{t(lang, "Active Sessions", "活跃会话")}</b>: {sessions.length}</div>
          <div><b>{t(lang, "Manager Emails", "管理者名单")}</b>: {managerSet.size}</div>
          <div><b>{t(lang, "Teacher Lead Emails", "老师主管名单")}</b>: {teacherLeadSet.size}</div>
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

        {isEditMode && isOwnerManager(currentUser) ? (
          <ManagerEmailAddClient
            labels={{
              managerEmail: t(lang, "Manager Email", "管理员邮箱"),
              noteOptional: t(lang, "Note (optional)", "备注(可选)"),
              addManager: t(lang, "Add Manager", "新增管理员"),
              errorPrefix: t(lang, "Error", "错误"),
            }}
          />
        ) : null}

        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Email</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Created", "创建")}</th>
              {isEditMode && isOwnerManager(currentUser) ? <th align="left">{t(lang, "Action", "操作")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {managerAclRows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td>{row.email}</td>
                <td>{row.note || "-"}</td>
                <td>{formatBusinessDateTime(row.createdAt)}</td>
                {isEditMode && isOwnerManager(currentUser) ? (
                  <td>
                    <ManagerEmailRemoveClient
                      id={row.id}
                      confirmMessage={t(lang, "Remove this manager email?", "确认移除该管理员邮箱？")}
                      label={t(lang, "Remove", "移除")}
                      errorPrefix={t(lang, "Error", "错误")}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {managerAclRows.length === 0 ? (
              <tr>
                <td colSpan={isEditMode && isOwnerManager(currentUser) ? 4 : 3}>{t(lang, "No DB manager emails.", "数据库中暂无管理者邮箱。")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Teacher Lead Access List", "老师主管名单维护")}</h3>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          {t(
            lang,
            "Teacher lead list = env TEACHER_LEAD_EMAILS + entries below. Teacher leads keep teacher access and gain the lead desk only.",
            "老师主管名单 = 环境变量 TEACHER_LEAD_EMAILS + 下方数据库名单。老师主管保留老师端权限，并额外获得主管工作台。"
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <b>TEACHER_LEAD_EMAILS (.env)</b>: {envTeacherLeadEmails.length ? envTeacherLeadEmails.join(", ") : "(empty)"}
        </div>

        {isEditMode && isOwnerManager(currentUser) ? (
          <TeacherLeadEmailAddClient
            labels={{
              email: t(lang, "Teacher Lead Email", "老师主管邮箱"),
              noteOptional: t(lang, "Note (optional)", "备注(可选)"),
              addLead: t(lang, "Add Teacher Lead", "新增老师主管"),
              errorPrefix: t(lang, "Error", "错误"),
            }}
          />
        ) : null}

        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Email</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Created", "创建")}</th>
              {isEditMode && isOwnerManager(currentUser) ? <th align="left">{t(lang, "Action", "操作")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {teacherLeadAclRows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td>{row.email}</td>
                <td>{row.note || "-"}</td>
                <td>{formatBusinessDateTime(row.createdAt)}</td>
                {isEditMode && isOwnerManager(currentUser) ? (
                  <td>
                    <TeacherLeadEmailRemoveClient
                      id={row.id}
                      confirmMessage={t(lang, "Remove this teacher lead email?", "确认移除该老师主管邮箱？")}
                      label={t(lang, "Remove", "移除")}
                      errorPrefix={t(lang, "Error", "错误")}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {teacherLeadAclRows.length === 0 ? (
              <tr>
                <td colSpan={isEditMode && isOwnerManager(currentUser) ? 4 : 3}>{t(lang, "No DB teacher lead emails.", "数据库中暂无老师主管邮箱。")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isEditMode ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>{t(lang, "Create User", "新增用户")}</h3>
          <SystemUserCreateClient
            teachers={teachers}
            labels={{
              name: t(lang, "Name", "姓名"),
              role: t(lang, "Role", "角色"),
              language: t(lang, "Language", "语言"),
              bindTeacherOptional: t(lang, "Bind Teacher (optional)", "绑定老师(可选)"),
              noBinding: t(lang, "No binding", "不绑定"),
              initialPassword: t(lang, "Initial Password", "初始密码"),
              create: t(lang, "Create", "创建"),
              errorPrefix: t(lang, "Error", "错误"),
            }}
          />
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Current Users", "当前用户")}</h3>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">{t(lang, "User", "用户")}</th>
              <th align="left">{t(lang, "Role / Lang", "角色 / 语言")}</th>
              <th align="left">{t(lang, "Extra Workspaces", "兼职工作台")}</th>
              <th align="left">{t(lang, "Training Roles", "培训岗位")}</th>
              <th align="left">{t(lang, "Teacher Link", "老师绑定")}</th>
              <th align="left">{t(lang, "Session", "会话")}</th>
              {isEditMode ? <th align="left">{t(lang, "Actions", "操作")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const sess = sessionInfo.get(u.id);
              const isManager = managerSet.has(u.email.toLowerCase()) && u.role === "ADMIN";
              const isTeacherLead = teacherLeadSet.has(u.email.toLowerCase());
              const isOperationsAdmin = operationsAdminSet.has(u.email.toLowerCase());
              const rowEditable = canEditTargetUser(currentUser, u as BasicUser, managerSet).ok;
              return (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div>{u.email}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t(lang, "Created", "创建")}: {formatBusinessDateTime(u.createdAt)}
                      {isManager ? ` | ${t(lang, "Manager", "管理者")}` : ""}
                      {isTeacherLead ? ` | ${t(lang, "Teacher Lead", "老师主管")}` : ""}
                      {isOperationsAdmin ? ` | ${t(lang, "Teaching Operations Admin (no finance)", "教学运营管理员（无财务）")}` : ""}
                      {u.isObserver ? ` | ${t(lang, "Observer (read-only)", "观察者（只读）")}` : ""}
                    </div>
                  </td>
                  <td>
                    {isEditMode && rowEditable ? (
                      <SystemUserUpdateFormClient
                        user={{ id: u.id, name: u.name, email: u.email, role: u.role, language: u.language, teacherId: u.teacherId ?? null }}
                        teachers={teachers}
                        labels={{
                          name: t(lang, "Name", "姓名"),
                          role: t(lang, "Role", "角色"),
                          language: t(lang, "Language", "语言"),
                          noTeacher: t(lang, "No teacher", "不绑定老师"),
                          save: t(lang, "Save", "保存"),
                          errorPrefix: t(lang, "Error", "错误"),
                        }}
                      />
                    ) : (
                      <div>
                        {u.role} / {u.language}
                        {isEditMode && !rowEditable ? (
                          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>
                            {t(lang, "Protected account, read-only.", "受保护账号，只读。")}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditMode && canEditWorkspaces ? (
                      <UserWorkspaceAccessFormClient
                        userId={u.id}
                        current={u.workspaceAccesses.map((item) => item.workspace as StaffWorkspace)}
                        labels={{
                          sales: t(lang, "Sales", "销售"),
                          cs: t(lang, "CS", "客服"),
                          care: t(lang, "Full Care", "全托管"),
                          hr: t(lang, "HR", "人事"),
                          save: t(lang, "Save", "保存"),
                          errorPrefix: t(lang, "Error", "错误"),
                        }}
                      />
                    ) : (
                      u.workspaceAccesses.length ? u.workspaceAccesses.map((item) => item.workspace).join(" / ") : "-"
                    )}
                  </td>
                  <td>
                    {isEditMode && canEditWorkspaces ? (
                      <UserTrainingRoleFormClient
                        userId={u.id}
                        primaryRole={u.role}
                        current={u.trainingRoleAssignments.map((item) => item.role).filter((role) => role !== "STUDENT")}
                        language={lang}
                      />
                    ) : (
                      [u.role, ...u.trainingRoleAssignments.map((item) => item.role).filter((role) => role !== u.role)].join(" / ")
                    )}
                  </td>
                  <td>
                    {u.teacher ? (
                      u.teacher.name
                    ) : u.role === "TEACHER" ? (
                      <span style={{ color: "#b42318", fontWeight: 800 }}>
                        {t(lang, "Required — teacher portal locked", "必须绑定—教师端已锁定")}
                      </span>
                    ) : (
                      t(lang, "Not linked", "未绑定")
                    )}
                  </td>
                  <td>
                    <div>{t(lang, "Active", "活跃")}: {sess?.count ?? 0}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t(lang, "Last login", "最近登录")}: {sess?.lastCreatedAt ? formatBusinessDateTime(sess.lastCreatedAt) : "-"}
                    </div>
                  </td>
                  {isEditMode ? (
                    <td>
                      {rowEditable ? (
                        <>
                          {canEditWorkspaces ? (
                            <>
                              <UserObserverModeClient
                                userId={u.id}
                                enabled={u.isObserver}
                                labels={{
                                  observer: t(lang, "Observer mode", "观察者模式"),
                                  save: t(lang, "Apply access change", "应用权限变更"),
                                  confirm: t(lang, "Change observer mode and sign this user out everywhere?", "确认更改观察者权限，并让该账号在网页和小程序全部退出？"),
                                  errorPrefix: t(lang, "Error", "错误"),
                                }}
                              />
                              <UserOperationsAdminModeClient
                                userId={u.id}
                                enabled={isOperationsAdmin}
                                labels={{
                                  title: t(lang, "Teaching operations admin (no company finance)", "教学运营管理员（不含公司财务）"),
                                  save: t(lang, "Apply access change", "应用权限变更"),
                                  confirm: t(lang, "Change operations access and sign this user out everywhere?", "确认更改运营权限，并让该账号在网页和小程序全部退出？"),
                                  errorPrefix: t(lang, "Error", "错误"),
                                }}
                              />
                            </>
                          ) : null}
                          <SystemUserActionsClient
                            userId={u.id}
                            canManagePassword={canViewAllPasswordControls}
                            labels={{
                              newPasswordPlaceholder: t(lang, "New password (>=8)", "新密码(至少8位)"),
                              resetPassword: t(lang, "Reset Password", "重置密码"),
                              deleteUser: t(lang, "Delete User", "删除用户"),
                              confirmDelete: t(lang, "Delete this user?", "确认删除该用户？"),
                              errorPrefix: t(lang, "Error", "错误"),
                            }}
                          />
                        </>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Read-only", "只读")}</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 7 : 6}>{t(lang, "No users.", "暂无用户")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
