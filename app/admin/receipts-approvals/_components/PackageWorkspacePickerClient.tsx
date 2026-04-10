"use client";

import { useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";

type PackageOption = {
  id: string;
  studentName: string;
  courseName: string;
  invoiceCount: number;
  receiptCount: number;
  paymentRecordCount: number;
  pendingApprovalCount: number;
  rejectedCount: number;
  pendingReceiptCount: number;
  searchText: string;
};

const STORAGE_KEY = "financeReceiptRecentPackages";
const MAX_RECENT = 6;

function getCopy(
  lang: "BILINGUAL" | "ZH" | "EN",
  en: string,
  zh: string
) {
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

function loadRecentIds() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

function pushRecentPackage(packageId: string) {
  const cleanId = String(packageId || "").trim();
  if (!cleanId) return;
  const current = loadRecentIds();
  saveRecentIds([cleanId, ...current.filter((id) => id !== cleanId)]);
}

function matchesSearch(search: string, option: PackageOption) {
  if (!search) return true;
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;
  return [
    option.studentName,
    option.courseName,
    option.id,
    option.searchText,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function buildOpenHref(basePath: string, packageId: string) {
  return `${basePath}?packageId=${encodeURIComponent(packageId)}`;
}

export default function PackageWorkspacePickerClient({
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
  const router = useRouter();
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(currentPackageId ?? "");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(appliedSearch);

  useEffect(() => {
    setSelectedPackageId(currentPackageId ?? "");
    if (!currentPackageId) {
      setRecentIds(loadRecentIds());
      return;
    }
    pushRecentPackage(currentPackageId);
    setRecentIds(loadRecentIds());
  }, [currentPackageId]);

  const filteredPackages = useMemo(() => {
    return packages.filter((option) => matchesSearch(deferredSearch, option));
  }, [packages, deferredSearch]);

  const suggestedPackages = useMemo(() => {
    return filteredPackages.slice(0, deferredSearch ? 12 : 8);
  }, [filteredPackages, deferredSearch]);

  const recentPackages = useMemo(() => {
    const map = new Map(packages.map((pkg) => [pkg.id, pkg]));
    return recentIds.map((id) => map.get(id)).filter(Boolean) as PackageOption[];
  }, [packages, recentIds]);

  const labels = {
    intro: getCopy(
      lang,
      "When packages get crowded, search by student, course, invoice no., receipt no., or package ID below. Search stays on this page now, and only opening a package will navigate away.",
      "当课包很多时，可以直接按学生、课程、发票号、收据号或课包ID搜索。现在搜索只在当前页面筛选，只有真正打开课包时才会跳转。"
    ),
    search: getCopy(lang, "Search package", "搜索课包"),
    placeholder: getCopy(
      lang,
      "Search student / course / invoice / receipt / package id",
      "搜索学生 / 课程 / 发票 / 收据 / 课包ID"
    ),
    applySearch: getCopy(lang, "Search", "搜索"),
    clearSearch: getCopy(lang, "Clear", "清除"),
    quickSelect: getCopy(lang, "Quick Select Package", "快捷选择课包"),
    selectHint: getCopy(lang, "Select package to open finance operations", "选择课包以打开财务操作"),
    openFinance: getCopy(lang, "Open Finance Operations", "打开财务操作"),
    searchMatches: getCopy(lang, "Search matches", "搜索结果"),
    priorityList: getCopy(lang, "Priority package list", "优先处理课包"),
    noMatch: getCopy(lang, "No package matched the current search yet.", "当前搜索下还没有匹配到课包。"),
    recent: getCopy(lang, "Recently opened packages", "最近打开的课包"),
    recentHelper: getCopy(
      lang,
      "Your latest package openings stay here so you can jump back quickly without searching again.",
      "这里会保留你最近打开过的课包，反复处理同几个学生时可以直接回到上一次。"
    ),
    clearRecent: getCopy(lang, "Clear recent", "清空最近记录"),
    reopen: getCopy(lang, "Open again", "重新打开"),
    waiting: getCopy(lang, "Waiting approval", "待审批"),
    needReceipt: getCopy(lang, "Need receipt", "待建收据"),
    rejected: getCopy(lang, "Rejected", "已驳回"),
    proofs: getCopy(lang, "Proofs", "凭证"),
    invoices: getCopy(lang, "Invoices", "发票"),
    receipts: getCopy(lang, "Receipts", "收据"),
    openPackage: getCopy(lang, "Open package", "打开课包"),
  };

  const openPackage = (packageId: string) => {
    const cleanId = String(packageId || "").trim();
    if (!cleanId) return;
    pushRecentPackage(cleanId);
    setRecentIds(loadRecentIds());
    startTransition(() => {
      router.push(buildOpenHref(basePath, cleanId), { scroll: false });
    });
  };

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{labels.intro}</div>
      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6, minWidth: 0, width: "100%" }}>
          {labels.search}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setAppliedSearch(draftSearch.trim());
                }
              }}
              placeholder={labels.placeholder}
              style={{ width: "100%", minWidth: 260, maxWidth: 520 }}
            />
            <button type="button" onClick={() => setAppliedSearch(draftSearch.trim())}>
              {labels.applySearch}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftSearch("");
                setAppliedSearch("");
              }}
            >
              {labels.clearSearch}
            </button>
          </div>
        </label>
        <label style={{ display: "grid", gap: 6, minWidth: 0, width: "100%" }}>
          {labels.quickSelect}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
              style={{ width: "100%", minWidth: 260, maxWidth: 520 }}
            >
              <option value="">{labels.selectHint}</option>
              {filteredPackages.map((option) => (
                <option key={option.id} value={option.id}>
                  {`${option.studentName} | ${option.courseName} | ${option.id.slice(0, 8)}... | ${labels.proofs} ${option.paymentRecordCount}, ${labels.invoices} ${option.invoiceCount}, ${labels.receipts} ${option.receiptCount}, ${labels.waiting} ${option.pendingApprovalCount}`}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => openPackage(selectedPackageId)} disabled={!selectedPackageId}>
              {labels.openFinance}
            </button>
          </div>
        </label>
      </div>

      {recentPackages.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 700 }}>{labels.recent}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{labels.recentHelper}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                saveRecentIds([]);
                setRecentIds([]);
              }}
            >
              {labels.clearRecent}
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
                    <span>{labels.waiting}: {option.pendingApprovalCount}</span>
                    <span>{labels.needReceipt}: {option.pendingReceiptCount}</span>
                    <span>{labels.rejected}: {option.rejectedCount}</span>
                    <span>{labels.proofs}: {option.paymentRecordCount}</span>
                  </div>
                </div>
                <button type="button" onClick={() => openPackage(option.id)}>
                  {labels.reopen}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>
          {deferredSearch ? labels.searchMatches : labels.priorityList}
        </div>
        {suggestedPackages.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13 }}>{labels.noMatch}</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {suggestedPackages.map((option) => (
              <div
                key={`package-open-${option.id}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: option.pendingApprovalCount > 0 || option.pendingReceiptCount > 0 ? "#f8fbff" : "#fff",
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
                    <span>{labels.waiting}: {option.pendingApprovalCount}</span>
                    <span>{labels.needReceipt}: {option.pendingReceiptCount}</span>
                    <span>{labels.rejected}: {option.rejectedCount}</span>
                    <span>{labels.proofs}: {option.paymentRecordCount}</span>
                  </div>
                </div>
                <button type="button" onClick={() => openPackage(option.id)}>
                  {labels.openPackage}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
