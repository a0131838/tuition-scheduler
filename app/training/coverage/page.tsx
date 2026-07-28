import Link from "next/link";
import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { OPERATION_AREAS } from "@/lib/training-operation-coverage";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";

const AREA_EN: Record<string, { title: string; owners: string; outcome: string }> = {
  ACCESS: { title: "Login, Home, and System Entry", owners: "All Staff", outcome: "Use the correct staff account and workspace; students and signed-out users cannot enter internal training." },
  TRAINING: { title: "Staff Training, Quiz, and Manager Sign-off", owners: "All Staff / Managers", outcome: "Complete the current-version reading, 80% quiz, practical evidence, and manager sign-off." },
  SCHOOL_APPLICATION: { title: "School Applications and External Signing", owners: "Academic / Management", outcome: "Maintain one complete status chain from setup and documents through agreement, billing, and archive." },
  COMMUNICATION: { title: "Parent Communication, Teacher Notices, and Feedback Oversight", owners: "Academic / Teachers / Management", outcome: "Publish reviewed content to the correct audience and retain forwarding, correction, acknowledgement, and audit records." },
  REPORTING: { title: "Teaching Reports, Quality, and Audit Reports", owners: "Teachers / Academic / Management / Finance", outcome: "Prepare, review, publish, or export reports by responsibility, with traceable exceptions." },
  LEADS_GUIDE: { title: "Leads, School Guide Enquiries, and Sales Handover", owners: "Sales / CS / Academic", outcome: "Complete duplicate checking, follow-up, assessment, ownership, conversion, and handover." },
  WORK_CONTROL: { title: "Tickets, To-dos, Reminders, Approvals, and Recovery", owners: "Academic / Management / Finance", outcome: "Every task has an owner, status, due date, completion result, handover, and exception escalation." },
  EDUTRUST: { title: "EduTrust Courses, SSG Contracts, and Student Evidence", owners: "Academic / Management", outcome: "Pass readiness checks before signing and archiving evidence." },
  CARE: { title: "Full Care Plans, Delivery, Risks, and Reports", owners: "Academic / Management", outcome: "Close the loop for plans, activities, tasks, risks, coverage, and reports within one student project." },
  FINANCE: { title: "Finance, Receipt Approval, Payroll, Claims, and Partners", owners: "Finance / Management", outcome: "Reconcile invoices, payment proof, receipts, approvals, payroll, claims, and partner bills with an auditable trail." },
  PACKAGES_CONTRACTS: { title: "Contracts, Packages, Billing, and Balance Ledgers", owners: "Academic / Finance", outcome: "Complete the contract, invoice approval, package, and scheduling gate before scheduling handover." },
  SCHEDULING: { title: "Scheduling, Classes, Enrolment, Availability, and Attendance", owners: "Academic / Teachers", outcome: "Close the loop from availability and conflict checks through confirmed sessions, attendance, feedback, and exceptions." },
  STUDENTS: { title: "Student Records, Intake, and Academic Coordination", owners: "Academic / CS", outcome: "Move student data from external intake through internal setup, course and contract preparation, and service handover." },
  TEACHERS: { title: "Teacher Records, Schedules, Availability, Teaching, and Payments", owners: "Teachers / Academic / Management", outcome: "Keep teacher profile, eligible courses, availability, sessions, feedback, reports, payroll, and payment details consistent." },
  MANAGEMENT: { title: "Accounts, Permissions, Master Data, and Mini Program Management", owners: "Management", outcome: "System permissions follow the primary role; training roles remain separate; master-data changes have an owner and review." },
  DASHBOARD: { title: "Admin and Mobile Workspaces", owners: "Academic / CS / Sales / Finance / Management", outcome: "Staff enter tasks, reminders, and workflows from the correct role workspace without crossing permission boundaries." },
};

export default async function TrainingCoveragePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await isManagerUser(user))) redirect("/training");
  const lang = await getLang();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh", color: "#172033" }}>
      <section style={{ border: "1px solid #dbe5ef", borderRadius: 18, padding: 18, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)" }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>OPERATION COVERAGE / 操作覆盖</div>
        <h1>{t(lang, "Full-System Operations Coverage", "全系统操作流程覆盖图")}</h1>
        <p>{t(lang, `All visible pages are grouped by business outcome into ${OPERATION_AREAS.length} main workflows. Detailed SOPs, master SOPs, and system guides provide coverage without duplicating one PDF per page.`, `系统可见页面按业务结果归入 ${OPERATION_AREAS.length} 条主流程。详细 SOP、主 SOP 和系统指引共同覆盖，不按“一个页面一份 PDF”重复制作。`)}</p>
        <p><Link href="/training">{t(lang, "Back to Training Centre", "返回培训中心")}</Link> · <a href="/api/training/sops/SYSTEM_OPERATION_MAP" target="_blank">{t(lang, "Open Bilingual Operations Map PDF", "打开中英双语流程地图 PDF")}</a></p>
      </section>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {OPERATION_AREAS.map((area) => (
          <section key={area.code} style={{ border: "1px solid #dbe5ef", borderRadius: 16, padding: 16, background: "white" }}>
            <strong>{t(lang, AREA_EN[area.code].title, area.title)}</strong>
            <p style={{ color: "#475569" }}>{t(lang, "Owners", "负责人")}：{t(lang, AREA_EN[area.code].owners, area.owners.join(" / "))} · {t(lang, "Coverage Level", "覆盖等级")}：{area.level}</p>
            <p>{t(lang, AREA_EN[area.code].outcome, area.outcome)}</p>
            <small>{t(lang, "Entry Points", "入口")}：{area.routePrefixes.join("、")}<br />{t(lang, "Modules", "对应模块")}：{area.moduleCodes.join("、")}</small>
          </section>
        ))}
      </div>
    </main>
  );
}
