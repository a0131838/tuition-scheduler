import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findTrainingModule } from "@/lib/training-center";
import { redirect } from "next/navigation";
import { reviewTrainingPractical } from "../actions";

export default async function TrainingManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await isManagerUser(user))) redirect("/training");
  const rows = await prisma.staffTrainingProgress.findMany({
    include: { user: { select: { name: true, email: true, role: true } }, approvedBy: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh" }}>
      <h1>培训主管验收台</h1>
      <p><a href="/training">返回我的培训</a> · <a href="/training/coverage">查看全系统操作覆盖图</a></p>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((row) => {
          const item = findTrainingModule(row.moduleCode);
          const ready = Boolean(row.readAt && row.quizPassedAt && row.practicalStatus === "SUBMITTED");
          return (
            <section key={row.id} style={{ border: "1px solid #dbe5ef", borderRadius: 16, padding: 16, background: "white" }}>
              <strong>{row.user.name || row.user.email} · {item?.title ?? row.moduleCode}</strong>
              <p>角色：{row.user.role} · 阅读：{row.readAt ? "完成" : "未完成"} · 测验：{row.quizScore ?? "-"} · 实操：{row.practicalStatus}</p>
              {row.practicalEvidence ? <p>实操证据：{row.practicalEvidence}</p> : null}
              {ready ? (
                <form action={reviewTrainingPractical} style={{ display: "grid", gap: 8 }}>
                  <input type="hidden" name="progressId" value={row.id} />
                  <textarea name="note" rows={2} placeholder="验收意见或返工要求" />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button name="decision" value="APPROVED">通过验收</button>
                    <button name="decision" value="NEEDS_REWORK">退回重做</button>
                  </div>
                </form>
              ) : <small>员工完成阅读、80分测验和实操提交后才可验收。</small>}
            </section>
          );
        })}
      </div>
    </main>
  );
}
