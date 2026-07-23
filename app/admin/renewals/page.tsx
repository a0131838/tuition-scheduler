import { getLang, t } from "@/lib/i18n";
import { listRenewalTasks, renewalTaskDto, syncRenewalTasks } from "@/lib/renewal-management";
import { requireRenewalCenterUser } from "@/lib/renewal-access";
import RenewalWorkbenchClient from "./RenewalWorkbenchClient";

export default async function RenewalWorkbenchPage() {
  const user = await requireRenewalCenterUser();
  const lang = await getLang();
  await syncRenewalTasks(user);
  const rows = await listRenewalTasks({ status: "OPEN", limit: 300 });
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
            "One package creates one open task. Academic operations owns parent follow-up; teachers cannot see this workbench or student balance.",
            "一个课包只生成一条开放任务。教务负责家长跟进；老师看不到本工作台，也看不到学生课时余额。"
          )}
        </p>
      </section>
      <RenewalWorkbenchClient initialTasks={rows.map(renewalTaskDto)} />
    </div>
  );
}
