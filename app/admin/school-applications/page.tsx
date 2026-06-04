import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function money(value: unknown) {
  return `SGD ${Number(value ?? 0).toFixed(2)}`;
}

function itemCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export default async function AdminSchoolApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const q = first(sp?.q).trim();
  const [students, applications] = await Promise.all([
    q
      ? prisma.student.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { school: { contains: q, mode: "insensitive" } },
              { grade: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            school: true,
            grade: true,
            packages: {
              select: { id: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
    prisma.schoolApplicationService.findMany({
      include: { student: true, package: { include: { course: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const cardStyle = {
    border: "1px solid #dbeafe",
    borderRadius: 12,
    background: "#fff",
    padding: 14,
    display: "grid",
    gap: 12,
  } as const;

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <section style={{ ...cardStyle, background: "#f8fbff" }}>
        <div>
          <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800 }}>
            {t(lang, "School Applications", "学校申请服务")}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
            {t(lang, "Parent sign links for school application services", "学校申请服务家长签字链接")}
          </h1>
          <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
            {t(
              lang,
              "Search a student, open their service workspace, then create the agreement and sign link. This workflow uses billing only for invoice and receipt handling; it does not change lesson hours.",
              "先搜索学生，进入该学生的服务工作区，再创建协议和签字链接。这个流程只借用账单做发票和收据，不改变课时余额。"
            )}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            name="q"
            defaultValue={q}
            placeholder={t(lang, "Search student name / school / grade", "搜索学生姓名 / 学校 / 年级")}
            style={{ minWidth: 320, flex: "1 1 320px", padding: "9px 11px", border: "1px solid #cbd5e1", borderRadius: 10 }}
          />
          <button type="submit" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 800 }}>
            {t(lang, "Search", "搜索")}
          </button>
          <a href="/admin/students" style={{ fontWeight: 800 }}>
            {t(lang, "Open student list", "打开学生列表")}
          </a>
        </form>
        {q ? (
          <div style={{ display: "grid", gap: 8 }}>
            {students.length === 0 ? (
              <div style={{ color: "#92400e" }}>{t(lang, "No matching students found.", "没有找到匹配学生。")}</div>
            ) : (
              students.map((student) => (
                <div key={student.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {student.school ?? "-"} · {student.grade ?? "-"} · {student.packages.length > 0 ? t(lang, "has package", "已有课包") : t(lang, "no package yet", "暂无课包")}
                    </div>
                  </div>
                  <a href={`/admin/students/${encodeURIComponent(student.id)}/school-applications`} style={{ fontWeight: 800 }}>
                    {t(lang, "Open service workspace", "打开申请服务工作区")}
                  </a>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{t(lang, "Recent school application services", "最近学校申请服务")}</h2>
        {applications.length === 0 ? (
          <div style={{ color: "#64748b" }}>{t(lang, "No records yet.", "暂无记录。")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>{t(lang, "Student", "学生")}</th>
                  <th style={{ padding: 8 }}>{t(lang, "Status", "状态")}</th>
                  <th style={{ padding: 8 }}>{t(lang, "Schools", "学校数")}</th>
                  <th style={{ padding: 8 }}>{t(lang, "Total", "总额")}</th>
                  <th style={{ padding: 8 }}>{t(lang, "Invoice", "发票")}</th>
                  <th style={{ padding: 8 }}>{t(lang, "Created", "创建")}</th>
                  <th style={{ padding: 8 }}>{t(lang, "Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: 8 }}>
                      <div style={{ fontWeight: 800 }}>{app.student.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{app.package?.course.name ?? "-"}</div>
                    </td>
                    <td style={{ padding: 8 }}>{app.status}</td>
                    <td style={{ padding: 8 }}>{itemCount(app.applicationItemsJson)}</td>
                    <td style={{ padding: 8 }}>{money(app.totalAmount)}</td>
                    <td style={{ padding: 8 }}>{app.invoiceNo ?? "-"}</td>
                    <td style={{ padding: 8 }}>{formatBusinessDateTime(app.createdAt)}</td>
                    <td style={{ padding: 8 }}>
                      <a href={`/admin/students/${encodeURIComponent(app.studentId)}/school-applications?open=${encodeURIComponent(app.id)}`}>
                        {t(lang, "Open", "打开")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
