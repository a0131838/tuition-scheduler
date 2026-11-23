"use client";
import { useState } from "react";
import type {
  NetworkStore,
  NetworkNode,
  NetworkChoice,
  NetworkCandidate,
} from "@/lib/sales-network-types";
import { networkText as tr, kindLabel } from "@/lib/sales-network-types";
import type { NetworkMaintenance } from "@/lib/sales-network";
import { maintainNetworkAction } from "./actions";
import CandidatePicker from "./CandidatePicker";
import css from "./NetworkWorkspace.module.css";
async function save(input: NetworkMaintenance) {
  const result = await maintainNetworkAction(input);
  if (!result.ok) throw new Error(result.error);
  window.location.assign(
    "/admin/relationships/map?saved=1&node=" +
      encodeURIComponent(result.nodeId ?? ""),
  );
}
export function MaintenancePanel({
  lang,
  store,
  parentId,
  canLinkStudent,
  onClose,
}: {
  lang: string;
  store: NetworkStore;
  parentId: string;
  canLinkStudent: boolean;
  onClose: () => void;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh),
    nodes = store.nodes.filter((n) => !n.archived);
  const [action, setAction] = useState<"ADD_NODE" | "CONNECT">("ADD_NODE"),
    [from, setFrom] = useState(parentId || nodes[0].id),
    [to, setTo] = useState(""),
    [name, setName] = useState(""),
    [kind, setKind] = useState<NetworkNode["kind"]>("STUDENT"),
    [mode, setMode] = useState<NetworkChoice["mode"] | "NEW_LEAD">("KEEP"),
    [target, setTarget] = useState<NetworkCandidate | null>(null),
    [label, setLabel] = useState("connection / 联系（待核对）"),
    [style, setStyle] = useState<"DIRECT" | "CONNECTION" | "PIPELINE">(
      "CONNECTION",
    ),
    [confirmed, setConfirmed] = useState(false),
    [note, setNote] = useState(""),
    [asReferral, setAsReferral] = useState(false),
    [sourceType, setSourceType] = useState("其他"),
    [createProject, setCreateProject] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const existing =
    action === "ADD_NODE" && target
      ? store.nodes.find((n) =>
          target.type === "RELATIONSHIP"
            ? n.relationshipId === target.id
            : target.type === "STUDENT"
              ? n.studentId === target.id
              : n.leadId === target.id,
        )
      : null;
  const eligible = ["PERSON", "STUDENT"].includes(kind);
  return (
    <section
      className={css.importPanel}
      aria-label={t("Maintain the relationship map", "维护关系地图")}
    >
      <div className={css.importHeader}>
        <div>
          <h2>
            {t(
              "Add a person, student or institution",
              "增加人员、学生或合作方",
            )}
          </h2>
          <p>
            {t(
              "Keep one identity on the map. Reuse existing records and add connections as the network grows.",
              "同一身份保留一个节点；复用已有档案，用连线记录新增关系。",
            )}
          </p>
        </div>
        <button onClick={onClose}>{t("Close", "收起")}</button>
      </div>
      <form
        style={{ padding: 22 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await save({
              revision: store.revision,
              action: existing ? "CONNECT" : action,
              from,
              to: existing?.id ?? to,
              name,
              kind,
              label,
              style,
              confirmed,
              note,
              newLead: mode === "NEW_LEAD",
              asReferral,
              sourceType,
              createProject:
                action === "ADD_NODE" &&
                !existing &&
                kind === "INSTITUTION" &&
                mode === "CREATE" &&
                createProject,
              choice:
                action === "ADD_NODE" && mode !== "NEW_LEAD"
                  ? {
                      nodeId: "NEW",
                      mode: mode as NetworkChoice["mode"],
                      targetId: target?.id,
                      reviewNote: note,
                    }
                  : undefined,
            });
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : t("Save failed. Reload and check.", "保存失败，请刷新核对。"),
            );
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className={css.maintenanceGrid}>
          <label>
            {t("Action", "操作")}
            <select
              aria-label={t("Action", "操作")}
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
            >
              <option value="ADD_NODE">{t("Add an object", "新增对象")}</option>
              <option value="CONNECT">
                {t("Connect existing nodes", "在已有节点之间新增连线")}
              </option>
            </select>
          </label>
          <label>
            {t("Connect from", "从哪个节点连接")}
            <select
              aria-label={t("Connect from", "从哪个节点连接")}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          {action === "CONNECT" ? (
            <label>
              {t("Connect to", "连接到")}
              <select
                aria-label={t("Connect to", "连接到")}
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                <option value="">
                  {t("Select an existing node", "选择已有节点")}
                </option>
                {nodes
                  .filter((n) => n.id !== from)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                {t("Object type", "对象类型")}
                <select
                  aria-label={t("Object type", "对象类型")}
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as typeof kind);
                    setMode("KEEP");
                    setTarget(null);
                    if (e.target.value === "INSTITUTION") {
                      setLabel("cooperation discussion / 合作洽谈");
                      setStyle("PIPELINE");
                    } else {
                      setLabel("connection / 联系（待核对）");
                      setStyle("CONNECTION");
                    }
                  }}
                >
                  {(
                    ["STUDENT", "INSTITUTION", "PARENT", "PERSON"] as const
                  ).map((k) => (
                    <option key={k} value={k}>
                      {kindLabel(lang, k)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Name", "名称")}
                <input
                  required
                  value={name}
                  maxLength={160}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                {t("Business record", "业务档案")}
                <select
                  aria-label={t("Business record", "业务档案")}
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as typeof mode);
                    setTarget(null);
                  }}
                >
                  <option value="KEEP">
                    {t(
                      "Map only · identity still unconfirmed",
                      "仅保留地图·身份待核对",
                    )}
                  </option>
                  {kind === "STUDENT" ? (
                    <option value="NEW_LEAD">
                      {t(
                        "New student opportunity (no enrolled student created)",
                        "新建学生商机（不直接建在读学生）",
                      )}
                    </option>
                  ) : null}
                  {kind !== "STUDENT" ? (
                    <>
                      <option value="CREATE">
                        {t("Create relationship profile", "新建关系档案")}
                      </option>
                      <option value="RELATIONSHIP">
                        {t("Use existing relationship", "使用已有关系档案")}
                      </option>
                    </>
                  ) : null}
                  {eligible ? (
                    <>
                      <option value="LEAD">
                        {t(
                          "Use existing student opportunity",
                          "使用已有学生商机",
                        )}
                      </option>
                      {canLinkStudent ? (
                        <option value="STUDENT">
                          {t(
                            "Use existing student profile",
                            "使用已有学生档案",
                          )}
                        </option>
                      ) : null}
                    </>
                  ) : null}
                </select>
              </label>
              {["RELATIONSHIP", "LEAD", "STUDENT"].includes(mode) ? (
                <div>
                  <CandidatePicker
                    key={mode}
                    lang={lang}
                    type={mode as NetworkCandidate["type"]}
                    onSelect={(c) => {
                      setTarget(c);
                      setName(c.name);
                    }}
                  />
                  {target ? (
                    <p className={css.status}>ID: {target.id}</p>
                  ) : null}
                  {existing ? (
                    <p className={css.alert}>
                      {t(
                        "This record is already on the map. Saving will connect its existing node. Restore it first if archived.",
                        "该档案已在地图中，保存时将连接已有节点；若已归档，请先恢复。",
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {mode === "NEW_LEAD" ? (
                <>
                  <label>
                    {t("Actual acquisition source", "实际获客来源")}
                    <select
                      aria-label={t(
                        "Actual acquisition source",
                        "实际获客来源",
                      )}
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                    >
                      {[
                        "其他",
                        "老客户介绍",
                        "渠道介绍",
                        "微信/私域",
                        "官网/表单",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {t(
                            (
                              {
                                其他: "Other",
                                老客户介绍: "Existing customer referral",
                                渠道介绍: "Channel referral",
                                "微信/私域": "WeChat / private contacts",
                                "官网/表单": "Website / form",
                              } as Record<string, string>
                            )[s],
                            s,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={css.inlineCheck}>
                    <input
                      type="checkbox"
                      checked={asReferral}
                      onChange={(e) => setAsReferral(e.target.checked)}
                    />
                    {t(
                      "The selected source relationship is a verified referral source",
                      "所选来源关系确实是已核对的介绍来源",
                    )}
                  </label>
                  <p className={css.status}>
                    {t(
                      "A school connection alone does not assign referral ownership. Student handoff continues in the existing opportunity workflow.",
                      "仅学校连接不会指定介绍归属；后续建学生档案仍走现有商机承接流程。",
                    )}
                  </p>
                </>
              ) : null}
              {kind === "INSTITUTION" && mode === "CREATE" ? (
                <label className={css.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={createProject}
                    onChange={(e) => setCreateProject(e.target.checked)}
                  />
                  {t(
                    "Create the first open cooperation project",
                    "同时创建首个待跟进合作项目",
                  )}
                </label>
              ) : null}
            </>
          )}
          <label>
            {t("Connection meaning", "关系含义")}
            <input
              required
              maxLength={160}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t(
                "e.g. mother / introduced / school connection",
                "例如：母亲／介绍／学校联系",
              )}
            />
          </label>
          <label>
            {t("Connection style", "连线类型")}
            <select
              aria-label={t("Connection style", "连线类型")}
              value={style}
              onChange={(e) => setStyle(e.target.value as typeof style)}
            >
              <option value="CONNECTION">
                {t("Contact / possible referral", "人脉联系／可能介绍")}
              </option>
              <option value="DIRECT">
                {t("Direct stated connection", "明确的直接连接")}
              </option>
              <option value="PIPELINE">
                {t("Institutional cooperation discussion", "机构合作洽谈")}
              </option>
            </select>
          </label>
          <label className={css.inlineCheck}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {t(
              "Connection reviewed against business facts",
              "此关系已按业务事实核对",
            )}
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            {t(
              "Identity check / reason / first follow-up",
              "身份核对依据／调整原因／首次跟进",
            )}
            <textarea
              required
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              className={css.primary}
              disabled={
                busy ||
                (action === "ADD_NODE" &&
                  ["RELATIONSHIP", "LEAD", "STUDENT"].includes(mode) &&
                  !target)
              }
            >
              {busy ? t("Saving…", "保存中…") : t("Save to map", "保存到地图")}
            </button>
          </div>
        </fieldset>
        {error ? (
          <p className={css.alert} role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
export function NodeMaintenance({
  lang,
  store,
  node,
  onAdd,
}: {
  lang: string;
  store: NetworkStore;
  node: NetworkNode;
  onAdd: () => void;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (action: NetworkMaintenance["action"], edgeId?: string) => {
    setBusy(true);
    setError("");
    try {
      await save({
        revision: store.revision,
        action,
        nodeId: node.id,
        edgeId,
        note,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  };
  return (
    <section>
      <h3>{t("Maintain connections", "后续维护")}</h3>
      <button onClick={onAdd}>
        {t("Add a connected object", "在此节点下新增对象")}
      </button>
      <label>
        {t("Reason for archiving / restoring", "归档／恢复原因")}
        <input
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("Required for changes below", "下列调整必填")}
        />
      </label>
      {node.kind !== "ROOT" ? (
        <button
          disabled={!note.trim() || busy}
          onClick={() => run(node.archived ? "RESTORE_NODE" : "ARCHIVE_NODE")}
        >
          {node.archived
            ? t("Restore this node", "恢复此节点")
            : t("Archive this node", "归档此节点")}
        </button>
      ) : null}
      <p className={css.status}>
        {t(
          "Archiving hides map objects and connections. CRM profiles, students and their history remain available.",
          "归档仅隐藏地图对象及相关连线，业务档案、学生和历史记录均保留。",
        )}
      </p>
      {store.edges
        .filter((e) => e.from === node.id || e.to === node.id)
        .map((e) => (
          <div key={e.id} className={css.connection}>
            <small>
              {
                store.nodes.find(
                  (n) => n.id === (e.from === node.id ? e.to : e.from),
                )?.name
              }{" "}
              · {e.label}
            </small>
            <button
              disabled={!note.trim() || busy}
              onClick={() =>
                run(e.archived ? "RESTORE_EDGE" : "ARCHIVE_EDGE", e.id)
              }
            >
              {e.archived
                ? t("Restore connection", "恢复连线")
                : t("Archive connection", "归档连线")}
            </button>
          </div>
        ))}
      {error ? (
        <p role="alert" className={css.alert}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
