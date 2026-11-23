/** Source wording stays separate from verified CRM identities. */
export const NETWORK_KINDS = [
  "ROOT",
  "INSTITUTION",
  "PERSON",
  "STUDENT",
  "PARENT",
  "GROUP",
] as const;
export type NetworkKind = (typeof NETWORK_KINDS)[number];
export type NetworkNode = {
  id: string;
  name: string;
  kind: NetworkKind;
  x: number;
  y: number;
  sourceStatus: string;
  review: string;
  relationshipId?: string;
  studentId?: string;
  leadId?: string;
  projectId?: string;
  note: string;
};
export type NetworkEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  style: "DIRECT" | "CONNECTION" | "PIPELINE";
  confirmed: boolean;
};
export type NetworkStore = {
  version: 1;
  revision: number;
  sourceHash: string;
  sourceName: string;
  ownerName: string;
  importedAt: string;
  importedBy: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};
export type NetworkCandidate = {
  id: string;
  name: string;
  type: "RELATIONSHIP" | "STUDENT" | "LEAD";
  detail: string;
};
export type NetworkChoice = {
  nodeId: string;
  mode: "KEEP" | "CREATE" | "RELATIONSHIP" | "STUDENT" | "LEAD" | "UNLINK";
  targetId?: string;
  reviewNote?: string;
};
export type NetworkLive = {
  relationship?: {
    id: string;
    name: string;
    status: string;
    ownerName: string | null;
    nextAction: string | null;
    nextActionDue: string | null;
    students: number;
    openLeads: number;
    opportunities: Array<{ id: string; name: string; status: string }>;
    latestFollowUp: { content: string; createdAt: string } | null;
  };
  student?: {
    id: string;
    name: string;
    school: string | null;
    grade: string | null;
  };
  lead?: {
    id: string;
    name: string;
    status: string;
    nextAction: string | null;
    nextActionDue: string | null;
  };
  project?: {
    id: string;
    title: string;
    status: string;
    nextAction: string | null;
    nextActionDue: string | null;
  };
  missing: string[];
};
export type NetworkView = {
  store: NetworkStore;
  live: Record<string, NetworkLive>;
};
export const networkText = (lang: string, en: string, zh: string) =>
  lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
export function kindLabel(lang: string, kind: NetworkKind) {
  const labels: Record<NetworkKind, [string, string]> = {
    ROOT: ["Owner", "负责人"],
    INSTITUTION: ["Institution", "机构"],
    PERSON: ["Person · role unconfirmed", "人员·身份待核对"],
    STUDENT: ["Student", "学生"],
    PARENT: ["Parent", "家长"],
    GROUP: ["Combined name · review", "组合姓名·待核对"],
  };
  return networkText(lang, ...labels[kind]);
}
export function validateNetworkStore(value: unknown): NetworkStore {
  const s = value as NetworkStore;
  if (
    !s ||
    s.version !== 1 ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 1 ||
    !Array.isArray(s.nodes) ||
    !Array.isArray(s.edges) ||
    s.nodes.length > 200 ||
    s.edges.length > 400 ||
    typeof s.sourceHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(s.sourceHash) ||
    typeof s.sourceName !== "string" ||
    typeof s.ownerName !== "string" ||
    typeof s.importedAt !== "string" ||
    typeof s.importedBy !== "string"
  )
    throw new Error("Invalid network data / 关系地图数据异常");
  const ids = new Set<string>();
  for (const n of s.nodes) {
    if (
      !n ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      !NETWORK_KINDS.includes(n.kind) ||
      typeof n.name !== "string" ||
      !n.name.trim() ||
      n.name.length > 160 ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      typeof n.sourceStatus !== "string" ||
      typeof n.review !== "string" ||
      typeof n.note !== "string" ||
      [n.relationshipId, n.studentId, n.leadId, n.projectId].some(
        (v) =>
          v !== undefined && (typeof v !== "string" || !v || v.length > 100),
      )
    )
      throw new Error("Invalid network node / 关系节点数据异常");
    ids.add(n.id);
  }
  const edges = new Set<string>();
  for (const e of s.edges) {
    if (
      !e ||
      typeof e.id !== "string" ||
      edges.has(e.id) ||
      !ids.has(e.from) ||
      !ids.has(e.to) ||
      e.from === e.to ||
      typeof e.label !== "string" ||
      e.label.length > 160 ||
      !["DIRECT", "CONNECTION", "PIPELINE"].includes(e.style) ||
      typeof e.confirmed !== "boolean"
    )
      throw new Error("Invalid network edge / 关系连线数据异常");
    edges.add(e.id);
  }
  return s;
}
