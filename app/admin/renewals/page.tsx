import { getLang, t } from "@/lib/i18n";
import { getRenewalCohortCounts, listRenewalTasks, renewalTaskDto, syncRenewalTasks } from "@/lib/renewal-management";
import { requireRenewalCenterUser } from "@/lib/renewal-access";
import RenewalWorkbenchClient from "./RenewalWorkbenchClient";

export default async function RenewalWorkbenchPage() {
  const user = await requireRenewalCenterUser();
  const lang = await getLang();
  if (!user.isObserver) await syncRenewalTasks(user);
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
        <h1 style={{ margin: 0, fontSize: 30 }}>
          {t(lang, "Renewal follow-up", "续费跟进")}
        </h1>
      </section>
      <RenewalWorkbenchClient
        initialTasks={rows.map(renewalTaskDto)}
        initialCohortCounts={cohortCounts}
        operationsOnly={user.operationsAdmin}
      />
    </div>
  );
}
