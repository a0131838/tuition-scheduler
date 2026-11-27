import { createHash } from "node:crypto";
import type {
  NetworkNode,
  NetworkEdge,
  NetworkStore,
} from "./sales-network-types";
// A reviewed template for the supplied PDF. Text order alone never establishes graph edges.
export const GT_NETWORK_HASH =
  "09ae627c6ddbcb4f8c19c8f1925d561655f164d6f3bdf647b6a0f8975c99f785";
export const GT_NETWORK_NAME = "gt-educational-relationship-network.pdf";
export const NETWORK_KEY = `sales_relationship_network_v1:${GT_NETWORK_HASH}`;
export function verifyNetworkPdf(bytes: Uint8Array) {
  if (
    bytes.length > 5 * 1024 * 1024 ||
    createHash("sha256").update(bytes).digest("hex") !== GT_NETWORK_HASH
  )
    throw new Error(
      "This PDF has no reviewed import template yet. Please use the supplied GT relationship PDF. / 这份PDF尚无已核对导入模板，请选择本次GT关系PDF。",
    );
}
export function reviewedNetwork(): NetworkStore {
  const nodes: NetworkNode[] = [],
    edges: NetworkEdge[] = [];
  function n(
    id: string,
    name: string,
    kind: NetworkNode["kind"],
    x: number,
    y: number,
    sourceStatus = "",
    review = "",
  ) {
    nodes.push({ id, name, kind, x, y, sourceStatus, review, note: "" });
  }
  function e(
    from: string,
    to: string,
    label: string,
    style: NetworkEdge["style"] = "DIRECT",
  ) {
    edges.push({
      id: `${from}:${to}`,
      from,
      to,
      label,
      style,
      confirmed: false,
    });
  }
  n("jasmine", "Jasmine / GT Educational Institute", "ROOT", 30, 450);
  n("nlcs", "NLCS", "INSTITUTION", 350, 80);
  n("keystone", "Keystone Education", "INSTITUTION", 350, 650);
  n(
    "candy",
    "Candy",
    "PERSON",
    350,
    1150,
    "",
    "Independent referral / 独立介绍路径",
  );
  e("jasmine", "nlcs", "relationship network");
  e("jasmine", "keystone", "relationship network");
  e("nlcs", "keystone", "listed connection", "CONNECTION");
  e("jasmine", "candy", "independent referral", "CONNECTION");
  const nlcs = [
    ["coco-eason", "Coco and Eason"],
    ["alex", "Alex Liu"],
    ["zack", "Zack Ouyang Xinen"],
    ["qihao", "Chen Qihao"],
    ["junhao", "Chen Junhao"],
  ];
  nlcs.forEach(([id, name], i) => {
    n(
      id,
      name,
      id === "coco-eason" ? "GROUP" : "PERSON",
      690,
      30 + i * 100,
      "",
      id === "coco-eason"
        ? "Confirm identities before splitting / 请核对身份后拆分"
        : "School link is not proof of enrolment or referral / 学校连接不代表已就读或介绍",
    );
    e("nlcs", id, "listed connection");
  });
  n("mdm-su", "Mdm Su", "PARENT", 1030, 330);
  e("qihao", "mdm-su", "mother");
  n("steven", "Steven Cai", "PERSON", 1370, 280);
  n(
    "steven-allie",
    "Steven and Allie Su",
    "GROUP",
    1370,
    380,
    "",
    "Confirm identities before splitting / 请核对身份后拆分",
  );
  e("mdm-su", "steven", "connection", "CONNECTION");
  e("mdm-su", "steven-allie", "connection", "CONNECTION");
  const ks = [
    ["yichen", "Zhu Yichen"],
    ["junchi", "Junchi"],
    ["xingyu", "Chen Xingyu"],
    ["felix", "Wang Yuxuan (Felix)"],
    ["wang", "Wang Yuxuan (汪)"],
    ["zihao", "Huang Zihao"],
    ["hexuan", "Li Hexuan"],
    ["jinze", "Jinze"],
  ];
  ks.forEach(([id, name], i) => {
    n(
      id,
      name,
      "PERSON",
      690,
      540 + i * 100,
      "",
      ["felix", "wang"].includes(id)
        ? "Similar names: keep separate until identity verified / 姓名相近，核对前分别保留"
        : "School link is not proof of enrolment or referral / 学校连接不代表已就读或介绍",
    );
    e("keystone", id, "listed connection");
  });
  n("mdm-xue", "Mdm Xue", "PARENT", 1030, 540);
  e("yichen", "mdm-xue", "mother");
  n("suyujie", "Su Yujie", "PERSON", 1370, 540, "prospect");
  e("mdm-xue", "suyujie", "prospect", "CONNECTION");
  n("xingyu-mom", "Chen Xingyu's mom", "PARENT", 1030, 740);
  e("xingyu", "xingyu-mom", "mother");
  n("sally", "Sally (Li Ziyi)", "PERSON", 1370, 690, "status unconfirmed");
  n("emily", "Emily Yu", "PERSON", 1370, 790, "prospect");
  e("xingyu-mom", "sally", "status unconfirmed", "CONNECTION");
  e("xingyu-mom", "emily", "prospect", "CONNECTION");
  n("shuhe", "Zhang Shuhe", "PERSON", 350, 1290, "prospect");
  e("candy", "shuhe", "prospect", "CONNECTION");
  // Bottom row is a visual grouping, not a chain of referrals between institutions.
  [
    ["horton", "Horton IELTS", "In discussion"],
    ["meraki", "Meraki Group", "In discussion"],
    ["brentvale", "Brentvale College", "Secondment: KIV / In discussion"],
    ["ds", "DS Residences", "KIV: to meet up"],
  ].forEach(([id, name, status], i) => {
    n(id, name, "INSTITUTION", 350 + i * 340, 1490, status);
    e("jasmine", id, "partnership pipeline", "PIPELINE");
  });
  return {
    version: 1,
    revision: 1,
    sourceHash: GT_NETWORK_HASH,
    sourceName: GT_NETWORK_NAME,
    ownerName: "Jasmine",
    importedAt: "",
    importedBy: "",
    nodes,
    edges,
  };
}
export function defaultCreateRelationship(node: NetworkNode) {
  return (
    node.kind === "INSTITUTION" || node.kind === "PARENT" || node.id === "candy"
  );
}
