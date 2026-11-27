import { mergeCustomerNodes } from "./customer-registry";
import {
  customerTeamManager,
  assertCustomerVisible,
  scopedCustomerStore,
  type CustomerScope,
} from "./customer-access";
import { randomUUID } from "node:crypto";
import { allocateLeadNo, LEAD_SOURCE_TYPES } from "./leads";
import { organizeNetwork, connectionWouldCycle } from "./sales-network-layout";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  assertRelationshipWrite,
  type RelationshipActor,
} from "./sales-relationship-policy";
import { mutateSalesRelationshipInTransaction } from "./sales-relationships";
import {
  GT_NETWORK_HASH,
  NETWORK_KEY,
  reviewedNetwork,
  defaultCreateRelationship,
} from "./sales-network-source";
import {
  validateNetworkStore,
  type NetworkStore,
  type NetworkChoice,
  type NetworkNode,
  type NetworkView,
  type NetworkCandidate,
  NETWORK_KINDS,
} from "./sales-network-types";
import { canAccessResourceWorkspaceRole } from "./staff-roles";

type Db = Prisma.TransactionClient;
function readable(actor: RelationshipActor) {
  if (!canAccessResourceWorkspaceRole(actor.role) && !actor.operationsAdmin)
    throw new Error("No network access / 无权查看关系地图");
}
export function mayLinkStudent(actor: RelationshipActor) {
  return actor.role === "ADMIN" || Boolean(actor.operationsAdmin);
}
async function audit(
  tx: Db,
  actor: RelationshipActor,
  action: string,
  meta: unknown,
) {
  await tx.auditLog.create({
    data: {
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      module: "SALES_RELATIONSHIP",
      action,
      entityType: "SalesNetwork",
      entityId: GT_NETWORK_HASH,
      meta: JSON.parse(JSON.stringify(meta)),
    },
  });
}
async function lockedStore(tx: Db) {
  // Serializes the initial insert as well as updates; there may be no AppSetting row yet.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(731923, 1123)::text`;
  const row = await tx.appSetting.findUnique({ where: { key: NETWORK_KEY } });
  return row ? validateNetworkStore(JSON.parse(row.value)) : null;
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || value.trim().length > max)
    throw new Error("Invalid text / 输入内容无效");
  return value.trim();
}
async function choose(
  tx: Db,
  actor: RelationshipActor,
  node: NetworkNode,
  c: NetworkChoice,
) {
  if (
    ![
      "KEEP",
      "CREATE",
      "RELATIONSHIP",
      "STUDENT",
      "LEAD",
      "PARENT",
      "PARTNER",
      "UNLINK",
    ].includes(c.mode)
  )
    throw new Error("Invalid import choice / 导入选项无效");
  if (c.mode === "KEEP") return;
  if (node.kind === "ROOT" || node.kind === "GROUP")
    throw new Error(
      "Review this combined identity before linking / 请先核对组合身份，不可直接关联",
    );
  const review = text(c.reviewNote ?? "", 1000);
  if (!review)
    throw new Error("Record the identity check / 请填写身份核对依据");
  if (c.mode === "UNLINK") {
    delete node.relationshipId;
    delete node.studentId;
    delete node.leadId;
    delete node.projectId;
    delete node.parentId;
    delete node.partnerId;
    node.review = review;
    return;
  }
  if (c.mode === "CREATE") {
    if (node.relationshipId)
      throw new Error("Already linked to a relationship / 已关联关系档案");
    const id = await mutateSalesRelationshipInTransaction(tx, actor, {
      action: "CREATE",
      values: {
        name: node.name,
        kind:
          node.kind === "INSTITUTION"
            ? ["nlcs", "keystone"].includes(node.id)
              ? "SCHOOL"
              : "PARTNER"
            : node.kind === "PARENT"
              ? "PARENT"
              : "CONTACT",
        status: "NURTURING",
        ownerName: actor.name,
        note: `PDF: ${node.name}\n${node.sourceStatus}\n${review}\nSource: ${GT_NETWORK_HASH}`,
      },
    });
    node.relationshipId = id;
    if (["horton", "meraki", "brentvale", "ds"].includes(node.id)) {
      // Original status stays verbatim. KIV does not mean lost or closed.
      const project = await tx.salesRelationshipOpportunity.create({
        data: {
          relationshipId: id,
          title: `${node.name} - cooperation`,
          status: "OPEN",
          ownerName: "Jasmine",
          note: `PDF status: ${node.sourceStatus}. Imported as open pending review; no amount or due date inferred.`,
        },
      });
      node.projectId = project.id;
      await audit(tx, actor, "NETWORK_CREATE_PROJECT", {
        nodeId: node.id,
        projectId: project.id,
        originalStatus: node.sourceStatus,
      });
    }
  } else if (c.mode === "RELATIONSHIP") {
    const row = await tx.salesRelationship.findUnique({
      where: { id: text(c.targetId ?? "", 100) },
    });
    if (!row || row.status === "ARCHIVED")
      throw new Error("Selected relationship unavailable / 所选关系不可用");
    if (node.relationshipId !== row.id) delete node.projectId;
    node.relationshipId = row.id;
  } else if (c.mode === "STUDENT") {
    if (!mayLinkStudent(actor))
      throw new Error(
        "Student identity linking requires an administrator / 学生身份关联需要管理员处理",
      );
    if (!["PERSON", "STUDENT"].includes(node.kind))
      throw new Error(
        "Confirm an individual student identity first / 请先确认单个学生身份",
      );
    const row = await tx.student.findUnique({
      where: { id: text(c.targetId ?? "", 100) },
      select: { id: true },
    });
    if (!row) throw new Error("Selected student unavailable / 所选学生不存在");
    if (node.leadId) {
      const lead = await tx.lead.findUnique({
        where: { id: node.leadId },
        select: { convertedStudentId: true },
      });
      if (lead?.convertedStudentId && lead.convertedStudentId !== row.id)
        throw new Error(
          "Student conflicts with the linked lead / 学生与已关联商机冲突",
        );
    }
    node.studentId = row.id;
    node.kind = "STUDENT";
  } else if (c.mode === "PARENT" || c.mode === "PARTNER") {
    if (
      !mayLinkStudent(actor) ||
      (c.mode === "PARTNER" && actor.operationsAdmin)
    )
      throw new Error(
        "This identity link needs an authorized administrator / 此身份关联需要授权管理员",
      );
    if (
      (c.mode === "PARENT" && !["PARENT", "PERSON"].includes(node.kind)) ||
      (c.mode === "PARTNER" && node.kind !== "INSTITUTION")
    )
      throw new Error(
        "Confirm the correct customer type first / 请先核对客户类型",
      );
    const id = text(c.targetId ?? "", 100);
    if (c.mode === "PARENT") {
      await tx.parentAccount.findUniqueOrThrow({
        where: { id },
        select: { id: true },
      });
      node.parentId = id;
      node.kind = "PARENT";
    } else {
      await tx.partner.findUniqueOrThrow({
        where: { id },
        select: { id: true },
      });
      node.partnerId = id;
    }
  } else {
    if (!["PERSON", "STUDENT"].includes(node.kind))
      throw new Error(
        "Confirm an individual student identity first / 请先确认单个学生身份",
      );
    const row = await tx.lead.findUnique({
      where: { id: text(c.targetId ?? "", 100) },
      select: {
        id: true,
        recordKind: true,
        isArchived: true,
        convertedStudentId: true,
      },
    });
    if (!row || row.isArchived || row.recordKind !== "STUDENT")
      throw new Error(
        "Select a classified, current student opportunity / 请选择已分类且有效的学生商机",
      );
    if (
      node.studentId &&
      row.convertedStudentId &&
      node.studentId !== row.convertedStudentId
    )
      throw new Error(
        "Lead conflicts with the linked student / 商机与已关联学生冲突",
      );
    node.leadId = row.id;
  }
  node.review = review;
}
async function assertDistinctIdentities(tx: Db, nodes: NetworkNode[]) {
  const leads = await tx.lead.findMany({
    where: { id: { in: nodes.flatMap((n) => (n.leadId ? [n.leadId] : [])) } },
    select: { id: true, convertedStudentId: true },
  });
  const seen = new Map<string, string>();
  for (const node of nodes) {
    const leadStudent = leads.find(
      (l) => l.id === node.leadId,
    )?.convertedStudentId;
    if (node.studentId && leadStudent && node.studentId !== leadStudent)
      throw new Error(
        "Student conflicts with the linked lead / 学生与已关联商机冲突",
      );
    for (const studentId of new Set(
      [node.studentId, leadStudent].filter((v): v is string => Boolean(v)),
    )) {
      if (seen.has(studentId) && seen.get(studentId) !== node.id)
        throw new Error(
          "Two PDF identities cannot silently merge into one student / 不同PDF对象不可静默合并到同一学生",
        );
      seen.set(studentId, node.id);
    }
  }
}
export async function importNetworkInTransaction(
  tx: Db,
  actor: RelationshipActor,
  choices: NetworkChoice[],
) {
  assertRelationshipWrite(actor);
  const current = await lockedStore(tx);
  if (current) return { alreadyImported: true, store: current };
  const store = reviewedNetwork();
  if (
    !Array.isArray(choices) ||
    choices.length !== store.nodes.length ||
    new Set(choices.map((c) => c.nodeId)).size !== store.nodes.length ||
    choices.some((c) => !store.nodes.some((n) => n.id === c.nodeId))
  )
    throw new Error("Review all import rows / 请核对全部导入记录");
  for (const c of choices) {
    const n = store.nodes.find((n) => n.id === c.nodeId)!;
    if (c.mode === "KEEP" && n.kind !== "ROOT" && c.reviewNote)
      n.review = [n.review, text(c.reviewNote, 1000)]
        .filter(Boolean)
        .join("\n");
    n.ownerUserId = actor.id;
    n.collaboratorUserIds = [];
    await choose(tx, actor, n, c);
  }
  const studentIds = store.nodes.flatMap((n) =>
      n.studentId ? [n.studentId] : [],
    ),
    leadIds = store.nodes.flatMap((n) => (n.leadId ? [n.leadId] : [])),
    relationshipIds = store.nodes.flatMap((n) =>
      n.relationshipId ? [n.relationshipId] : [],
    );
  if (
    [studentIds, leadIds, relationshipIds].some(
      (ids) => new Set(ids).size !== ids.length,
    )
  )
    throw new Error(
      "Two PDF identities cannot silently merge into one record / 不同PDF对象不可静默合并到同一档案",
    );
  await assertDistinctIdentities(tx, store.nodes);
  store.importedAt = new Date().toISOString();
  store.importedBy = actor.name;
  await tx.appSetting.create({
    data: { key: NETWORK_KEY, value: JSON.stringify(store) },
  });
  await audit(tx, actor, "NETWORK_IMPORT", {
    sourceHash: store.sourceHash,
    nodeCount: store.nodes.length,
    edgeCount: store.edges.length,
    choices,
  });
  return { alreadyImported: false, store };
}
export async function importNetwork(
  actor: RelationshipActor,
  choices: NetworkChoice[],
) {
  assertRelationshipWrite(actor);
  return prisma.$transaction(
    (tx) => importNetworkInTransaction(tx, actor, choices),
    { maxWait: 10000, timeout: 30000 },
  );
}
export type NetworkEdit = {
  revision: number;
  nodeRevision?: number;
  nodeId: string;
  name: string;
  kind: NetworkNode["kind"];
  note: string;
  choice?: NetworkChoice;
  edges: Array<{ id: string; label: string; confirmed: boolean }>;
};
export async function editNetworkInTransaction(
  tx: Db,
  actor: RelationshipActor,
  input: NetworkEdit,
) {
  assertRelationshipWrite(actor);
  const store = await lockedStore(tx);
  if (!store)
    throw new Error(
      "Network changed; reload before saving / 地图已更新，请刷新后保存",
    );
  const node = store.nodes.find((n) => n.id === input.nodeId);
  if (!node) throw new Error("Node unavailable / 节点不存在");
  if (
    input.nodeRevision === undefined
      ? store.revision !== input.revision
      : (node.revision ?? 0) !== input.nodeRevision
  )
    throw new Error(
      "Customer changed; reload before saving / 客户已更新，请刷新后保存",
    );
  assertCustomerVisible(actor, node, await customerTeamManager(actor,tx));
  if (node.kind === "ROOT" && !(await customerTeamManager(actor,tx)))
    throw new Error(
      "Only a manager can change the central node / 中心节点仅限管理人员修改",
    );
  const before = JSON.parse(JSON.stringify(node)),
    beforeEdges = JSON.parse(
      JSON.stringify(
        store.edges.filter((e) => e.from === node.id || e.to === node.id),
      ),
    );
  if (node.kind === "ROOT" || node.kind === "GROUP") {
    if (input.kind !== node.kind)
      throw new Error(
        "Combined identities need separate review / 组合身份需要另行核对",
      );
  }
  if (
    !NETWORK_KINDS.includes(input.kind) ||
    (input.kind === "ROOT" && node.kind !== "ROOT") ||
    (input.kind === "GROUP" && node.kind !== "GROUP")
  )
    throw new Error("Invalid node type / 节点类型无效");
  if (
    (node.studentId || node.leadId) &&
    !["PERSON", "STUDENT"].includes(input.kind)
  )
    throw new Error(
      "Review existing student links first / 请先核对已有学生关联",
    );
  node.name = text(input.name, 160);
  if (!node.name) throw new Error("Name is required / 请填写名称");
  node.kind = input.kind;
  node.note = text(input.note, 2000);
  if (input.choice) {
    if (input.choice.nodeId !== node.id)
      throw new Error("Invalid target node / 目标节点无效");
    await choose(tx, actor, node, input.choice);
    const field = (
      {
        STUDENT: "studentId",
        PARENT: "parentId",
        PARTNER: "partnerId",
        RELATIONSHIP: "relationshipId",
        LEAD: "leadId",
      } as const
    )[
      input.choice.mode as
        | "STUDENT"
        | "PARENT"
        | "PARTNER"
        | "RELATIONSHIP"
        | "LEAD"
    ];
    const canonical =
      field &&
      store.nodes.find(
        (n) =>
          n.id !== node.id &&
          !n.mergedIntoId &&
          n[field] === node[field] &&
          Boolean(n[field]),
      );
    if (canonical)
      mergeCustomerNodes(
        store,
        canonical,
        node,
        actor,
        await customerTeamManager(actor,tx),
        input.choice.reviewNote ?? "",
      );
  }
  for (const key of [
    "studentId",
    "parentId",
    "partnerId",
    "leadId",
    "relationshipId",
  ] as const)
    if (
      node[key] &&
      store.nodes.some((n) => n.id !== node.id && n[key] === node[key])
    )
      throw new Error(
        "Another PDF identity already links to that record / 另一PDF对象已关联该档案，请核对身份",
      );
  if (!Array.isArray(input.edges) || input.edges.length > store.edges.length)
    throw new Error("Invalid connections / 连线数据无效");
  for (const change of input.edges) {
    const edge = store.edges.find(
      (e) => e.id === change.id && (e.from === node.id || e.to === node.id),
    );
    if (!edge || typeof change.confirmed !== "boolean")
      throw new Error("Invalid connection / 连线无效");
    const team = await customerTeamManager(actor,tx);
    for (const id of [edge.from, edge.to]) {
      const endpoint = store.nodes.find((n) => n.id === id)!;
      assertCustomerVisible(actor, endpoint, team);
    }
    edge.label = text(change.label, 160);
    if (!edge.label)
      throw new Error("Connection label is required / 请填写关系含义");
    edge.confirmed = change.confirmed;
  }
  node.revision = (node.revision ?? 0) + 1;
  await assertDistinctIdentities(tx, store.nodes);
  store.revision += 1;
  validateNetworkStore(store);
  await tx.appSetting.update({
    where: { key: NETWORK_KEY },
    data: { value: JSON.stringify(store) },
  });
  await audit(tx, actor, "NETWORK_EDIT", {
    before,
    after: node,
    beforeConnections: beforeEdges,
    connections: input.edges,
    revision: store.revision,
    identityChoice: input.choice ?? null,
    afterCanonical: node.mergedIntoId
      ? store.nodes.find((n) => n.id === node.mergedIntoId)
      : null,
  });
  return store;
}
export async function editNetwork(
  actor: RelationshipActor,
  input: NetworkEdit,
) {
  assertRelationshipWrite(actor);
  return prisma.$transaction(
    (tx) => editNetworkInTransaction(tx, actor, input),
    { timeout: 30000 },
  );
}
export async function readNetwork(
  actor: RelationshipActor,
  options?: { scope: CustomerScope; ownerId?: string },
): Promise<NetworkView | null> {
  readable(actor);
  const row = await prisma.appSetting.findUnique({
    where: { key: NETWORK_KEY },
  });
  if (!row) return null;
  const rawStore = validateNetworkStore(JSON.parse(row.value));
  const team = await customerTeamManager(actor);
  const store = scopedCustomerStore(
    rawStore,
    actor,
    options?.scope ?? (team ? "team" : "mine"),
    team,
    options?.ownerId,
  );
  const [relationships, students, leads, projects] = await Promise.all([
    prisma.salesRelationship.findMany({
      where: {
        id: {
          in: store.nodes.flatMap((n) =>
            n.relationshipId ? [n.relationshipId] : [],
          ),
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        ownerName: true,
        nextAction: true,
        nextActionDue: true,
        leads: {
          where: { recordKind: "STUDENT" },
          select: {
            id: true,
            studentName: true,
            convertedStudentId: true,
            status: true,
            isArchived: true,
          },
        },
        followUps: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
    }),
    prisma.student.findMany({
      where: {
        id: {
          in: store.nodes.flatMap((n) => (n.studentId ? [n.studentId] : [])),
        },
      },
      select: { id: true, name: true, school: true, grade: true },
    }),
    prisma.lead.findMany({
      where: {
        id: { in: store.nodes.flatMap((n) => (n.leadId ? [n.leadId] : [])) },
      },
      select: {
        id: true,
        studentName: true,
        status: true,
        nextAction: true,
        nextActionDue: true,
        isArchived: true,
      },
    }),
    prisma.salesRelationshipOpportunity.findMany({
      where: {
        id: {
          in: store.nodes.flatMap((n) => (n.projectId ? [n.projectId] : [])),
        },
      },
      select: {
        id: true,
        relationshipId: true,
        title: true,
        status: true,
        nextAction: true,
        nextActionDue: true,
      },
    }),
  ]);
  const live: NetworkView["live"] = {};
  for (const n of store.nodes) {
    const r = relationships.find((r) => r.id === n.relationshipId),
      s = students.find((s) => s.id === n.studentId),
      l = leads.find((l) => l.id === n.leadId),
      p = projects.find(
        (p) => p.id === n.projectId && p.relationshipId === n.relationshipId,
      );
    live[n.id] = {
      missing: [],
      ...(r
        ? {
            relationship: {
              id: r.id,
              name: r.name,
              status: r.status,
              ownerName: r.ownerName,
              nextAction: r.nextAction,
              nextActionDue: r.nextActionDue?.toISOString() ?? null,
              students: new Set(
                r.leads.flatMap((l) =>
                  l.convertedStudentId ? [l.convertedStudentId] : [],
                ),
              ).size,
              openLeads: r.leads.filter(
                (l) => !l.isArchived && !["Won", "Lost"].includes(l.status),
              ).length,
              opportunities: r.leads.slice(0, 20).map((l) => ({
                id: l.id,
                name: l.studentName,
                status: l.isArchived ? "ARCHIVED" : l.status,
              })),
              latestFollowUp: r.followUps[0]
                ? {
                    content: r.followUps[0].content,
                    createdAt: r.followUps[0].createdAt.toISOString(),
                  }
                : null,
            },
          }
        : {}),
      ...(s ? { student: s } : {}),
      ...(l
        ? {
            lead: {
              id: l.id,
              name: l.studentName,
              status: l.isArchived ? "ARCHIVED" : l.status,
              nextAction: l.nextAction,
              nextActionDue: l.nextActionDue?.toISOString() ?? null,
            },
          }
        : {}),
      ...(p
        ? {
            project: {
              id: p.id,
              title: p.title,
              status: p.status,
              nextAction: p.nextAction,
              nextActionDue: p.nextActionDue?.toISOString() ?? null,
            },
          }
        : {}),
    };
    if (n.relationshipId && !r) live[n.id].missing.push("relationship");
    if (n.studentId && !s) live[n.id].missing.push("student");
    if (n.leadId && !l) live[n.id].missing.push("lead");
    if (n.projectId && !p) live[n.id].missing.push("project");
  }
  return { store, live };
}
export async function searchNetworkCandidates(
  actor: RelationshipActor,
  query: string,
): Promise<NetworkCandidate[]> {
  readable(actor);
  const q = text(query, 100);
  if (q.length < 2) return [];
  const [rels, leads, students] = await Promise.all([
    prisma.salesRelationship.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        status: { not: "ARCHIVED" },
      },
      select: { id: true, name: true, kind: true, ownerName: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.lead.findMany({
      where: {
        studentName: { contains: q, mode: "insensitive" },
        recordKind: "STUDENT",
        isArchived: false,
      },
      select: {
        id: true,
        studentName: true,
        leadNo: true,
        school: true,
        status: true,
      },
      orderBy: { studentName: "asc" },
      take: 8,
    }),
    mayLinkStudent(actor)
      ? prisma.student.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          select: { id: true, name: true, school: true, grade: true },
          orderBy: { name: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);
  const [parents, partners] = await Promise.all([
    mayLinkStudent(actor)
      ? prisma.parentAccount.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          },
          select: { id: true, name: true, phone: true },
          take: 8,
        })
      : Promise.resolve([]),
    actor.role === "ADMIN" && !actor.operationsAdmin
      ? prisma.partner.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          select: { id: true, name: true },
          take: 8,
        })
      : Promise.resolve([]),
  ]);
  return [
    ...parents.map((p) => ({
      id: p.id,
      name: p.name || "Parent",
      type: "PARENT" as const,
      detail: "Phone …" + (p.phone ?? "").slice(-4),
    })),
    ...partners.map((p) => ({
      id: p.id,
      name: p.name,
      type: "PARTNER" as const,
      detail: "Existing partner account",
    })),
    ...rels.map((r) => ({
      id: r.id,
      name: r.name,
      type: "RELATIONSHIP" as const,
      detail: [r.kind, r.ownerName].filter(Boolean).join(" · "),
    })),
    ...leads.map((l) => ({
      id: l.id,
      name: l.studentName,
      type: "LEAD" as const,
      detail: [l.leadNo, l.school, l.status].filter(Boolean).join(" · "),
    })),
    ...students.map((s) => ({
      id: s.id,
      name: s.name,
      type: "STUDENT" as const,
      detail: [s.school, s.grade].filter(Boolean).join(" · "),
    })),
  ];
}
export async function networkPreview(actor: RelationshipActor) {
  readable(actor);
  const store = reviewedNetwork();
  const aliases = (name: string) =>
    [
      name,
      name.replace(/\s*\([^)]*\)/g, "").trim(),
      ...(name.match(/\(([^)]*)\)/)?.slice(1) ?? []),
    ].filter((v) => v.length >= 2);
  const names = [
    ...new Set(
      store.nodes
        .filter((n) => !["ROOT", "GROUP"].includes(n.kind))
        .flatMap((n) => aliases(n.name)),
    ),
  ];
  const [relationships, leads, students] = await Promise.all([
    prisma.salesRelationship.findMany({
      where: {
        status: { not: "ARCHIVED" },
        OR: names.map((name) => ({
          name: { equals: name, mode: "insensitive" as const },
        })),
      },
      select: { id: true, name: true, kind: true, ownerName: true },
      take: 200,
    }),
    prisma.lead.findMany({
      where: {
        recordKind: "STUDENT",
        isArchived: false,
        OR: names.map((name) => ({
          studentName: { equals: name, mode: "insensitive" as const },
        })),
      },
      select: { id: true, studentName: true, leadNo: true, school: true },
      take: 200,
    }),
    mayLinkStudent(actor)
      ? prisma.student.findMany({
          where: {
            OR: names.map((name) => ({
              name: { equals: name, mode: "insensitive" as const },
            })),
          },
          select: { id: true, name: true, school: true, grade: true },
          take: 200,
        })
      : Promise.resolve([]),
  ]);
  const candidates: NetworkCandidate[] = [
    ...relationships.map((r) => ({
      id: r.id,
      name: r.name,
      type: "RELATIONSHIP" as const,
      detail: [r.kind, r.ownerName].filter(Boolean).join(" · "),
    })),
    ...leads.map((l) => ({
      id: l.id,
      name: l.studentName,
      type: "LEAD" as const,
      detail: [l.leadNo, l.school].filter(Boolean).join(" · "),
    })),
    ...students.map((s) => ({
      id: s.id,
      name: s.name,
      type: "STUDENT" as const,
      detail: [s.school, s.grade].filter(Boolean).join(" · "),
    })),
  ];
  const suggestions: Record<string, NetworkCandidate[]> = {};
  for (const node of store.nodes) {
    if (["ROOT", "GROUP"].includes(node.kind)) continue;
    const keys = aliases(node.name).map((v) => v.toLowerCase());
    suggestions[node.id] = candidates
      .filter(
        (c) =>
          keys.includes(c.name.toLowerCase()) &&
          (c.type === "RELATIONSHIP" ||
            ["PERSON", "STUDENT"].includes(node.kind)),
      )
      .slice(0, 8);
  }
  return {
    store,
    defaults: store.nodes.filter(defaultCreateRelationship).map((n) => n.id),
    suggestions,
  };
}

export type NetworkMaintenance = {
  revision: number;
  action:
    | "ADD_NODE"
    | "CONNECT"
    | "ARCHIVE_NODE"
    | "RESTORE_NODE"
    | "ARCHIVE_EDGE"
    | "RESTORE_EDGE"
    | "LAYOUT";
  nodeId?: string;
  from?: string;
  to?: string;
  edgeId?: string;
  name?: string;
  kind?: NetworkNode["kind"];
  label?: string;
  style?: "DIRECT" | "CONNECTION" | "PIPELINE";
  confirmed?: boolean;
  note: string;
  choice?: NetworkChoice;
  newLead?: boolean;
  asReferral?: boolean;
  sourceType?: string;
  createProject?: boolean;
};
export async function maintainNetworkInTransaction(
  tx: Db,
  actor: RelationshipActor,
  input: NetworkMaintenance,
) {
  assertRelationshipWrite(actor);
  const store = await lockedStore(tx);
  if (!store || store.revision !== input.revision)
    throw new Error(
      "Network changed; reload before saving / 地图已更新，请刷新后保存",
    );
  const note = text(input.note, 2000);
  if (!note)
    throw new Error(
      "Record the reason or identity check / 请填写新增或调整依据",
    );
  const team = await customerTeamManager(actor,tx);
  const before = JSON.parse(JSON.stringify(store));
  let resultNodeId = input.nodeId ?? "";
  const find = (id: unknown) => {
    const n = store.nodes.find((n) => n.id === id);
    if (!n) throw new Error("Node unavailable / 节点不存在");
    assertCustomerVisible(actor, n, team);
    return n;
  };
  const connect = (from: string, to: string) => {
    const a = find(from),
      b = find(to);
    if (a.archived || b.archived)
      throw new Error(
        "Restore archived nodes before connecting / 请先恢复已归档节点",
      );
    if (store.edges.some((e) => e.from === from && e.to === to))
      throw new Error(
        "This connection already exists; edit or restore it / 该连线已存在，请修改或恢复原连线",
      );
    if (connectionWouldCycle(store, from, to))
      throw new Error(
        "This direction creates a cycle; check the connection / 此方向会形成循环，请核对连线",
      );
    const label = text(input.label ?? "", 160);
    if (!label)
      throw new Error("Connection label is required / 请填写关系含义");
    if (!["DIRECT", "CONNECTION", "PIPELINE"].includes(input.style ?? ""))
      throw new Error("Choose a connection style / 请选择连线类型");
    if (input.confirmed !== undefined && typeof input.confirmed !== "boolean")
      throw new Error("Invalid review flag / 核对标记无效");
    store.edges.push({
      id: "manual-" + randomUUID(),
      from,
      to,
      label,
      style: input.style!,
      confirmed: input.confirmed === true,
    });
  };
  if (input.action === "ADD_NODE") {
    if (store.nodes.length >= 1000)
      throw new Error(
        "This map has reached 1000 nodes; contact an administrator to expand it / 当前地图已达1000个节点，请联系管理员扩容",
      );
    const parent = find(input.from);
    if (parent.archived)
      throw new Error("Restore this source node first / 请先恢复来源节点");
    const name = text(input.name ?? "", 160);
    if (
      !name ||
      !input.kind ||
      !["INSTITUTION", "PERSON", "STUDENT", "PARENT"].includes(input.kind)
    )
      throw new Error(
        "Enter a name and individual identity type / 请填写名称并选择对象类型",
      );
    const node: NetworkNode = {
      id: "manual-" + randomUUID(),
      name,
      kind: input.kind,
      x: 0,
      y: 0,
      sourceStatus: "",
      review: note,
      note,
      ownerUserId: actor.id,
      collaboratorUserIds: [],
      origin: "MANUAL",
      createdAt: new Date().toISOString(),
    };
    if (input.newLead) {
      if (input.kind !== "STUDENT")
        throw new Error(
          "New opportunities require a student identity / 新建商机请选择学生类型",
        );
      if (input.choice && input.choice.mode !== "KEEP")
        throw new Error(
          "Choose an existing record or a new opportunity / 请选择关联已有记录或新建商机之一",
        );
      if (!LEAD_SOURCE_TYPES.includes(input.sourceType ?? ""))
        throw new Error("Choose the actual lead source / 请选择实际商机来源");
      const exact = await tx.lead.findMany({
        where: {
          studentName: { equals: name, mode: "insensitive" },
          isArchived: false,
          recordKind: "STUDENT",
        },
        select: { id: true },
      });
      // An operator may distinguish same-named students only by an explicit review, never by silently reusing an ID.
      if (exact.length && note.length < 20)
        throw new Error(
          "Similar student names exist; search first and record a detailed identity check / 已有同名学生商机，请先搜索并详细填写身份核对依据",
        );
      let relationshipId: string | null = null;
      if (input.asReferral) {
        if (!input.confirmed || !parent.relationshipId)
          throw new Error(
            "A referral needs a confirmed source relationship / 介绍来源须核对并关联准确关系档案",
          );
        const r = await tx.salesRelationship.findFirst({
          where: { id: parent.relationshipId, status: { not: "ARCHIVED" } },
          select: { id: true },
        });
        if (!r)
          throw new Error("Source relationship unavailable / 来源关系不可用");
        relationshipId = r.id;
      }
      const lead = await tx.lead.create({
        data: {
          leadNo: await allocateLeadNo(tx),
          studentName: name,
          recordKind: "STUDENT",
          sourceType: input.sourceType!,
          status: "New Lead",
          ownerName: actor.name,
          createdByUserId: actor.id,
          createdByName: actor.name,
          relationshipId,
          relationshipLinkedAt: relationshipId ? new Date() : null,
          relationshipReviewNote: relationshipId ? note : null,
          latestSummary: note,
          sourceDetail:
            "Added explicitly from relationship map / 从关系地图明确新建",
        },
      });
      await tx.leadFollowUp.create({
        data: {
          leadId: lead.id,
          actorUserId: actor.id,
          actorName: actor.name,
          channel: "其他",
          content: note,
        },
      });
      node.leadId = lead.id;
      node.sourceStatus = "New Lead";
    } else if (input.choice) {
      if (input.choice.nodeId !== node.id && input.choice.nodeId !== "NEW")
        throw new Error("Invalid new-node choice / 新节点关联无效");
      await choose(tx, actor, node, {
        ...input.choice,
        nodeId: node.id,
        reviewNote: note,
      });
    }
    if (input.createProject) {
      if (
        input.kind !== "INSTITUTION" ||
        !node.relationshipId ||
        input.choice?.mode !== "CREATE"
      )
        throw new Error(
          "Create a new institution profile before its first cooperation project / 请先新建机构关系，再创建首个合作项目",
        );
      const project = await tx.salesRelationshipOpportunity.create({
        data: {
          relationshipId: node.relationshipId,
          title: name + " - cooperation",
          status: "OPEN",
          ownerName: actor.name,
          note,
        },
      });
      node.projectId = project.id;
    }
    store.nodes.push(node);
    connect(parent.id, node.id);
    resultNodeId = node.id;
    organizeNetwork(store);
  } else if (input.action === "CONNECT") {
    connect(find(input.from).id, find(input.to).id);
    resultNodeId = input.from!;
  } else if (
    input.action === "ARCHIVE_NODE" ||
    input.action === "RESTORE_NODE"
  ) {
    const n = find(input.nodeId);
    if (n.kind === "ROOT")
      throw new Error(
        "The central owner cannot be archived / 中心负责人不可归档",
      );
    if (n.mergedIntoId && input.action === "RESTORE_NODE")
      throw new Error(
        "This identity was merged; open its canonical customer / 此身份已合并，请打开合并后的客户",
      );
    n.archived = input.action === "ARCHIVE_NODE";
    resultNodeId = n.id;
  } else if (
    input.action === "ARCHIVE_EDGE" ||
    input.action === "RESTORE_EDGE"
  ) {
    const edge = store.edges.find((e) => e.id === input.edgeId);
    if (!edge) throw new Error("Connection unavailable / 连线不存在");
    if (
      input.action === "RESTORE_EDGE" &&
      connectionWouldCycle(
        { ...store, edges: store.edges.filter((e) => e.id !== edge.id) },
        edge.from,
        edge.to,
      )
    )
      throw new Error(
        "This direction creates a cycle; check the connection / 此方向会形成循环，请核对连线",
      );
    find(edge.from);
    find(edge.to);
    edge.archived = input.action === "ARCHIVE_EDGE";
    resultNodeId = edge.from;
  } else if (input.action === "LAYOUT") {
    if (!team)
      throw new Error(
        "Only a manager can organize the shared layout / 共用布局仅限管理人员整理",
      );
    organizeNetwork(store);
  } else throw new Error("Invalid maintenance action / 地图维护操作无效");
  for (const key of [
    "relationshipId",
    "studentId",
    "parentId",
    "partnerId",
    "leadId",
  ] as const) {
    const ids = store.nodes.flatMap((n) => (n[key] ? [n[key]!] : []));
    if (new Set(ids).size !== ids.length)
      throw new Error(
        "This identity is already on the map; connect its existing node or restore it / 该档案已在地图中，请新增连线或恢复已有节点",
      );
  }
  await assertDistinctIdentities(tx, store.nodes);
  store.revision += 1;
  validateNetworkStore(store);
  await tx.appSetting.update({
    where: { key: NETWORK_KEY },
    data: { value: JSON.stringify(store) },
  });
  await audit(tx, actor, "NETWORK_" + input.action, {
    reason: note,
    before,
    after: store,
  });
  return { store, nodeId: resultNodeId };
}
export async function maintainNetwork(
  actor: RelationshipActor,
  input: NetworkMaintenance,
) {
  assertRelationshipWrite(actor);
  return prisma.$transaction(
    (tx) => maintainNetworkInTransaction(tx, actor, input),
    { timeout: 30000 },
  );
}
