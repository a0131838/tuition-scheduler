"use client";
import { useRef, useState, useEffect } from "react";
import type {
  NetworkView,
  NetworkNode,
  NetworkCandidate,
} from "@/lib/sales-network-types";
import { kindLabel, networkText as tr } from "@/lib/sales-network-types";
import type { Lang } from "@/lib/i18n";
import type { CustomerScope } from "@/lib/customer-access";
import type { CustomerDetail } from "@/lib/customer-detail";
import {
  customerDetailAction,
  reviewCustomerConnectionAction,
  assignCustomerAction,
  linkCustomerAction,
  maintainNetworkAction,
} from "./actions";
import NetworkWorkspace from "./NetworkWorkspace";
import { MaintenancePanel, NodeMaintenance } from "./NetworkMaintenance";
import CandidatePicker from "./CandidatePicker";
import css from "./CustomerDesk.module.css";
type User = { id: string; name: string; role: string };
const date = (v: Date | string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-SG", {
        timeZone: "Asia/Singapore",
        dateStyle: "medium",
      }).format(d);
};
const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency: "SGD",
      }).format(n / 100);
export default function CustomerDesk({
  lang,
  view,
  scope,
  users,
  manager,
  actorId,
  canLinkStudent,
  readOnly,
  ownerFilter,
}: {
  lang: Lang;
  view: NetworkView | null;
  scope: CustomerScope;
  users: User[];
  manager: boolean;
  actorId: string;
  canLinkStudent: boolean;
  readOnly: boolean;
  ownerFilter: string;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const [q, setQ] = useState(""),
    [pendingOnly, setPendingOnly] = useState(false),
    [archived, setArchived] = useState(false),
    [map, setMap] = useState(false),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<CustomerDetail | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [add, setAdd] = useState(false),
    [parentId, setParentId] = useState("");
  const sequence = useRef(0);
  const rows = (view?.store.nodes ?? []).filter(
    (n) =>
      n.kind !== "ROOT" &&
      (archived || !n.archived) &&
      (!pendingOnly ||
        !n.ownerUserId ||
        (!n.studentId && !n.parentId && !n.partnerId && !n.leadId)) &&
      [
        n.name,
        n.guardianContact?.phone ?? "",
        users.find((u) => u.id === n.ownerUserId)?.name ?? "",
      ].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const navigate = (s: CustomerScope, owner = "") => {
    window.location.assign(
      "/admin/relationships/map?scope=" +
        s +
        (owner ? "&owner=" + encodeURIComponent(owner) : ""),
    );
  };
  const open = async (id: string) => {
    if (view?.store.nodes.find((n) => n.id === id)?.kind === "ROOT") return;
    setSelected(id);
    setLoading(true);
    setError("");
    setDetail(null);
    const seq = ++sequence.current;
    try {
      const result = await customerDetailAction(id);
      if (seq === sequence.current) setDetail(result);
    } catch {
      if (seq === sequence.current)
        setError(
          t(
            "Unable to open this customer. Refresh or check your assignment.",
            "无法打开客户，请刷新或核对负责／协作权限。",
          ),
        );
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("node");
    if (id && view?.store.nodes.some((n) => n.id === id)) void open(id);
  }, []);
  return (
    <main className={css.desk}>
      <header className={css.header}>
        <div>
          <div className={css.eyebrow}>GT · CUSTOMER WORKSPACE</div>
          <h1>{t("Customers & relationships", "客户与关系")}</h1>
          <p className={css.muted}>
            {t(
              "One customer record. Shared work, current follow-up and linked billing.",
              "同一个客户共用一份档案，按负责人协作，关联最新跟进及账务。",
            )}
          </p>
        </div>
        <div className={css.links}>
          {!readOnly && view ? (
            <button
              className={css.primary}
              onClick={() => {
                setParentId(selected);
                setAdd(!add);
              }}
            >
              {t("Add / connect", "新增／连接")}
            </button>
          ) : null}
          <a href="/admin/students">{t("Student enrollment", "录入学生")}</a>
          <a href="/admin/relationships">
            {t("Relationship records", "关系档案")}
          </a>
        </div>
      </header>
      <nav className={css.tabs} aria-label={t("Customer scope", "客户范围")}>
        <button
          className={scope === "mine" ? css.active : ""}
          onClick={() => navigate("mine")}
        >
          {t("My customers", "我的客户")}
        </button>
        <button
          className={scope === "collaborating" ? css.active : ""}
          onClick={() => navigate("collaborating")}
        >
          {t("Collaborating", "协作客户")}
        </button>
        {manager ? (
          <button
            className={scope === "team" ? css.active : ""}
            onClick={() => navigate("team")}
          >
            {t("Team customers", "团队客户")}
          </button>
        ) : null}
        <span className={css.pendingCount}>
          {rows.length} {t("customers in this view", "个当前范围客户")}
        </span>
      </nav>
      <details className={css.help}>
        <summary>
          {t(
            "How to enroll and keep relationships connected",
            "新学生怎样录入并保持关联",
          )}
        </summary>
        <ol>
          <li>
            {t(
              "Search the map/list first. Link an existing node to an exact record instead of creating it again.",
              "先搜索客户列表，已有节点直接关联准确业务档案，不重复新增。",
            )}
          </li>
          <li>
            {t(
              "During student enrollment, select the owner account, collaborators and verified parent/source records. Confirmed selections create the connections in the same save.",
              "录入学生时选择负责人账号、协作人和准确的家长／来源记录，确认后同一次保存建立关联。",
            )}
          </li>
          <li>
            {t(
              "School, guardian, referral and actual payer are separate. Unknown connections stay pending; public intake does not claim staff ownership or parent portal rights.",
              "学校、监护人、介绍来源、实际付款人分开记录。不清楚的保留待核对，公开表单不自动指定负责人或开通家长端权限。",
            )}
          </li>
          <li>
            {t(
              "Click a name to inspect packages, renewal tasks and authorized payment facts. Update operational records at their source pages; archive only hides the map node.",
              "点姓名查看课包、续费任务和有权限的付款信息；业务进展在原档案维护，归档仅隐藏地图节点。",
            )}
          </li>
        </ol>
      </details>
      {add && view && !readOnly ? (
        <MaintenancePanel
          key={parentId}
          lang={lang}
          store={view.store}
          parentId={parentId}
          canLinkStudent={canLinkStudent}
          onClose={() => setAdd(false)}
        />
      ) : null}
      <div className={css.toolbar}>
        <input
          aria-label={t("Search customers", "搜索客户")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Name, contact or owner…", "姓名、联系人或负责人…")}
        />
        {scope === "team" ? (
          <select
            aria-label={t("Filter owner", "筛选负责人")}
            value={ownerFilter}
            onChange={(e) => navigate("team", e.target.value)}
          >
            <option value="">
              {t("All owners / unassigned", "全部负责人／待分配")}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.id.slice(-4)}
              </option>
            ))}
          </select>
        ) : null}
        <label className={css.check}>
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          {t("Needs review / assignment", "待核对／待分配")}
        </label>
        <label className={css.check}>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          {t("Include archived", "含归档")}
        </label>
        <button
          className={!map ? css.active : ""}
          onClick={() => setMap(false)}
        >
          {t("List", "客户列表")}
        </button>
        <button className={map ? css.active : ""} onClick={() => setMap(true)}>
          {t("Map", "关系图")}
        </button>
      </div>
      {error ? (
        <p role="alert" className={css.alert}>
          {error}
        </p>
      ) : null}
      <div className={`${css.layout} ${!selected ? css.noDetail : ""}`}>
        <section className={css.tableWrap}>
          {map && view ? (
            <div className={css.embed}>
              <NetworkWorkspace
                lang={lang}
                view={view}
                preview={view.store}
                defaults={[]}
                suggestions={{}}
                readOnly
                canLinkStudent={canLinkStudent}
                embedded
                onSelectNode={(id) => void open(id)}
              />
            </div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th>{t("Customer / family", "客户／家庭")}</th>
                  <th>{t("Owner / collaboration", "负责人／协作")}</th>
                  <th>{t("Current progress", "当前进展")}</th>
                  <th>{t("Next action", "下一步")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => {
                  const live = view?.live[n.id];
                  return (
                    <tr
                      key={n.id}
                      className={n.id === selected ? css.selected : ""}
                    >
                      <td>
                        <button onClick={() => void open(n.id)}>
                          {n.name}
                        </button>
                        <div className={css.small}>
                          {kindLabel(lang, n.kind)}
                          {n.archived ? t(" · archived", " · 已归档") : ""}
                        </div>
                        {!n.studentId &&
                        !n.parentId &&
                        !n.partnerId &&
                        !n.leadId ? (
                          <span className={css.pill}>
                            {t("Identity to review", "身份待核对")}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {users.find((u) => u.id === n.ownerUserId)?.name ||
                          t("Unassigned", "待分配")}
                        <div className={css.small}>
                          {(n.collaboratorUserIds ?? [])
                            .map((id) => users.find((u) => u.id === id)?.name)
                            .filter(Boolean)
                            .join(" / ")}
                        </div>
                      </td>
                      <td>
                        {live?.lead?.status ||
                          live?.project?.status ||
                          live?.relationship?.status ||
                          n.sourceStatus ||
                          (n.studentId || n.parentId || n.partnerId
                            ? t("Open linked details", "查看已关联资料")
                            : t(
                                "Review identity to show business history",
                                "核对关联后展示业务记录",
                              ))}
                      </td>
                      <td>
                        {live?.lead?.nextAction ||
                          live?.relationship?.nextAction ||
                          live?.project?.nextAction ||
                          "—"}
                        <div className={css.small}>
                          {date(
                            live?.lead?.nextActionDue ||
                              live?.relationship?.nextActionDue ||
                              live?.project?.nextActionDue,
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!rows.length ? (
            <div className={css.empty}>
              {t(
                "No customers in this view. Add a new customer, join an assigned collaboration, or ask a manager to assign an existing record.",
                "此范围暂无客户。可新增客户、由负责人加入协作，或请管理员分配已有档案。",
              )}
            </div>
          ) : null}
        </section>
        {selected ? (
          <aside className={css.detail}>
            <button
              style={{ float: "right" }}
              onClick={() => {
                sequence.current++;
                setSelected("");
                setDetail(null);
              }}
            >
              {t("Close", "关闭")}
            </button>
            {loading ? (
              <p>{t("Loading current records…", "正在读取最新档案…")}</p>
            ) : null}
            {detail && view ? (
              <CustomerInspector
                key={detail.node.id + ":" + view.store.revision}
                lang={lang}
                data={detail}
                view={view}
                users={users}
                actorId={actorId}
                canLinkStudent={canLinkStudent}
                readOnly={readOnly}
                onOpen={open}
                onAdd={() => {
                  setParentId(detail.node.id);
                  setAdd(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
function CustomerInspector({
  lang,
  data,
  view,
  users,
  actorId,
  canLinkStudent,
  readOnly,
  onOpen,
  onAdd,
}: {
  lang: Lang;
  data: CustomerDetail;
  view: NetworkView;
  users: User[];
  actorId: string;
  canLinkStudent: boolean;
  readOnly: boolean;
  onOpen: (id: string) => Promise<void>;
  onAdd: () => void;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh),
    n = data.node;
  const [linkType, setLinkType] = useState<NetworkCandidate["type"]>(
      n.kind === "PARENT"
        ? "PARENT"
        : n.kind === "INSTITUTION"
          ? "PARTNER"
          : "STUDENT",
    ),
    [candidate, setCandidate] = useState<NetworkCandidate | null>(null),
    [review, setReview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [owner, setOwner] = useState(n.ownerUserId ?? ""),
    [collaborators, setCollaborators] = useState(n.collaboratorUserIds ?? []),
    [assignmentNote, setAssignmentNote] = useState("");
  const run = async (
    fn: () => Promise<{ ok: boolean; error?: string; nodeId?: string }>,
  ) => {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Error");
        setBusy(false);
        return;
      }
      window.location.assign(
        "/admin/relationships/map?saved=1" +
          (result.nodeId ? "&node=" + encodeURIComponent(result.nodeId) : ""),
      );
    } catch {
      setError(
        t(
          "Save failed. Refresh before retrying.",
          "保存失败，请刷新核对后再试。",
        ),
      );
      setBusy(false);
    }
  };
  const latestRenewal =
    data.finance.access === "ALLOWED"
      ? data.finance.rows.find((r) => r.renewal && r.state === "VERIFIED")
      : undefined;
  return (
    <>
      <div className={css.small}>{kindLabel(lang, n.kind)}</div>
      <h2>{n.name}</h2>
      {data.missing.length ? (
        <p className={css.alert}>
          {t(
            "A linked source record is unavailable; review the identity link.",
            "部分关联档案已不存在，请重新核对关联。",
          )}
        </p>
      ) : null}
      <p className={css.muted}>
        {t("Owner", "负责人")}: {data.owner?.name || t("Unassigned", "待分配")}
        {data.collaborators.length
          ? " · " +
            t("Collaborators", "协作") +
            ": " +
            data.collaborators.map((u) => u.name).join(" / ")
          : ""}
      </p>
      {n.mergedIntoId ? (
        <p className={css.alert}>
          {t("This identity was merged.", "此身份已合并。")}
          <button onClick={() => void onOpen(n.mergedIntoId!)}>
            {t("Open canonical customer", "打开标准客户档案")}
          </button>
        </p>
      ) : null}
      <div className={css.links}>
        {canLinkStudent && n.studentId ? (
          <a href={"/admin/students/" + encodeURIComponent(n.studentId)}>
            {t("Student file", "学生档案")} ↗
          </a>
        ) : null}
        {n.leadId ? (
          <a href={"/admin/leads/" + encodeURIComponent(n.leadId)}>
            {t("Opportunity", "学生商机")} ↗
          </a>
        ) : null}
        {n.relationshipId ? (
          <a
            href={
              "/admin/relationships/" + encodeURIComponent(n.relationshipId)
            }
          >
            {t("Follow-up & projects", "关系跟进／合作项目")} ↗
          </a>
        ) : null}
        {data.partner ? (
          <a href={"/admin/partners#" + encodeURIComponent(data.partner.id)}>
            {t("Partner profile", "合作方档案")} ↗
          </a>
        ) : null}
      </div>
      {!readOnly && n.kind !== "GROUP" ? (
        <>
          {" "}
          <details
            open={
              data.missing.length > 0 ||
              (!n.studentId && !n.parentId && !n.partnerId && !n.leadId)
            }
          >
            <summary>
              {t("Link / correct existing identity", "关联／核对已有档案")}
            </summary>
            <p className={css.muted}>
              {t(
                "Search an exact master record, check identity and save once. No student is created here.",
                "搜索准确的业务档案，核对身份后保存；这里不会新建学生。",
              )}
            </p>
            <label>
              {t("Record type", "档案类型")}
              <select
                value={linkType}
                onChange={(e) => {
                  setLinkType(e.target.value as NetworkCandidate["type"]);
                  setCandidate(null);
                }}
              >
                {canLinkStudent && ["STUDENT", "PERSON"].includes(n.kind) ? (
                  <option value="STUDENT">
                    {t("Existing student", "已有学生")}
                  </option>
                ) : null}
                {["STUDENT", "PERSON"].includes(n.kind) ? (
                  <option value="LEAD">
                    {t("Existing student opportunity", "已有学生商机")}
                  </option>
                ) : null}
                {canLinkStudent && ["PARENT", "PERSON"].includes(n.kind) ? (
                  <option value="PARENT">
                    {t("Existing parent account", "已有家长账号")}
                  </option>
                ) : null}
                {canLinkStudent && n.kind === "INSTITUTION" ? (
                  <option value="PARTNER">
                    {t("Existing partner account", "已有合作方账户")}
                  </option>
                ) : null}
                <option value="RELATIONSHIP">
                  {t("Existing relationship", "已有关系档案")}
                </option>
              </select>
            </label>
            <CandidatePicker
              key={linkType}
              lang={lang}
              type={linkType}
              initialQuery={
                (n.guardianContact?.phone || n.name).trim().split(/\s+/)[0]
              }
              onSelect={setCandidate}
            />
            {candidate ? <p>ID: {candidate.id}</p> : null}
            <label>
              {t("Identity check (required)", "身份核对依据（必填）")}
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={1000}
              />
            </label>
            <button
              className={css.primary}
              disabled={busy || !candidate || !review.trim()}
              onClick={() =>
                void run(() =>
                  linkCustomerAction({
                    revision: data.revision,
                    nodeRevision: n.revision ?? 0,
                    nodeId: n.id,
                    name: n.name,
                    kind: n.kind,
                    note: n.note,
                    edges: [],
                    choice: {
                      nodeId: n.id,
                      mode: linkType,
                      targetId: candidate!.id,
                      reviewNote: review,
                    },
                  }),
                )
              }
            >
              {t("Confirm exact link", "确认准确关联")}
            </button>
          </details>
        </>
      ) : null}
      {n.review ? <p className={css.muted}>{n.review}</p> : null}
      {data.parent ? (
        <p>
          {t("Verified parent account", "已关联家长账号")}:{" "}
          {data.parent.name || "Parent"} · {data.parent.phone || "—"}
        </p>
      ) : null}
      {n.guardianContact ? (
        <p>
          {t("Guardian contact", "家长联系资料")}: {n.guardianContact.name} ·{" "}
          {n.guardianContact.phone || "—"}
          <br />
          {n.guardianContact.relationship}
        </p>
      ) : null}
      {data.students.length ? (
        <>
          <h3>
            {n.kind === "PARENT"
              ? t("Children / family", "孩子／家庭")
              : t("Linked student records", "已关联学生资料")}
          </h3>
          {data.students.map((s) => (
            <div className={css.row} key={s.id}>
              <strong>{s.name}</strong>
              <div className={css.muted}>
                {[s.school, s.grade].filter(Boolean).join(" · ")}
              </div>
              {canLinkStudent ? (
                <a href={"/admin/students/" + encodeURIComponent(s.id)}>
                  {t("Open student file", "打开学生档案")} ↗
                </a>
              ) : null}
              <p>
                {s.nextAction || t("Next action not set", "下一步未设置")} ·{" "}
                {date(s.nextActionDue)}
              </p>
            </div>
          ))}
        </>
      ) : null}
      {data.parents.length ? (
        <>
          <h3>{t("Registered guardians", "现有家长关联")}</h3>
          {data.parents.map((p) => (
            <div key={p.studentId + ":" + p.parent.id} className={css.row}>
              {p.parent.name || "Parent"} · {p.relationship || "—"}
              <div className={css.muted}>{p.parent.phone || "—"}</div>
            </div>
          ))}
        </>
      ) : null}
      {data.lead ? (
        <div className={css.row}>
          <strong>
            {t("Opportunity progress", "商机进展")}: {data.lead.status}
          </strong>
          <p>
            {data.lead.nextAction || t("Next action not set", "下一步未设置")} ·{" "}
            {date(data.lead.nextActionDue)}
          </p>
        </div>
      ) : null}
      {data.partnerStudents.length ? (
        <>
          <h3>{t("Partner-linked students", "合作方关联学生")}</h3>
          {data.partnerStudents.map((s) => (
            <div key={s.id} className={css.row}>
              {s.name} · {s.school || "—"}
              {canLinkStudent ? (
                <div>
                  <a href={"/admin/students/" + encodeURIComponent(s.id)}>
                    {t("Student file", "学生档案")} ↗
                  </a>
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
      {data.relationship?.leads.length ? (
        <>
          <h3>{t("Related student opportunities", "关联学生商机")}</h3>
          {data.relationship.leads.map((l) => (
            <div key={l.id} className={css.row}>
              <a href={"/admin/leads/" + encodeURIComponent(l.id)}>
                {l.studentName} ↗
              </a>{" "}
              · {l.status}
            </div>
          ))}
        </>
      ) : null}
      {data.students.length ? (
        <h3>{t("Packages & renewal", "课包与续费")}</h3>
      ) : null}
      {data.students.length && !data.packages.length ? (
        <p className={css.muted}>
          {t(
            "No packages linked yet. Verify the student identity first.",
            "尚无关联课包，请先核对学生身份。",
          )}
        </p>
      ) : (
        data.packages.map((p) => (
          <div className={css.row} key={p.id}>
            <strong>{p.course.name}</strong> · {p.status}
            <div>
              {p.type === "HOURS"
                ? p.remainingMinutes == null
                  ? t("Balance to review", "余额待核对")
                  : (p.remainingMinutes / 60).toFixed(1) +
                    " " +
                    t("hours remaining", "小时剩余")
                : p.type === "MONTHLY"
                  ? t("Monthly package", "月费课包")
                  : t("Count-based package", "次数课包")}
              {p.shared ? " · " + t("Shared balance", "共享余额") : ""}
            </div>
            <div className={css.small}>
              {t("Valid to", "有效期")}: {date(p.validTo)}
            </div>
            {data.finance.access === "ALLOWED" ? (
              <a
                href={
                  "/admin/packages/" + encodeURIComponent(p.id) + "/billing"
                }
              >
                {t("Billing / contracts / renewal", "账务／合同／续费")} ↗
              </a>
            ) : null}
          </div>
        ))
      )}
      {data.renewals.length ? (
        <>
          <h3>{t("Renewal follow-up", "续费跟进记录")}</h3>
          {data.renewals.map((r) => (
            <div className={css.row} key={r.id}>
              {data.students.find((s) => s.id === r.studentId)?.name} ·{" "}
              {r.status}
              <div className={css.muted}>
                {t("Next follow-up", "下次跟进")}: {date(r.nextFollowUpAt)}
              </div>
            </div>
          ))}
          <div className={css.links}>
            <a href="/admin/renewals">
              {t("Renewal workbench", "续费工作台")} ↗
            </a>
          </div>
        </>
      ) : null}
      {data.students.length || data.partner ? (
        <>
          <h3>
            {n.kind === "INSTITUTION"
              ? t("Partner account invoices & receipts", "合作方账户发票与收款")
              : t(
                  "Customer / family invoices & receipts",
                  "客户／家庭发票与收款",
                )}
          </h3>
          {data.finance.access === "DENIED" ? (
            <p className={css.alert}>
              {t(
                "Financial details require existing finance authorization. No amounts were loaded.",
                "财务详情按原有权限展示，当前账号未读取金额。",
              )}
            </p>
          ) : (
            <>
              {data.finance.invalidSource ? (
                <p className={css.alert}>
                  {t(
                    "Billing source needs reconciliation. Unknown amounts are not counted as zero.",
                    "账务源数据待核对，未知金额不按零计算。",
                  )}
                </p>
              ) : null}
              {latestRenewal ? (
                <div className={css.alert}>
                  <strong>
                    {t("Latest verified renewal", "最近一次已核实续费")}
                  </strong>
                  <div>
                    {latestRenewal.no} · {date(latestRenewal.date)}
                  </div>
                  {t("Invoiced", "开票")} {money(latestRenewal.invoiceCents)} ·{" "}
                  {t("Approved receipts", "批准收据")}{" "}
                  {money(latestRenewal.approvedCents)} ·{" "}
                  {t("Outstanding", "待收")}{" "}
                  {money(latestRenewal.outstandingCents)}
                </div>
              ) : null}
              <div className={css.summary}>
                <div>
                  <span>{t("Verified invoiced", "已核实开票")}</span>
                  <b>{money(data.finance.summary.invoiceCents)}</b>
                </div>
                <div>
                  <span>{t("Approved receipts", "已批准收据金额")}</span>
                  <b>{money(data.finance.summary.approvedCents)}</b>
                </div>
                <div>
                  <span>
                    {t("Outstanding on verified invoices", "核实单据待收")}
                  </span>
                  <b>{money(data.finance.summary.outstandingCents)}</b>
                </div>
              </div>
              <p className={css.muted}>
                {data.finance.note}
                {data.finance.summary.reviewCount
                  ? " · " +
                    data.finance.summary.reviewCount +
                    " " +
                    t("documents to review", "份单据待核对")
                  : ""}
              </p>
              {!data.finance.rows.length ? (
                <p className={css.muted}>
                  {t(
                    "No exact linked billing documents. This does not mean the customer has never paid.",
                    "暂无准确关联的账务单据，不代表客户从未付款。",
                  )}
                </p>
              ) : (
                data.finance.rows.map((row) => (
                  <div className={css.row} key={row.channel + row.id}>
                    <strong>{row.no}</strong>{" "}
                    {data.students.find((s) => s.id === row.studentId)?.name ||
                      ""}{" "}
                    · {date(row.date || null)}
                    {row.renewal ? (
                      <span className={css.pill}>{t("Renewal", "续费")}</span>
                    ) : null}
                    <div>
                      {row.state === "VERIFIED"
                        ? `${t("Invoice", "开票")} ${money(row.invoiceCents)} · ${t("Approved receipts", "批准收据")} ${money(row.approvedCents)} · ${t("Outstanding", "待收")} ${money(row.outstandingCents)}`
                        : row.reason}
                    </div>
                    {row.creditCents ? (
                      <div>
                        {t(
                          "Issued credits (not cash refunds)",
                          "已开贷项（不代表现金退款）",
                        )}
                        : {money(row.creditCents)}
                      </div>
                    ) : null}
                    {row.pendingReceipts || row.rejectedReceipts ? (
                      <div className={css.small}>
                        {t("Pending / rejected receipts", "待批／被拒收据")}:{" "}
                        {row.pendingReceipts} / {row.rejectedReceipts}
                      </div>
                    ) : null}
                    {row.receipts.map((r, i) => (
                      <div key={i} className={css.small}>
                        {r.no} · {r.status} · {r.payer} ·{" "}
                        {r.date || t("Date unrecorded", "日期未记录")} ·{" "}
                        {money(r.amountCents)}{" "}
                        {t(
                          "(receipt record; approval total above)",
                          "（收据记录，批准计入口径见上）",
                        )}
                      </div>
                    ))}
                    <a href={row.href}>
                      {t("Open original billing record", "查看原始账务记录")} ↗
                    </a>
                  </div>
                ))
              )}
            </>
          )}
        </>
      ) : null}
      {data.contracts.length ? (
        <>
          <h3>{t("Contracts", "合同记录")}</h3>
          {data.contracts.map((c) => (
            <div key={c.id} className={css.row}>
              {c.flowType} · {c.status} · {date(c.signedAt)}
              {c.packageId ? (
                <div>
                  <a
                    href={
                      "/admin/packages/" +
                      encodeURIComponent(c.packageId) +
                      "/billing#contract-flow"
                    }
                  >
                    {t("Open contract workflow", "打开合同流程")} ↗
                  </a>
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
      {data.relationship ? (
        <>
          <h3>{t("Relationship follow-up", "关系跟进")}</h3>
          <p>
            {data.relationship.nextAction ||
              t("Next action not set", "下一步未设置")}{" "}
            · {date(data.relationship.nextActionDue)}
          </p>
          {data.relationship.followUps.map((f) => (
            <div key={f.id} className={css.row}>
              {f.content}
              <div className={css.small}>
                {f.actorName} · {date(f.createdAt)}
              </div>
            </div>
          ))}
          <h3>{t("Cooperation projects", "合作项目")}</h3>
          {data.relationship.opportunities.map((p) => (
            <div key={p.id} className={css.row}>
              {p.title} · {p.status}
              <div>
                {p.nextAction || "—"} · {date(p.nextActionDue)}
              </div>
            </div>
          ))}
        </>
      ) : null}
      <h3>{t("Connections", "关联对象")}</h3>
      {data.connections.map((c) => (
        <div key={c.id} className={css.row}>
          <button onClick={() => void onOpen(c.nodeId)}>{c.name}</button> ·{" "}
          {c.label}{" "}
          <span className={css.small}>
            {c.confirmed ? t("Reviewed", "已核对") : t("To review", "待核对")}
          </span>
        </div>
      ))}
      {!readOnly ? (
        <details>
          <summary>{t("Review connection meanings", "核对关系含义")}</summary>
          {data.connections.map((c) => (
            <ConnectionReview
              key={c.id}
              lang={lang}
              nodeId={n.id}
              connection={c}
            />
          ))}
        </details>
      ) : null}
      {!readOnly ? (
        <>
          <hr />
          {data.manager || n.ownerUserId === actorId ? (
            <details>
              <summary>{t("Owner & collaborators", "负责人及协作人")}</summary>
              <label>
                {t("Main owner", "主负责人")}
                <select
                  disabled={!data.manager}
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  <option value="">{t("Select an owner", "选择负责人")}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.id.slice(-4)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Collaborators (multiple)", "协作人（可多选）")}
                <select
                  multiple
                  value={collaborators}
                  onChange={(e) =>
                    setCollaborators(
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                >
                  {users
                    .filter((u) => u.id !== owner)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · {u.id.slice(-4)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t("Assignment reason", "分配／转交依据")}
                <textarea
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !owner || !assignmentNote.trim()}
                onClick={() =>
                  void run(() =>
                    assignCustomerAction({
                      nodeId: n.id,
                      revision: data.revision,
                      nodeRevision: n.revision ?? 0,
                      ownerUserId: owner,
                      collaboratorUserIds: collaborators,
                      note: assignmentNote,
                    }),
                  )
                }
              >
                {t("Save assignment", "保存分配")}
              </button>
            </details>
          ) : null}
          <NodeMaintenance
            lang={lang}
            store={view.store}
            node={n}
            onAdd={onAdd}
          />
        </>
      ) : null}
      {error ? (
        <p className={css.alert} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function ConnectionReview({
  lang,
  nodeId,
  connection,
}: {
  lang: string;
  nodeId: string;
  connection: CustomerDetail["connections"][number];
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const [label, setLabel] = useState(connection.label),
    [meaning, setMeaning] = useState(connection.meaning ?? "CONTACT"),
    [confirmed, setConfirmed] = useState(connection.confirmed),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className={css.row}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await reviewCustomerConnectionAction({
            nodeId,
            edgeId: connection.id,
            edgeRevision: connection.revision ?? 0,
            label,
            meaning,
            confirmed,
            note,
          });
          if (!r.ok) {
            setError(r.error ?? "Error");
            setBusy(false);
          } else
            window.location.assign(
              "/admin/relationships/map?node=" + encodeURIComponent(nodeId),
            );
        } catch {
          setError(t("Save failed; refresh", "保存失败，请刷新"));
          setBusy(false);
        }
      }}
    >
      <strong>{connection.name}</strong>
      <label>
        {t("Meaning", "关系类型")}
        <select
          value={meaning}
          onChange={(e) => setMeaning(e.target.value as typeof meaning)}
        >
          <option value="CONTACT">{t("Contact", "一般联系")}</option>
          <option value="GUARDIAN">
            {t("Guardian / child", "监护人／孩子")}
          </option>
          <option value="REFERRAL">{t("Referral", "介绍来源")}</option>
          <option value="SCHOOL">{t("School", "学校联系")}</option>
        </select>
      </label>
      <input
        value={label}
        required
        maxLength={160}
        onChange={(e) => setLabel(e.target.value)}
      />
      <label className={css.check}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {t("Verified against business facts", "已按业务事实核对")}
      </label>
      <textarea
        required
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("Verification basis", "核对依据")}
      />
      <button disabled={busy}>{t("Save review", "保存核对")}</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
