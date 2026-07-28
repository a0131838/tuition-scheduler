"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TrainingRole = "ADMIN" | "FINANCE" | "SALES" | "CS" | "TEACHER";
type Lang = "BILINGUAL" | "ZH" | "EN";

const ROLE_LABELS: Record<TrainingRole, { en: string; zh: string }> = {
  ADMIN: { en: "Management / Academic", zh: "管理／教务" },
  FINANCE: { en: "Finance", zh: "财务" },
  SALES: { en: "Sales", zh: "销售" },
  CS: { en: "CS / Academic Assistant", zh: "客服／教务助理" },
  TEACHER: { en: "Teacher", zh: "老师" },
};

export default function UserTrainingRoleFormClient({
  userId,
  primaryRole,
  current,
  language,
}: {
  userId: string;
  primaryRole: string;
  current: TrainingRole[];
  language: Lang;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TrainingRole[]>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const text = (en: string, zh: string) => language === "EN" ? en : language === "ZH" ? zh : `${en} / ${zh}`;

  if (primaryRole === "STUDENT") return <span style={{ color: "#64748b" }}>{text("Not applicable", "不适用")}</span>;

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 170 }}>
      <small style={{ color: "#475569" }}>{text(`Primary role ${primaryRole} is included automatically`, `主角色 ${primaryRole} 已自动包含`)}</small>
      {(Object.keys(ROLE_LABELS) as TrainingRole[]).map((role) => (
        <label key={role} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={role === primaryRole || selected.includes(role)}
            disabled={busy || role === primaryRole}
            onChange={(event) =>
              setSelected((roles) =>
                event.target.checked ? Array.from(new Set([...roles, role])) : roles.filter((item) => item !== role)
              )
            }
          />
          {text(ROLE_LABELS[role].en, ROLE_LABELS[role].zh)}{role === primaryRole ? text(" (Primary)", "（主）") : ""}
        </label>
      ))}
      {error ? <small style={{ color: "#b91c1c" }}>{text("Error", "错误")}：{error}</small> : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch(`/api/admin/manager/users/${encodeURIComponent(userId)}/training-roles`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ roles: selected }),
            });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!response.ok || !data?.ok) {
              setError(data?.message ?? `Request failed (${response.status})`);
              return;
            }
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? text("Saving...", "保存中...") : text("Save Training Roles", "保存培训岗位")}
      </button>
    </div>
  );
}
