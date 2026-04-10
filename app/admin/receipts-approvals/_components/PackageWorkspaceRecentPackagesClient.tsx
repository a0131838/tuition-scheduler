"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PackageOption = {
  id: string;
  studentName: string;
  courseName: string;
  pendingApprovalCount: number;
  pendingReceiptCount: number;
  rejectedCount: number;
  paymentRecordCount: number;
};

const STORAGE_KEY = "financeReceiptRecentPackages";
const MAX_RECENT = 6;

function buildOpenHref(basePath: string, packageId: string) {
  return `${basePath}?packageId=${encodeURIComponent(packageId)}`;
}

function recordRecentPackage(packageId: string) {
  if (typeof window === "undefined") return;
  const cleanId = String(packageId || "").trim();
  if (!cleanId) return;
  const current = (() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  })();
  const next = [cleanId, ...current.filter((id) => id !== cleanId)].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export default function PackageWorkspaceRecentPackagesClient({
  lang,
  basePath,
  currentPackageId,
  packages,
}: {
  lang: "BILINGUAL" | "ZH" | "EN";
  basePath: string;
  currentPackageId?: string;
  packages: PackageOption[];
}) {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadRecent = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setRecentIds(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        setRecentIds([]);
      }
    };

    if (currentPackageId) {
      recordRecentPackage(currentPackageId);
    }
    loadRecent();

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest("[data-package-open-id]");
      if (!trigger) return;
      const packageId = trigger.getAttribute("data-package-open-id");
      if (!packageId) return;
      recordRecentPackage(packageId);
      loadRecent();
    };

    const handleSubmit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (target.getAttribute("data-package-open-form") !== "1") return;
      const packageField = target.elements.namedItem("packageId");
      if (!(packageField instanceof HTMLSelectElement)) return;
      recordRecentPackage(packageField.value);
      loadRecent();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [currentPackageId]);

  const recentPackages = useMemo(() => {
    const map = new Map(packages.map((pkg) => [pkg.id, pkg]));
    return recentIds.map((id) => map.get(id)).filter(Boolean) as PackageOption[];
  }, [packages, recentIds]);

  if (recentPackages.length === 0) {
    return null;
  }

  const text = {
    heading:
      lang === "ZH" ? "最近打开的课包" : lang === "EN" ? "Recently opened packages" : "Recently opened packages / 最近打开的课包",
    helper:
      lang === "ZH"
        ? "这里会保留你最近处理过的课包，反复来回处理时可以直接回到上一次。"
        : lang === "EN"
          ? "Your most recently opened finance packages stay here so you can jump back quickly."
          : "Your most recently opened finance packages stay here so you can jump back quickly. / 这里会保留你最近处理过的课包，反复来回处理时可以直接回到上一次。",
    waiting: lang === "ZH" ? "待审批" : lang === "EN" ? "Waiting approval" : "Waiting approval / 待审批",
    needReceipt: lang === "ZH" ? "待建收据" : lang === "EN" ? "Need receipt" : "Need receipt / 待建收据",
    rejected: lang === "ZH" ? "已驳回" : lang === "EN" ? "Rejected" : "Rejected / 已驳回",
    proofs: lang === "ZH" ? "凭证" : lang === "EN" ? "Proofs" : "Proofs / 凭证",
    open: lang === "ZH" ? "重新打开" : lang === "EN" ? "Open again" : "Open again / 重新打开",
    clear: lang === "ZH" ? "清空最近记录" : lang === "EN" ? "Clear recent" : "Clear recent / 清空最近记录",
  };

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{text.heading}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>{text.helper}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.removeItem(STORAGE_KEY);
            setRecentIds([]);
          }}
          style={{ background: "#fff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999, padding: "6px 10px", fontWeight: 700 }}
        >
          {text.clear}
        </button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {recentPackages.map((option) => (
          <div
            key={`recent-package-${option.id}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>
                {option.studentName} | {option.courseName}
              </div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{option.id}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#475569" }}>
                <span>{text.waiting}: {option.pendingApprovalCount}</span>
                <span>{text.needReceipt}: {option.pendingReceiptCount}</span>
                <span>{text.rejected}: {option.rejectedCount}</span>
                <span>{text.proofs}: {option.paymentRecordCount}</span>
              </div>
            </div>
            <Link
              href={buildOpenHref(basePath, option.id)}
              data-package-open-id={option.id}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "1px solid #1d4ed8",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {text.open}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
