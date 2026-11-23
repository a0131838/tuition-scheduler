"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import {
  NETWORK_KINDS,
  kindLabel,
  networkText as tr,
  type NetworkNode,
  type NetworkStore,
  type NetworkView,
  type NetworkChoice,
  type NetworkEdge,
  type NetworkCandidate,
} from "@/lib/sales-network-types";
import {
  commitNetworkAction,
  editNetworkAction,
  inspectPdfAction,
  maintainNetworkAction,
} from "./actions";
import { activeNetwork, networkBounds } from "@/lib/sales-network-layout";
import { MaintenancePanel, NodeMaintenance } from "./NetworkMaintenance";
import CandidatePicker from "./CandidatePicker";
import css from "./NetworkWorkspace.module.css";
function safeDate(v: string | null | undefined) {
  return v
    ? new Intl.DateTimeFormat("en-SG", {
        timeZone: "Asia/Singapore",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
}
function edgePath(e: NetworkEdge, nodes: NetworkNode[]) {
  const a = nodes.find((n) => n.id === e.from)!,
    b = nodes.find((n) => n.id === e.to)!;
  if (e.style === "PIPELINE") {
    const startX = a.x + 137,
      startY = a.y + (a.kind === "ROOT" ? 104 : 82);
    return `M ${startX} ${startY} V ${Math.max(startY + 60, b.y - 50)} H ${b.x + 137} V ${b.y}`;
  }
  if (a.x === b.x) return `M ${a.x + 137} ${a.y + 82} V ${b.y}`;
  const x1 = a.x + 274,
    y1 = a.y + (a.kind === "ROOT" ? 52 : 41),
    x2 = b.x,
    y2 = b.y + 41;
  return `M ${x1} ${y1} C ${x1 + 70} ${y1},${x2 - 70} ${y2},${x2} ${y2}`;
}
export default function NetworkWorkspace({
  lang,
  view,
  preview,
  defaults,
  suggestions,
  readOnly,
  canLinkStudent,
}: {
  lang: Lang;
  view: NetworkView | null;
  preview: NetworkStore;
  defaults: string[];
  suggestions: Record<string, NetworkCandidate[]>;
  readOnly: boolean;
  canLinkStudent: boolean;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh),
    fullStore = view?.store ?? preview;
  const [includeArchived, setIncludeArchived] = useState(false),
    [maintenanceOpen, setMaintenanceOpen] = useState(false),
    [maintenanceParent, setMaintenanceParent] = useState("");
  const store = useMemo(
    () => activeNetwork(fullStore, includeArchived),
    [fullStore, includeArchived],
  );
  const { width: WIDTH, height: HEIGHT } = networkBounds(store);
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [focus, setFocus] = useState("all"),
    [zoom, setZoom] = useState(0.65),
    [list, setList] = useState(false),
    [full, setFull] = useState(false),
    [importOpen, setImportOpen] = useState(!view),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("node")) {
      const id = params.get("node")!;
      setSelected(id);
      if (fullStore.nodes.find((n) => n.id === id)?.archived) {
        setIncludeArchived(true);
        setList(true);
      }
    }
    if (params.has("imported"))
      setNotice(
        t(
          "PDF imported. The map is saved; existing students were not duplicated.",
          "PDF已导入，地图已保存，未重复创建已有学生。",
        ),
      );
    else if (params.has("saved"))
      setNotice(t("Review saved.", "核对结果已保存。"));
  }, []);
  const canvas = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number } | null>(
      null,
    );
  useEffect(() => {
    const target = fullStore.nodes.find((n) => n.id === selected);
    if (target && canvas.current && !list) {
      canvas.current.scrollTo({
        left: Math.max(0, target.x * zoom - 80),
        top: Math.max(0, target.y * zoom - 90),
        behavior: "smooth",
      });
    }
  }, [selected, list]);
  useEffect(() => {
    if (!full) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [full]);
  const matches = useMemo(
    () =>
      new Set(
        store.nodes
          .filter((n) =>
            [n.name, n.sourceStatus, n.note].some((v) =>
              v.toLowerCase().includes(query.toLowerCase().trim()),
            ),
          )
          .map((n) => n.id),
      ),
    [query, store],
  );
  const branch = useMemo(() => {
    if (focus === "all") return new Set(store.nodes.map((n) => n.id));
    const set = new Set([focus]);
    if (focus === "pipeline") {
      store.edges
        .filter((e) => e.style === "PIPELINE")
        .forEach((e) => set.add(e.to));
      return set;
    }
    let change = true;
    while (change) {
      change = false;
      store.edges
        .filter((e) => e.from !== "nlcs" || e.to !== "keystone")
        .forEach((e) => {
          if (set.has(e.from) && !set.has(e.to)) {
            set.add(e.to);
            change = true;
          }
        });
    }
    return set;
  }, [focus, store]);
  const active = new Set(
    store.nodes
      .filter((n) => matches.has(n.id) && branch.has(n.id))
      .map((n) => n.id),
  );
  const node = fullStore.nodes.find((n) => n.id === selected),
    live = view?.live[selected];
  const linked = store.nodes.filter(
    (n) => n.studentId || n.leadId || n.relationshipId,
  ).length;
  const reset = () => {
    setQuery("");
    setFocus("all");
    setSelected("");
  };
  const fit = () => {
    if (canvas.current) {
      setZoom(
        Math.max(0.25, Math.min(1, (canvas.current.clientWidth - 36) / WIDTH)),
      );
      canvas.current.scrollTo({ top: 0, left: 0 });
    }
  };
  function exportSvg() {
    const ns = "http://www.w3.org/2000/svg",
      svg = document.createElementNS(ns, "svg");
    svg.setAttribute("xmlns", ns);
    svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT + 100}`);
    svg.setAttribute("width", String(WIDTH));
    svg.setAttribute("height", String(HEIGHT + 100));
    function el(tag: string, attrs: Record<string, string>, text?: string) {
      const e = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      if (text) e.textContent = text;
      svg.appendChild(e);
      return e;
    }
    el("rect", { width: "100%", height: "100%", fill: "#f6f8f9" });
    el(
      "text",
      {
        x: "30",
        y: "32",
        "font-family": "Arial",
        "font-size": "22",
        fill: "#172b3a",
      },
      "GT · Relationship network",
    );
    el(
      "text",
      {
        x: "30",
        y: "58",
        "font-family": "Arial",
        "font-size": "13",
        fill: "#677785",
      },
      `${store.sourceName} · ${view ? "Saved / 已保存" : "Preview / 预览"} · ${t("Connections require review", "连线需业务核对")}`,
    );
    const g = document.createElementNS(ns, "g");
    g.setAttribute("transform", "translate(0 90)");
    svg.appendChild(g);
    store.edges.forEach((e) => {
      const p = document.createElementNS(ns, "path");
      Object.entries({
        d: edgePath(e, store.nodes),
        fill: "none",
        stroke: "#a9b9c3",
        "stroke-width": "1.5",
        "stroke-dasharray":
          e.style === "DIRECT" ? "" : e.style === "PIPELINE" ? "2 7" : "6 5",
      }).forEach(([k, v]) => p.setAttribute(k, v));
      g.appendChild(p);
      if (
        e.style !== "PIPELINE" &&
        !["listed connection", "relationship network"].includes(e.label)
      ) {
        const a = store.nodes.find((n) => n.id === e.from)!,
          b = store.nodes.find((n) => n.id === e.to)!;
        const text = document.createElementNS(ns, "text");
        Object.entries({
          x: String(a.x === b.x ? a.x + 142 : (a.x + 274 + b.x) / 2),
          y: String(a.x === b.x ? (a.y + b.y + 82) / 2 : (a.y + b.y) / 2 + 33),
          "text-anchor": a.x === b.x ? "start" : "middle",
          "font-size": "10",
          "font-family": "Arial, sans-serif",
          fill: "#748592",
        }).forEach(([k, v]) => text.setAttribute(k, v));
        text.textContent = e.label;
        g.appendChild(text);
      }
    });
    store.nodes.forEach((n) => {
      const r = document.createElementNS(ns, "rect");
      Object.entries({
        x: String(n.x),
        y: String(n.y),
        width: "274",
        height: n.kind === "ROOT" ? "104" : "82",
        rx: "9",
        fill:
          n.kind === "ROOT"
            ? "#254c57"
            : n.kind === "INSTITUTION"
              ? "#edf2fb"
              : n.kind === "PARENT"
                ? "#edf6f1"
                : n.sourceStatus === "prospect"
                  ? "#fff7e9"
                  : "#fff",
        stroke: "#9eafb9",
      }).forEach(([k, v]) => r.setAttribute(k, v));
      g.appendChild(r);
      const words = n.name.match(/.{1,29}(?:\s|$)|.{1,29}/g) ?? [n.name];
      words.slice(0, 2).forEach((word, i) => {
        const tx = document.createElementNS(ns, "text");
        Object.entries({
          x: String(n.x + 14),
          y: String(n.y + 27 + i * 20),
          "font-size": "14",
          "font-family": "Arial, sans-serif",
          fill: n.kind === "ROOT" ? "white" : "#172b3a",
        }).forEach(([k, v]) => tx.setAttribute(k, v));
        tx.textContent = word;
        g.appendChild(tx);
      });
      const tx = document.createElementNS(ns, "text");
      Object.entries({
        x: String(n.x + 14),
        y: String(n.y + 70),
        "font-size": "10",
        "font-family": "Arial, sans-serif",
        fill: "#677785",
      }).forEach(([k, v]) => tx.setAttribute(k, v));
      tx.textContent = (n.sourceStatus || kindLabel(lang, n.kind)).slice(0, 48);
      g.appendChild(tx);
    });
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "gt-relationship-network.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className={`${css.workspace} ${full ? css.full : ""}`}>
      <header className={css.top}>
        <div>
          <div className={css.eyebrow}>
            GT EDUCATIONAL INSTITUTE · SALES & RELATIONSHIPS
          </div>
          <h1>{t("Relationship map", "关系地图")}</h1>
          <p>
            {t(
              "Explore connections, review identities and open the latest follow-up records.",
              "查看人脉连接、核对身份，直接进入最新跟进记录。",
            )}
          </p>
        </div>
        <div className={css.actions}>
          <a className={css.linkButton} href="/admin/relationships">
            {t("Relationship records", "关系档案")}
          </a>
          <button type="button" onClick={exportSvg}>
            {t("Export map", "导出地图")}
          </button>
          {view && !readOnly ? (
            <button
              className={css.primary}
              onClick={() => {
                setMaintenanceParent(selected);
                setMaintenanceOpen((v) => !v);
              }}
            >
              {t("Add / connect", "新增／连接")}
            </button>
          ) : null}
          {!readOnly ? (
            <button
              className={css.primary}
              onClick={() => setImportOpen((v) => !v)}
            >
              {view
                ? t("Import history", "导入记录")
                : t("Review PDF import", "核对PDF导入")}
            </button>
          ) : null}
        </div>
      </header>
      {error ? (
        <p role="alert" className={css.alert}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className={css.success}>
          {notice}
        </p>
      ) : null}
      {readOnly ? (
        <p className={css.readOnly}>
          {t("Observer mode · read only", "观察者模式·只读")}
        </p>
      ) : null}
      {importOpen && !readOnly ? (
        <ImportPanel
          lang={lang}
          preview={preview}
          defaults={defaults}
          suggestions={suggestions}
          saved={Boolean(view)}
          canLinkStudent={canLinkStudent}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
      {maintenanceOpen && view && !readOnly ? (
        <MaintenancePanel
          key={maintenanceParent}
          lang={lang}
          store={fullStore}
          parentId={maintenanceParent}
          canLinkStudent={canLinkStudent}
          onClose={() => setMaintenanceOpen(false)}
        />
      ) : null}
      <details className={css.help}>
        <summary>
          {t(
            "How to add students and partners later",
            "后续怎样新增学生和合作方",
          )}
        </summary>
        <ol>
          <li>
            {t(
              "Use Add / connect. Search and select an existing exact record first. If it is already on the map, add another connection to the same node.",
              "点击“新增／连接”，优先搜索并选择已有档案；如果已在地图上，就给同一节点增加连线。",
            )}
          </li>
          <li>
            {t(
              "For a new prospective student, create a student opportunity; an enrolled student profile is created only by the existing handoff workflow. A map-only person can remain unconfirmed.",
              "新学生先建学生商机，后续沿用现有承接流程建立学生档案；身份不明可先只保留地图节点。",
            )}
          </li>
          <li>
            {t(
              "For a new partner, create or reuse its relationship profile. Manage cooperation projects and follow-ups through that profile.",
              "新合作方可新建或复用关系档案，进入该档案维护合作项目和跟进。",
            )}
          </li>
          <li>
            {t(
              "Click a node to edit its display identity, review connection labels, archive/restore objects, or open CRM follow-ups. Refresh the map for current CRM status. No new PDF is needed.",
              "点击节点可改名称、核对关系、归档／恢复，或进入业务档案跟进。刷新地图读取最新进展，无需重新制作PDF。",
            )}
          </li>
        </ol>
      </details>
      <div className={css.summary}>
        <div>
          <strong>{store.nodes.length - 1}</strong>
          {t("people & institutions", "人员与机构节点")}
        </div>
        <div>
          <strong>{store.edges.length}</strong>
          {t("connections", "关系连接")}
        </div>
        <div>
          <strong>{linked}</strong>
          {t("linked CRM records", "已关联档案节点")}
        </div>
        <div>
          <strong>{store.edges.filter((e) => !e.confirmed).length}</strong>
          {t("connections to review", "待核对连线")}
        </div>
        <div style={{ marginLeft: "auto" }}>
          {view
            ? t("Saved · live CRM details", "已保存·读取最新业务资料")
            : t("PDF preview · not imported", "PDF预览·尚未导入")}
        </div>
      </div>
      <div className={css.toolbar}>
        <input
          className={css.search}
          aria-label={t("Search network", "搜索关系地图")}
          placeholder={t("Search a person or institution…", "搜索人员或机构…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={t("Branch", "分支")}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        >
          <option value="all">{t("All connections", "全部关系")}</option>
          {store.nodes
            .filter(
              (n) =>
                n.kind !== "ROOT" &&
                !n.archived &&
                (["INSTITUTION", "PARENT"].includes(n.kind) ||
                  store.edges.some((e) => e.from === n.id)),
            )
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          <option value="pipeline">
            {t("Institutional pipeline", "机构合作")}
          </option>
        </select>
        <button
          className={!list ? css.active : ""}
          onClick={() => setList(false)}
        >
          {t("Map", "地图")}
        </button>
        <button
          className={list ? css.active : ""}
          onClick={() => setList(true)}
        >
          {t("List", "列表")}
        </button>
        <button
          aria-label={t("Zoom out", "缩小")}
          onClick={() => setZoom((v) => Math.max(0.25, v - 0.1))}
        >
          −
        </button>
        <span className={css.fitLabel}>{Math.round(zoom * 100)}%</span>
        <button
          aria-label={t("Zoom in", "放大")}
          onClick={() => setZoom((v) => Math.min(1.6, v + 0.1))}
        >
          +
        </button>
        <button onClick={fit}>{t("Fit width", "适应宽度")}</button>
        <button onClick={() => setFull((v) => !v)}>
          {full ? t("Exit full screen", "退出全屏") : t("Full screen", "全屏")}
        </button>
        {view ? (
          <button
            className={includeArchived ? css.active : ""}
            onClick={() => {
              setIncludeArchived((v) => !v);
              setList(true);
            }}
          >
            {includeArchived
              ? t("Hide archived", "隐藏归档")
              : t("Archived records", "归档记录")}
          </button>
        ) : null}
        {view && !readOnly ? (
          <button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                const result = await maintainNetworkAction({
                  revision: fullStore.revision,
                  action: "LAYOUT",
                  note: "Operator requested automatic map organization / 操作人主动整理地图布局",
                });
                if (result.ok)
                  window.location.assign("/admin/relationships/map?saved=1");
                else setError(result.error ?? "Error");
              } catch {
                setError(
                  t(
                    "Unable to organize. Reload and check.",
                    "未能整理，请刷新核对。",
                  ),
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {t("Organize map", "自动整理")}
          </button>
        ) : null}
        <button onClick={reset}>{t("Reset", "重置")}</button>
      </div>
      <div className={`${css.body} ${!node ? css.noInspector : ""}`}>
        {list ? (
          <div className={css.list}>
            <table>
              <thead>
                <tr>
                  <th>{t("Name", "名称")}</th>
                  <th>{t("Identity", "身份")}</th>
                  <th>{t("Source status", "来源状态")}</th>
                  <th>{t("CRM link", "业务关联")}</th>
                </tr>
              </thead>
              <tbody>
                {store.nodes
                  .filter((n) => n.kind !== "ROOT" && active.has(n.id))
                  .map((n) => (
                    <tr key={n.id}>
                      <td>
                        <button onClick={() => setSelected(n.id)}>
                          {n.name}
                          {n.archived ? t(" (archived)", "（已归档）") : ""}
                        </button>
                      </td>
                      <td>{kindLabel(lang, n.kind)}</td>
                      <td>{n.sourceStatus || t("Unstated", "未注明")}</td>
                      <td>
                        {n.studentId || n.relationshipId || n.leadId
                          ? t("Linked", "已关联")
                          : t("Not linked", "未关联")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!active.size ? (
              <p className={css.empty}>{t("No matches", "没有匹配项")}</p>
            ) : null}
          </div>
        ) : (
          <div
            className={css.canvas}
            ref={canvas}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              const box = e.currentTarget;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                left: box.scrollLeft,
                top: box.scrollTop,
              };
              box.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current) {
                e.currentTarget.scrollLeft =
                  drag.current.left - (e.clientX - drag.current.x);
                e.currentTarget.scrollTop =
                  drag.current.top - (e.clientY - drag.current.y);
              }
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <div style={{ width: WIDTH * zoom, height: HEIGHT * zoom }}>
              <div
                className={css.plane}
                style={{
                  width: WIDTH,
                  height: HEIGHT,
                  transform: `scale(${zoom})`,
                }}
              >
                <svg
                  className={css.wires}
                  width={WIDTH}
                  height={HEIGHT}
                  aria-hidden="true"
                >
                  {store.edges.map((e) => {
                    const a = store.nodes.find((n) => n.id === e.from)!,
                      b = store.nodes.find((n) => n.id === e.to)!,
                      dim = !active.has(e.from) && !active.has(e.to);
                    const label =
                      e.label === "mother"
                        ? t("mother", "母亲")
                        : e.label === "connection"
                          ? t("connection · review", "联系·待核对")
                          : e.label === "prospect"
                            ? t("prospect", "潜在客户")
                            : e.label === "status unconfirmed"
                              ? t("status unconfirmed", "状态待确认")
                              : e.label === "listed connection"
                                ? ""
                                : e.style === "PIPELINE"
                                  ? ""
                                  : e.label === "relationship network"
                                    ? ""
                                    : e.label;
                    return (
                      <g key={e.id} opacity={dim ? 0.15 : 1}>
                        <path
                          d={edgePath(e, store.nodes)}
                          fill="none"
                          stroke={e.confirmed ? "#4a8a74" : "#a9b9c3"}
                          strokeWidth={e.confirmed ? 2 : 1.5}
                          strokeDasharray={
                            e.style === "DIRECT"
                              ? undefined
                              : e.style === "PIPELINE"
                                ? "2 7"
                                : "6 5"
                          }
                        />
                        {label ? (
                          <text
                            x={a.x === b.x ? a.x + 142 : (a.x + 274 + b.x) / 2}
                            y={
                              a.x === b.x
                                ? (a.y + b.y + 82) / 2
                                : (a.y + b.y) / 2 + 33
                            }
                            textAnchor={a.x === b.x ? "start" : "middle"}
                            fill="#748592"
                            fontSize="10"
                          >
                            {label.slice(0, 38)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
                <div
                  className={css.sectionLabel}
                  style={{
                    left: 350,
                    top:
                      Math.min(
                        ...store.nodes
                          .filter((n) =>
                            store.edges.some(
                              (e) => e.style === "PIPELINE" && e.to === n.id,
                            ),
                          )
                          .map((n) => n.y),
                        HEIGHT,
                      ) - 70,
                  }}
                >
                  {t("INSTITUTIONAL PIPELINE", "机构合作项目")}
                </div>
                {store.nodes.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    aria-label={n.name}
                    aria-pressed={selected === n.id}
                    className={`${css.node} ${css[n.kind]} ${n.sourceStatus === "prospect" ? css.prospect : ""} ${selected === n.id ? css.selected : ""} ${!active.has(n.id) ? css.dim : ""}`}
                    style={{ left: n.x, top: n.y }}
                    onClick={() => setSelected(n.id)}
                  >
                    <span className={css.nodeTitle}>{n.name}</span>
                    <span className={css.nodeMeta}>
                      {n.relationshipId || n.studentId || n.leadId ? (
                        <span className={css.linkedDot} />
                      ) : null}
                      {view?.live[n.id]?.lead?.status ||
                        n.sourceStatus ||
                        kindLabel(lang, n.kind)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {node ? (
          <aside key={`${node.id}-${store.revision}`} className={css.inspector}>
            <div
              className={css.actions}
              style={{ justifyContent: "space-between" }}
            >
              <span className={css.badge}>{kindLabel(lang, node.kind)}</span>
              <button
                onClick={() => setSelected("")}
                aria-label={t("Close details", "关闭详情")}
              >
                ×
              </button>
            </div>
            <h2>
              {node.name}
              {node.archived ? t(" (archived)", "（已归档）") : ""}
            </h2>
            <dl>
              <div>
                <dt>
                  {node.origin === "MANUAL"
                    ? t("Initial status", "新增时状态")
                    : t("Original PDF status", "PDF原文状态")}
                </dt>
                <dd>
                  {node.sourceStatus ||
                    t("Unstated · no status inferred", "未注明·未推断状态")}
                </dd>
              </div>
              <div>
                <dt>{t("Source", "来源")}</dt>
                <dd>
                  {node.origin === "MANUAL"
                    ? t("Manually added", "手动新增")
                    : store.sourceName + " · p.1"}
                </dd>
              </div>
            </dl>
            {node.review ? <p className={css.alert}>{node.review}</p> : null}
            {live?.missing.length ? (
              <p className={css.alert}>
                {t(
                  "A linked record is unavailable. Review its identity link.",
                  "部分关联记录已不可用，请核对关联。",
                )}
              </p>
            ) : null}
            <h3>{t("Current business records", "当前业务资料")}</h3>
            {live?.relationship ? (
              <>
                <p>
                  <a href={`/admin/relationships/${live.relationship.id}`}>
                    {live.relationship.name} ↗
                  </a>
                </p>
                <dl>
                  <div>
                    <dt>
                      {t("Relationship status / owner", "关系状态／负责人")}
                    </dt>
                    <dd>
                      {live.relationship.status} ·{" "}
                      {live.relationship.ownerName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {t(
                        "Linked students / open opportunities",
                        "已关联学生／跟进中商机",
                      )}
                    </dt>
                    <dd>
                      {live.relationship.students} /{" "}
                      {live.relationship.openLeads}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Next action", "下一步")}</dt>
                    <dd>
                      {live.relationship.nextAction || t("Not set", "未设置")}
                      <br />
                      {safeDate(live.relationship.nextActionDue)}
                    </dd>
                  </div>
                </dl>
                {live.relationship.latestFollowUp ? (
                  <p className={css.status}>
                    {t("Latest follow-up", "最近跟进")}:{" "}
                    {live.relationship.latestFollowUp.content}
                    <br />
                    {safeDate(live.relationship.latestFollowUp.createdAt)}
                  </p>
                ) : null}
                {live.relationship.opportunities.length ? (
                  <div>
                    <h3>
                      {t(
                        "Student opportunities (first 20)",
                        "学生商机（最多展示20条）",
                      )}
                    </h3>
                    {live.relationship.opportunities.map((l) => (
                      <p key={l.id}>
                        <a href={`/admin/leads/${l.id}`}>{l.name} ↗</a> ·{" "}
                        {l.status}
                      </p>
                    ))}
                  </div>
                ) : null}
                <p>
                  <a href={`/admin/relationships/${live.relationship.id}`}>
                    {t(
                      "Record follow-up / manage projects",
                      "记录跟进／管理合作项目",
                    )}{" "}
                    ↗
                  </a>
                </p>
              </>
            ) : null}
            {live?.student ? (
              <p>
                {t("Student", "学生")}:{" "}
                {canLinkStudent ? (
                  <a href={`/admin/students/${live.student.id}`}>
                    {live.student.name} ↗
                  </a>
                ) : (
                  live.student.name
                )}
                <br />
                {[live.student.school, live.student.grade]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {live?.lead ? (
              <p>
                <a href={`/admin/leads/${live.lead.id}`}>{live.lead.name} ↗</a>
                <br />
                {live.lead.status}
                <br />
                {live.lead.nextAction ||
                  t("Next action not set", "下一步未设置")}{" "}
                · {safeDate(live.lead.nextActionDue)}
              </p>
            ) : null}
            {live?.project ? (
              <p>
                {t("Cooperation project", "合作项目")}: {live.project.title}
                <br />
                {live.project.status} ·{" "}
                {live.project.nextAction ||
                  t("Next action not set", "下一步未设置")}
                <br />
                {safeDate(live.project.nextActionDue)}
              </p>
            ) : null}
            {!live?.relationship && !live?.student && !live?.lead ? (
              <p className={css.status}>
                {view
                  ? t(
                      "No CRM identity linked. Review before linking an existing record.",
                      "尚未关联业务档案，可核对后关联已有记录。",
                    )
                  : t(
                      "Import the PDF to save and link records.",
                      "导入PDF后即可保存并关联业务记录。",
                    )}
              </p>
            ) : null}
            <hr className={css.divider} />
            {view && !readOnly ? (
              <>
                <NodeMaintenance
                  lang={lang}
                  store={fullStore}
                  node={node}
                  onAdd={() => {
                    setMaintenanceParent(node.id);
                    setMaintenanceOpen(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
                <NodeEditor
                  key={`${node.id}:${store.revision}`}
                  lang={lang}
                  node={node}
                  store={fullStore}
                  pending={pending}
                  canLinkStudent={canLinkStudent}
                  onSave={async (input) => {
                    setPending(true);
                    setError("");
                    try {
                      const result = await editNetworkAction(input);
                      if (!result.ok) {
                        setError(result.error ?? "Error");
                        return;
                      }
                      window.location.assign(
                        "/admin/relationships/map?saved=1",
                      );
                    } catch {
                      setError(
                        t(
                          "Unable to save. Reload and check before retrying.",
                          "未能保存，请刷新核对后重试。",
                        ),
                      );
                    } finally {
                      setPending(false);
                    }
                  }}
                />
              </>
            ) : (
              <>
                <h3>{t("Connections", "关系连接")}</h3>
                {store.edges
                  .filter((e) => e.from === node.id || e.to === node.id)
                  .map((e) => (
                    <div className={css.connection} key={e.id}>
                      <strong>{e.label}</strong>
                      <small>
                        {
                          store.nodes.find(
                            (n) =>
                              n.id === (e.from === node.id ? e.to : e.from),
                          )?.name
                        }{" "}
                        ·{" "}
                        {e.confirmed
                          ? t("Reviewed", "已核对")
                          : t("To review", "待核对")}
                      </small>
                    </div>
                  ))}
              </>
            )}
          </aside>
        ) : null}
      </div>
      <div className={css.legend}>
        <span>
          <i />
          {t("Institution", "机构")}
        </span>
        <span>
          <i className={css.parentKey} />
          {t("Parent", "家长")}
        </span>
        <span>
          <i className={css.prospectKey} />
          {t("Prospect (PDF wording)", "潜在客户（PDF原文）")}
        </span>
        <span>
          <i className={css.lineKey} />
          {t(
            "Connection / discussion · not a confirmed referral",
            "联系／洽谈·不代表已确认介绍",
          )}
        </span>
      </div>
      <div className={css.footer}>
        <span>
          {query || focus !== "all"
            ? t(
                `${active.size} matching nodes · other nodes dimmed`,
                `${active.size} 个匹配节点·其他节点淡化`,
              )
            : t(
                "Drag the canvas to pan. Select a node for details.",
                "拖动画布移动，点击节点查看详情。",
              )}
        </span>
        <span>
          {view
            ? `${t("Imported", "导入于")} ${safeDate(store.importedAt)} · ${store.importedBy} · v${store.revision}`
            : t(
                "Preview uses the reviewed template for this exact PDF; no business data has been written.",
                "预览基于这份PDF的已核对模板，尚未写入业务数据。",
              )}
        </span>
      </div>
    </main>
  );
}

function ImportPanel({
  lang,
  preview,
  defaults,
  suggestions,
  saved,
  canLinkStudent,
  onClose,
}: {
  lang: Lang;
  preview: NetworkStore;
  defaults: string[];
  suggestions: Record<string, NetworkCandidate[]>;
  saved: boolean;
  canLinkStudent: boolean;
  onClose: () => void;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const [choices, setChoices] = useState<NetworkChoice[]>(
      preview.nodes.map((n) => ({
        nodeId: n.id,
        mode:
          defaults.includes(n.id) &&
          !suggestions[n.id]?.some((c) => c.type === "RELATIONSHIP")
            ? "CREATE"
            : "KEEP",
        reviewNote: defaults.includes(n.id)
          ? "Source identity preserved from reviewed PDF / 保留已核对PDF中的原始身份"
          : "",
      })),
    ),
    [ack, setAck] = useState(false),
    [verified, setVerified] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const patch = (id: string, data: Partial<NetworkChoice>) =>
    setChoices((rows) =>
      rows.map((c) => (c.nodeId === id ? { ...c, ...data } : c)),
    );
  const created = choices.filter((c) => c.mode === "CREATE").length,
    linked = choices.filter((c) => !["KEEP", "CREATE"].includes(c.mode)).length;
  return (
    <section
      className={css.importPanel}
      aria-label={t("PDF import review", "PDF导入核对")}
    >
      <div className={css.importHeader}>
        <div>
          <h2>
            {saved
              ? t("This PDF has been imported", "这份PDF已导入")
              : t("Review the supplied PDF", "核对这份PDF")}
          </h2>
          <p>
            {preview.sourceName} · {preview.nodes.length - 1}{" "}
            {t("people / institution nodes", "个人员／机构节点")} ·{" "}
            {preview.edges.length} {t("connections", "条连线")}
            <br />
            {t(
              "A reviewed template for this document. Other PDFs need a separate template. Existing records are never matched automatically.",
              "使用本次文档的已核对模板；其他PDF需另建模板。已有档案不会按姓名自动关联。",
            )}
          </p>
        </div>
        <button onClick={onClose}>{t("Close", "收起")}</button>
      </div>
      {saved ? (
        <div className={css.upload}>
          <span className={css.status}>
            {t(
              "Same-document imports reuse the saved map. No duplicate profiles or projects are created. Open a node to review its current links.",
              "同一文档重复导入会打开已保存地图，不会重复建档或创建项目。点击节点可核对当前关联。",
            )}
          </span>
        </div>
      ) : (
        <>
          <div className={css.upload}>
            <button
              type="button"
              className={verified ? css.active : ""}
              onClick={() => setVerified(true)}
            >
              {verified
                ? t("✓ Supplied PDF template loaded", "✓ 已载入本次PDF模板")
                : t("Load supplied PDF template", "载入本次PDF模板")}
            </button>
            <span className={css.status}>
              {t("or verify a local copy", "或核对本地副本")}
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              aria-label={t("Upload PDF for verification", "上传PDF核对")}
              disabled={pending}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPending(true);
                setError("");
                setVerified(false);
                const form = new FormData();
                form.set("pdf", file);
                try {
                  const result = await inspectPdfAction(form);
                  if (result.ok) setVerified(true);
                  else setError(result.error ?? "Error");
                } catch {
                  setError(t("Unable to verify PDF.", "未能核对PDF。"));
                } finally {
                  setPending(false);
                }
              }}
            />
          </div>
          <details>
            <summary
              style={{ padding: "16px 22px", cursor: "pointer", fontSize: 13 }}
            >
              {t(
                "Review each row and existing-record matches",
                "逐条核对记录及已有档案匹配",
              )}{" "}
              · {created} {t("new relationships", "个新关系档案")} / {linked}{" "}
              {t("existing links", "个已有档案关联")}
            </summary>
            <div className={css.tableScroll}>
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>{t("PDF object", "PDF对象")}</th>
                    <th>{t("Import action", "导入方式")}</th>
                    <th>{t("Identity check", "身份核对")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.nodes
                    .filter((n) => n.kind !== "ROOT")
                    .map((n) => {
                      const c = choices.find((c) => c.nodeId === n.id)!;
                      const individual = ["PERSON", "STUDENT"].includes(n.kind);
                      return (
                        <tr key={n.id}>
                          <td>
                            <strong>{n.name}</strong>
                            <small>
                              {kindLabel(lang, n.kind)}
                              {n.sourceStatus ? ` · ${n.sourceStatus}` : ""}
                            </small>
                            {n.review ? <small>{n.review}</small> : null}
                            {suggestions[n.id]?.length ? (
                              <div className={css.candidatePanel}>
                                <small>
                                  {t(
                                    "Possible existing records · check identity",
                                    "可能已有档案·请核对身份",
                                  )}
                                </small>
                                {suggestions[n.id].map((candidate) => (
                                  <button
                                    type="button"
                                    key={`${candidate.type}:${candidate.id}`}
                                    onClick={() =>
                                      patch(n.id, {
                                        mode: candidate.type,
                                        targetId: candidate.id,
                                        reviewNote: "",
                                      })
                                    }
                                  >
                                    <strong>{candidate.name}</strong>
                                    <small>
                                      {candidate.type} · {candidate.detail}
                                      <br />
                                      ID: {candidate.id}
                                    </small>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <select
                              aria-label={`${n.name} ${t("import action", "导入方式")}`}
                              value={c.mode}
                              onChange={(e) =>
                                patch(n.id, {
                                  mode: e.target.value as NetworkChoice["mode"],
                                  targetId: undefined,
                                  reviewNote:
                                    e.target.value === "CREATE"
                                      ? "Source identity preserved from reviewed PDF / 保留已核对PDF中的原始身份"
                                      : "",
                                })
                              }
                            >
                              <option value="KEEP">
                                {t(
                                  "Map only · no new CRM record",
                                  "仅保留地图·不新建业务档案",
                                )}
                              </option>
                              {n.kind !== "GROUP" ? (
                                <>
                                  <option value="CREATE">
                                    {t(
                                      "Create relationship profile",
                                      "新建关系档案",
                                    )}
                                  </option>
                                  <option value="RELATIONSHIP">
                                    {t(
                                      "Link existing relationship",
                                      "关联已有关系",
                                    )}
                                  </option>
                                  {individual ? (
                                    <>
                                      <option value="LEAD">
                                        {t(
                                          "Link existing student opportunity",
                                          "关联已有学生商机",
                                        )}
                                      </option>
                                      {canLinkStudent ? (
                                        <option value="STUDENT">
                                          {t(
                                            "Link existing student",
                                            "关联已有学生",
                                          )}
                                        </option>
                                      ) : null}
                                    </>
                                  ) : null}
                                </>
                              ) : null}
                            </select>
                            {["RELATIONSHIP", "STUDENT", "LEAD"].includes(
                              c.mode,
                            ) ? (
                              <>
                                <CandidatePicker
                                  key={`${n.id}:${c.mode}`}
                                  lang={lang}
                                  type={
                                    c.mode as
                                      | "RELATIONSHIP"
                                      | "STUDENT"
                                      | "LEAD"
                                  }
                                  onSelect={(candidate) =>
                                    patch(n.id, { targetId: candidate.id })
                                  }
                                />
                                {c.targetId ? (
                                  <small>
                                    {t("Selected exact ID", "已选准确ID")}:{" "}
                                    {c.targetId}
                                  </small>
                                ) : null}
                              </>
                            ) : null}
                          </td>
                          <td>
                            {c.mode !== "KEEP" ? (
                              <input
                                aria-label={`${n.name} ${t("identity check", "核对依据")}`}
                                value={c.reviewNote ?? ""}
                                placeholder={t(
                                  "Basis for identity check",
                                  "填写身份核对依据",
                                )}
                                onChange={(e) =>
                                  patch(n.id, { reviewNote: e.target.value })
                                }
                              />
                            ) : (
                              <small>
                                {t(
                                  "Original wording retained. No student or opportunity will be created.",
                                  "保留原文，不创建学生或商机。",
                                )}
                              </small>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </details>
          {error ? (
            <p role="alert" className={css.alert}>
              {error}
            </p>
          ) : null}
          <div className={css.importFooter}>
            <label>
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              {t(
                "I have reviewed these import choices. Unclear identities and connections stay unconfirmed; the four institutional discussions remain open for review.",
                "我已核对导入方式。不明确的身份与连线继续保留待确认，四个机构洽谈项目保持开放待核对。",
              )}
            </label>
            <button
              type="button"
              disabled={!ack || !verified || pending}
              className={css.primary}
              onClick={async () => {
                setPending(true);
                setError("");
                try {
                  const result = await commitNetworkAction(choices);
                  if (!result.ok) {
                    setError(result.error ?? "Error");
                    return;
                  }
                  window.location.assign("/admin/relationships/map?imported=1");
                } catch {
                  setError(
                    t(
                      "Unable to open the result. Reload and check whether this PDF was saved before retrying.",
                      "未能打开结果，请刷新检查PDF是否已保存后再重试。",
                    ),
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending
                ? t("Saving…", "保存中…")
                : t("Confirm import & open map", "确认导入并打开地图")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function NodeEditor({
  lang,
  node,
  store,
  pending,
  canLinkStudent,
  onSave,
}: {
  lang: Lang;
  node: NetworkNode;
  store: NetworkStore;
  pending: boolean;
  canLinkStudent: boolean;
  onSave: (input: import("@/lib/sales-network").NetworkEdit) => Promise<void>;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const [name, setName] = useState(node.name),
    [kind, setKind] = useState(node.kind),
    [note, setNote] = useState(node.note),
    [mode, setMode] = useState<NetworkChoice["mode"]>("KEEP"),
    [targetId, setTargetId] = useState(""),
    [reviewNote, setReviewNote] = useState(""),
    [edges, setEdges] = useState(
      store.edges
        .filter((e) => e.from === node.id || e.to === node.id)
        .map((e) => ({ ...e })),
    );
  const combined = ["ROOT", "GROUP"].includes(node.kind),
    individual = ["PERSON", "STUDENT"].includes(kind);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          revision: store.revision,
          nodeId: node.id,
          name,
          kind,
          note,
          choice:
            mode === "KEEP"
              ? undefined
              : { nodeId: node.id, mode, targetId, reviewNote },
          edges: edges.map((e) => ({
            id: e.id,
            label: e.label,
            confirmed: e.confirmed,
          })),
        });
      }}
    >
      <fieldset
        disabled={pending}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <h3>{t("Review this node", "核对节点")}</h3>
        <label>
          {t("Map display name", "地图显示名称")}
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className={css.status}>
          {t(
            "Map edits preserve the original PDF and do not overwrite linked CRM profiles.",
            "修改地图不会覆盖原始PDF或已关联业务档案。",
          )}
        </p>
        <label>
          {t("Identity type", "身份类型")}
          <select
            value={kind}
            disabled={combined}
            onChange={(e) => {
              setKind(e.target.value as NetworkNode["kind"]);
              setMode("KEEP");
              setTargetId("");
            }}
          >
            {NETWORK_KINDS.filter((k) =>
              combined ? k === node.kind : !["ROOT", "GROUP"].includes(k),
            ).map((k) => (
              <option key={k} value={k}>
                {kindLabel(lang, k)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Notes", "备注")}
          <textarea
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {!combined ? (
          <>
            <label>
              {t("Link a business record", "关联业务档案")}
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as NetworkChoice["mode"]);
                  setTargetId("");
                }}
              >
                <option value="KEEP">
                  {t("Keep current links", "保留现有关联")}
                </option>
                {!node.relationshipId ? (
                  <option value="CREATE">
                    {t("Create relationship profile", "新建关系档案")}
                  </option>
                ) : null}
                <option value="RELATIONSHIP">
                  {t("Link exact relationship", "关联准确关系档案")}
                </option>
                {node.relationshipId || node.studentId || node.leadId ? (
                  <option value="UNLINK">
                    {t(
                      "Remove map links (keep CRM records)",
                      "解除地图关联（保留业务档案）",
                    )}
                  </option>
                ) : null}
                {individual ? (
                  <>
                    <option value="LEAD">
                      {t("Link exact student opportunity", "关联准确学生商机")}
                    </option>
                    {canLinkStudent ? (
                      <option value="STUDENT">
                        {t("Link exact student", "关联准确学生")}
                      </option>
                    ) : null}
                  </>
                ) : null}
              </select>
            </label>
            {["RELATIONSHIP", "LEAD", "STUDENT"].includes(mode) ? (
              <>
                <CandidatePicker
                  key={`${node.id}:${mode}`}
                  lang={lang}
                  type={mode as "RELATIONSHIP" | "STUDENT" | "LEAD"}
                  onSelect={(c) => setTargetId(c.id)}
                />
                {targetId ? <p className={css.status}>ID: {targetId}</p> : null}
              </>
            ) : null}
            {mode !== "KEEP" ? (
              <label>
                {t("Identity check (required)", "身份核对依据（必填）")}
                <textarea
                  required
                  value={reviewNote}
                  maxLength={1000}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </label>
            ) : null}
          </>
        ) : (
          <p className={css.status}>
            {t(
              "Combined identities remain intact. Verify who each name refers to before splitting.",
              "组合姓名完整保留；核对各自身份后再另行拆分。",
            )}
          </p>
        )}
        <h3>{t("Connection labels & review", "关系含义与核对")}</h3>
        {edges.map((e, i) => (
          <div className={css.connection} key={e.id}>
            <small>
              {
                store.nodes.find(
                  (n) => n.id === (e.from === node.id ? e.to : e.from),
                )?.name
              }
            </small>
            <input
              aria-label={`${e.id} ${t("label", "关系含义")}`}
              type="text"
              required
              maxLength={160}
              value={e.label}
              onChange={(event) =>
                setEdges((rows) =>
                  rows.map((r, j) =>
                    i === j ? { ...r, label: event.target.value } : r,
                  ),
                )
              }
            />
            <label className={css.check}>
              <input
                type="checkbox"
                checked={e.confirmed}
                onChange={(event) =>
                  setEdges((rows) =>
                    rows.map((r, j) =>
                      i === j ? { ...r, confirmed: event.target.checked } : r,
                    ),
                  )
                }
              />
              {t("Reviewed against business facts", "已按业务事实核对")}
            </label>
          </div>
        ))}
        <button
          className={css.primary}
          disabled={
            pending ||
            (["RELATIONSHIP", "STUDENT", "LEAD"].includes(mode) && !targetId)
          }
          style={{ width: "100%", marginTop: 20 }}
        >
          {pending ? t("Saving…", "保存中…") : t("Save review", "保存核对结果")}
        </button>
      </fieldset>
    </form>
  );
}
