"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TrainingRole = "ADMIN" | "FINANCE" | "SALES" | "CS" | "TEACHER";

const ROLE_LABELS: Record<TrainingRole, string> = {
  ADMIN: "管理／教务",
  FINANCE: "财务",
  SALES: "销售",
  CS: "客服／教务助理",
  TEACHER: "老师",
};

export default function UserTrainingRoleFormClient({
  userId,
  primaryRole,
  current,
}: {
  userId: string;
  primaryRole: string;
  current: TrainingRole[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TrainingRole[]>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (primaryRole === "STUDENT") return <span style={{ color: "#64748b" }}>不适用</span>;

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 170 }}>
      <small style={{ color: "#475569" }}>主角色 {primaryRole} 已自动包含</small>
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
          {ROLE_LABELS[role]}{role === primaryRole ? "（主）" : ""}
        </label>
      ))}
      {error ? <small style={{ color: "#b91c1c" }}>错误：{error}</small> : null}
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
        {busy ? "保存中..." : "保存培训岗位"}
      </button>
    </div>
  );
}
