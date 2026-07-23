import { getLang, t } from "@/lib/i18n";
import { getRenewalCohortCounts, listRenewalTasks, renewalTaskDto, syncRenewalTasks } from "@/lib/renewal-management";
import { requireRenewalCenterUser } from "@/lib/renewal-access";
import RenewalWorkbenchClient from "./RenewalWorkbenchClient";

export default async function RenewalWorkbenchPage() {
  const user = await requireRenewalCenterUser();
  const lang = await getLang();
  await syncRenewalTasks(user);
  const [rows, cohortCounts] = await Promise.all([
    listRenewalTasks({ status: "OPEN", cohort: "BOSS_OTHER", limit: 300 }),
    getRenewalCohortCounts("OPEN"),
  ]);
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          borderTop: "6px solid #f45b05",
          padding: "22px 24px",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 10px 28px rgba(15,23,42,.07)",
        }}
      >
        <div style={{ color: "#c2410c", fontSize: 12, fontWeight: 900, letterSpacing: 0.8 }}>
          {t(lang, "STUDENT RETENTION", "学生续费")}
        </div>
        <h1 style={{ margin: "8px 0 6px", fontSize: 30 }}>
          {t(lang, "Renewal follow-up workbench", "续费跟进工作台")}
        </h1>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
          {t(
            lang,
            "Boss/other students and New Oriental students are handled in separate queues. Teachers cannot see this workbench or student balance.",
            "博思及其他学生与新东方学生分队列处理。新东方先对接项目负责人；老师看不到本工作台，也看不到学生课时余额。"
          )}
        </p>
      </section>
      <RenewalWorkbenchClient initialTasks={rows.map(renewalTaskDto)} initialCohortCounts={cohortCounts} />
    </div>
  );
}
