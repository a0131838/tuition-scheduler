import Link from "next/link";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function TeacherRenewalReportsPage() {
  const { teacher } = await requireTeacherProfile();
  const lang = await getLang();
  const rows = await prisma.renewalProgressReport.findMany({ where: { teacherId: teacher.id }, include: { student: { select: { name: true } }, package: { include: { course: { select: { name: true } } } } }, orderBy: { assignedAt: "desc" }, take: 100 });
  return <main style={{ maxWidth: 1000, margin: "30px auto", padding: 20, display: "grid", gap: 16 }}>
    <h1>{t(lang, "Renewal Progress Reports", "续费前学习进展报告")}</h1>
    <p>{t(lang, "Reports are assigned to the actual teaching teacher. Fill in your observations and submit before the family renewal discussion.", "教务会指派实际授课老师。请根据真实教学情况填写并在续费沟通前提交。")}</p>
    {rows.length ? rows.map(row => <Link key={row.id} href={`/teacher/renewal-reports/${row.id}`} style={{ padding: 18, border: "1px solid #d8e3e7", borderRadius: 12, textDecoration: "none", color: "#17324d", background: "white" }}>
      <strong>{row.student.name}</strong> · {row.package.course.name} · {row.status} · {row.assignedAt.toLocaleDateString("en-SG")}
    </Link>) : <p>{t(lang, "No reports assigned yet.", "目前没有分配给你的报告。")}</p>}
  </main>;
}
