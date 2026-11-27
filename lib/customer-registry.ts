import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { NETWORK_KEY, GT_NETWORK_HASH } from "./sales-network-source";
import {
  validateNetworkStore,
  type NetworkStore,
  type NetworkNode,
} from "./sales-network-types";
import { organizeNetwork } from "./sales-network-layout";
import { customerTeamManager, assertCustomerVisible } from "./customer-access";
import {
  assertRelationshipWrite,
  type RelationshipActor,
} from "./sales-relationship-policy";
import { canAccessResourceWorkspaceRole } from "./staff-roles";
type Db = Prisma.TransactionClient;
export async function customerStoreForUpdate(tx: Db) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(731923,1123)::text`;
  const row = await tx.appSetting.findUnique({ where: { key: NETWORK_KEY } });
  if (row) return validateNetworkStore(JSON.parse(row.value));
  const root: NetworkNode = {
    id: "company-root",
    name: "GT",
    kind: "ROOT",
    x: 30,
    y: 30,
    sourceStatus: "",
    review: "",
    note: "",
  };
  return {
    version: 1,
    revision: 0,
    sourceHash: GT_NETWORK_HASH,
    sourceName: "Customer workspace",
    ownerName: "GT",
    importedAt: new Date().toISOString(),
    importedBy: "Student intake",
    nodes: [root],
    edges: [],
  } as NetworkStore;
}
export async function saveCustomerStore(
  tx: Db,
  store: NetworkStore,
  actor: { name: string; email?: string; role?: string },
  action: string,
  meta: unknown,
) {
  store.revision++;
  validateNetworkStore(store);
  await tx.appSetting.upsert({
    where: { key: NETWORK_KEY },
    create: { key: NETWORK_KEY, value: JSON.stringify(store) },
    update: { value: JSON.stringify(store) },
  });
  await tx.auditLog.create({
    data: {
      actorName: actor.name,
      actorEmail: actor.email ?? "SYSTEM",
      actorRole: actor.role ?? "SYSTEM",
      module: "SALES_RELATIONSHIP",
      action,
      entityType: "SalesNetwork",
      entityId: GT_NETWORK_HASH,
      meta: JSON.parse(JSON.stringify(meta)),
    },
  });
}
export function mergeCustomerNodes(
  store: NetworkStore,
  canonical: NetworkNode,
  source: NetworkNode,
  actor: RelationshipActor,
  team: boolean,
  note: string,
) {
  if (canonical.id === source.id) return;
  assertCustomerVisible(actor, source, team);
  if (canonical.ownerUserId) assertCustomerVisible(actor, canonical, team);
  if (!note.trim())
    throw new Error(
      "Record the identity merge review / 请填写身份合并核对依据",
    );
  if (!canonical.ownerUserId) {
    canonical.ownerUserId = source.ownerUserId ?? actor.id;
    canonical.collaboratorUserIds = source.collaboratorUserIds ?? [];
  }
  canonical.collaboratorUserIds = [
    ...new Set(
      [
        ...(canonical.collaboratorUserIds ?? []),
        source.ownerUserId,
        ...(source.collaboratorUserIds ?? []),
      ].filter(
        (id): id is string => Boolean(id) && id !== canonical.ownerUserId,
      ),
    ),
  ];
  for (const key of [
    "studentId",
    "parentId",
    "partnerId",
    "relationshipId",
    "leadId",
    "projectId",
  ] as const) {
    if (!canonical[key] && source[key]) canonical[key] = source[key];
    delete source[key];
  }
  for (const e of store.edges) {
    if (e.from === source.id) e.from = canonical.id;
    if (e.to === source.id) e.to = canonical.id;
    if (e.from === e.to) e.archived = true;
  }
  const seen = new Set<string>();
  for (const e of store.edges) {
    if (e.archived) continue;
    const key = e.from + ":" + e.to + ":" + (e.meaning ?? e.label);
    if (seen.has(key)) e.archived = true;
    seen.add(key);
  }
  source.archived = true;
  source.mergedIntoId = canonical.id;
  source.note = (
    source.note +
    "\nIdentity merged by explicit exact-ID review: " +
    note
  ).slice(-2000);
}
export type StudentCustomerInput = {
  ownerUserId?: string;
  collaboratorUserIds?: string[];
  parentNodeId?: string;
  parentAccountId?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
  guardianConfirmed?: boolean;
  sourceNodeId?: string;
  sourceMeaning?: "REFERRAL" | "SCHOOL" | "CONTACT";
  sourceConfirmed?: boolean;
  reviewNote?: string;
  pendingContact?: { name: string; phone: string; relationship: string };
};
export async function ensureStudentCustomer(
  tx: Db,
  studentId: string,
  actor: RelationshipActor | null,
  input: StudentCustomerInput = {},
  trustedOwnerId?: string | null,
  leadId?: string,
) {
  const store = await customerStoreForUpdate(tx);
  const student = await tx.student.findUniqueOrThrow({
    where: { id: studentId },
    select: { id: true, name: true, sourceChannelId: true },
  });
  const principals = await tx.user.findMany({
    where: { role: { in: ["ADMIN", "SALES", "CS"] }, isObserver: false },
    select: { id: true, name: true },
  });
  const team = actor ? await customerTeamManager(actor,tx) : false;
  let node =
    store.nodes.find((n) => n.studentId === studentId) ??
    (leadId ? store.nodes.find((n) => n.leadId === leadId) : undefined);
  if (node && actor && node.ownerUserId)
    assertCustomerVisible(actor, node, team);
  const leadNode = leadId
    ? store.nodes.find((n) => n.leadId === leadId)
    : undefined;
  if (node && leadNode && node.id !== leadNode.id) {
    if (!actor)
      throw new Error(
        "Identity merge requires staff review / 身份合并需要员工核对",
      );
    mergeCustomerNodes(
      store,
      node,
      leadNode,
      actor,
      team,
      input.reviewNote ||
        "Exact existing student selected during handoff / 承接时明确选择已有学生",
    );
  }
  const explicitOwner = input.ownerUserId?.trim();
  if (
    explicitOwner &&
    actor &&
    !team &&
    explicitOwner !== actor.id &&
    explicitOwner !== node?.ownerUserId
  )
    throw new Error(
      "Only a manager can transfer ownership / 调整负责人需要管理权限",
    );
  const trustedOwner = principals.some((u) => u.id === trustedOwnerId)
    ? trustedOwnerId
    : undefined;
  const ownerId =
    explicitOwner ||
    node?.ownerUserId ||
    trustedOwner ||
    (actor && canAccessResourceWorkspaceRole(actor.role)
      ? actor.id
      : undefined);
  if (ownerId && !principals.some((u) => u.id === ownerId))
    throw new Error(
      "Choose an eligible customer owner / 请选择有效的客户负责人",
    );
  const collaborators =
    input.collaboratorUserIds ?? node?.collaboratorUserIds ?? [];
  if (
    collaborators.length > 30 ||
    new Set(collaborators).size !== collaborators.length ||
    collaborators.some((id) => !principals.some((u) => u.id === id))
  )
    throw new Error("Invalid collaborator selection / 协作人选择无效");
  if (!node) {
    node = {
      id: "customer-" + randomUUID(),
      name: student.name,
      kind: "STUDENT",
      studentId,
      ownerUserId: ownerId,
      collaboratorUserIds: collaborators,
      origin: "MANUAL",
      createdAt: new Date().toISOString(),
      sourceStatus: "",
      review: "Exact student ID from enrollment / 来自学生录入的准确ID",
      note: "",
      x: 0,
      y: 0,
    };
    store.nodes.push(node);
    store.edges.push({
      id: "customer-" + randomUUID(),
      from: store.nodes[0].id,
      to: node.id,
      label: "customer / 客户",
      style: "DIRECT",
      confirmed: true,
      meaning: "CONTACT",
    });
  } else {
    node.studentId = studentId;
    node.kind = "STUDENT";
    node.ownerUserId = ownerId;
    node.collaboratorUserIds = collaborators;
    if (leadId) node.leadId = leadId;
  }
  if (leadId) node.leadId = leadId;
  const note = (input.reviewNote ?? "").trim();
  const connect = (
    parent: NetworkNode,
    meaning: "GUARDIAN" | "REFERRAL" | "SCHOOL" | "CONTACT",
    confirmed: boolean,
    label: string,
  ) => {
    if (actor) assertCustomerVisible(actor, parent, team);
    if (parent.archived)
      throw new Error("Restore the source customer first / 请先恢复来源客户");
    const edge = store.edges.find(
      (e) =>
        e.from === parent.id &&
        e.to === node!.id &&
        !e.archived &&
        e.meaning === meaning,
    );
    if (!edge)
      store.edges.push({
        id: "customer-" + randomUUID(),
        from: parent.id,
        to: node!.id,
        label,
        style: "CONNECTION",
        confirmed,
        meaning,
      });
  };
  let parent = input.parentNodeId
    ? store.nodes.find(
        (n) => n.id === input.parentNodeId && n.kind === "PARENT",
      )
    : undefined;
  if (input.parentNodeId && !parent)
    throw new Error("Parent customer unavailable / 家长客户不存在");
  if (input.parentAccountId) {
    if (!actor || (actor.role !== "ADMIN" && !actor.operationsAdmin))
      throw new Error(
        "Parent account identity requires administrator review / 家长账号身份需要管理员核对",
      );
    const account = await tx.parentAccount.findUniqueOrThrow({
      where: { id: input.parentAccountId },
      select: { id: true, name: true, phone: true },
    });
    parent = store.nodes.find((n) => n.parentId === account.id);
    if (!parent) {
      parent = {
        id: "customer-" + randomUUID(),
        name: account.name || "Parent",
        kind: "PARENT",
        parentId: account.id,
        ownerUserId: ownerId,
        collaboratorUserIds: [...collaborators],
        x: 0,
        y: 0,
        sourceStatus: "",
        review: note,
        note: "",
        origin: "MANUAL",
        guardianContact: {
          name: account.name || "Parent",
          phone: account.phone ?? "",
          relationship: input.guardianRelationship ?? "guardian",
        },
      };
      store.nodes.push(parent);
    }
  }
  if (input.guardianName && !parent) {
    if (input.guardianConfirmed && !actor)
      throw new Error(
        "Public intake cannot confirm guardian identity / 公开表单不能确认监护人身份",
      );
    const phone = (input.guardianPhone ?? "").trim();
    if (
      phone &&
      store.nodes.some(
        (n) => n.kind === "PARENT" && n.guardianContact?.phone === phone,
      )
    )
      throw new Error(
        "A parent contact has this phone; select and verify the existing contact / 已有同电话家长联系人，请选择已有记录并核对",
      );
    parent = {
      id: "customer-" + randomUUID(),
      name: input.guardianName.trim().slice(0, 160),
      kind: "PARENT",
      ownerUserId: ownerId,
      collaboratorUserIds: [...collaborators],
      x: 0,
      y: 0,
      sourceStatus: "",
      review: note,
      note: "Parent portal rights are unchanged / 不自动开通家长端权限",
      origin: "MANUAL",
      guardianContact: {
        name: input.guardianName.trim().slice(0, 160),
        phone: phone.slice(0, 80),
        relationship: (input.guardianRelationship ?? "guardian").slice(0, 80),
      },
    };
    store.nodes.push(parent);
  }
  if (parent) {
    if (input.guardianConfirmed && !note)
      throw new Error(
        "Record the guardian identity check / 请填写监护关系核对依据",
      );
    connect(
      parent,
      "GUARDIAN",
      Boolean(input.guardianConfirmed),
      input.guardianRelationship || "guardian / 监护人",
    );
  }
  if (input.sourceNodeId) {
    const source = store.nodes.find((n) => n.id === input.sourceNodeId);
    if (!source || source.kind === "ROOT")
      throw new Error("Choose an exact source customer / 请选择准确的来源客户");
    if (input.sourceConfirmed && !note)
      throw new Error(
        "Record the source identity check / 请填写来源关系核对依据",
      );
    connect(
      source,
      input.sourceMeaning ?? "CONTACT",
      Boolean(input.sourceConfirmed),
      input.sourceMeaning === "REFERRAL"
        ? "referral / 介绍"
        : input.sourceMeaning === "SCHOOL"
          ? "school connection / 学校联系"
          : "contact / 联系",
    );
  }
  if (!input.sourceNodeId && student.sourceChannelId) {
    const sourcePartner = await tx.partner.findUnique({
      where: { sourceChannelId: student.sourceChannelId },
      select: { id: true, name: true },
    });
    if (sourcePartner) {
      let source = store.nodes.find((n) => n.partnerId === sourcePartner.id);
      if (!source) {
        source = {
          id: "customer-" + randomUUID(),
          name: sourcePartner.name,
          kind: "INSTITUTION",
          partnerId: sourcePartner.id,
          x: 0,
          y: 0,
          sourceStatus: "",
          review:
            "Exact source-channel partner ID; relationship pending review / 准确渠道合作方ID，关系待核对",
          note: "",
          origin: "MANUAL",
          collaboratorUserIds: [],
        };
        store.nodes.push(source);
      }
      if (
        !store.edges.some(
          (e) => !e.archived && e.from === source!.id && e.to === node!.id,
        )
      )
        store.edges.push({
          id: "customer-" + randomUUID(),
          from: source.id,
          to: node.id,
          label: "registered source channel / 录入来源渠道（待核对）",
          style: "CONNECTION",
          meaning: "CONTACT",
          confirmed: false,
        });
    }
  }
  if (input.pendingContact)
    node.guardianContact = {
      name: input.pendingContact.name.slice(0, 160),
      phone: input.pendingContact.phone.slice(0, 80),
      relationship: input.pendingContact.relationship.slice(0, 80),
    };
  if (store.nodes.length > 1000)
    throw new Error(
      "Customer registry is full; contact a manager / 客户库已达容量，请联系管理员",
    );
  node.revision = (node.revision ?? 0) + 1;
  organizeNetwork(store);
  await saveCustomerStore(
    tx,
    store,
    actor ?? { name: "Student intake" },
    "CUSTOMER_STUDENT_LINK",
    {
      studentId,
      nodeId: node.id,
      ownerUserId: ownerId ?? null,
      guardianConfirmed: input.guardianConfirmed ?? false,
      sourceConfirmed: input.sourceConfirmed ?? false,
      reviewNote: note,
    },
  );
  return node.id;
}
export async function assignCustomer(
  actor: RelationshipActor,
  input: {
    nodeId: string;
    revision: number;
    nodeRevision?: number;
    ownerUserId: string;
    collaboratorUserIds: string[];
    note: string;
  },
) {
  assertRelationshipWrite(actor);
  return prisma.$transaction(
    async (tx) => {
      const store = await customerStoreForUpdate(tx);
      if (input.nodeRevision === undefined && store.revision !== input.revision)
        throw new Error("Workspace changed; reload / 客户工作台已更新，请刷新");
      const node = store.nodes.find(
        (n) => n.id === input.nodeId && n.kind !== "ROOT",
      );
      if (!node) throw new Error("Customer unavailable / 客户不存在");
      if (
        input.nodeRevision !== undefined &&
        (node.revision ?? 0) !== input.nodeRevision
      )
        throw new Error("Customer changed; refresh / 客户已更新，请刷新");
      const team = await customerTeamManager(actor,tx);
      assertCustomerVisible(actor, node, team);
      if (input.ownerUserId !== node.ownerUserId && !team)
        throw new Error(
          "Only a manager can transfer ownership / 调整负责人需要管理权限",
        );
      if (!team && node.ownerUserId !== actor.id)
        throw new Error(
          "Only the owner or manager can change collaborators / 仅负责人或管理员可以调整协作人",
        );
      const users = await tx.user.findMany({
        where: { role: { in: ["ADMIN", "SALES", "CS"] }, isObserver: false },
        select: { id: true },
      });
      if (
        !users.some((u) => u.id === input.ownerUserId) ||
        !Array.isArray(input.collaboratorUserIds) ||
        input.collaboratorUserIds.length > 30 ||
        input.collaboratorUserIds.some(
          (id) => !users.some((u) => u.id === id),
        ) ||
        !input.note.trim()
      )
        throw new Error(
          "Check owner, collaborators and reason / 请核对负责人、协作人并填写原因",
        );
      const before = {
        ownerUserId: node.ownerUserId,
        collaboratorUserIds: node.collaboratorUserIds,
      };
      node.revision = (node.revision ?? 0) + 1;
      node.ownerUserId = input.ownerUserId;
      node.collaboratorUserIds = [...new Set(input.collaboratorUserIds)].filter(
        (id) => id !== node.ownerUserId,
      );
      await saveCustomerStore(tx, store, actor, "CUSTOMER_ASSIGN", {
        nodeId: node.id,
        before,
        after: {
          ownerUserId: node.ownerUserId,
          collaboratorUserIds: node.collaboratorUserIds,
        },
        reason: input.note,
      });
    },
    { timeout: 30000 },
  );
}

export async function reviewCustomerConnection(
  actor: RelationshipActor,
  input: {
    nodeId: string;
    edgeId: string;
    edgeRevision: number;
    label: string;
    meaning: "GUARDIAN" | "REFERRAL" | "SCHOOL" | "CONTACT";
    confirmed: boolean;
    note: string;
  },
) {
  assertRelationshipWrite(actor);
  return prisma.$transaction(
    async (tx) => {
      const store = await customerStoreForUpdate(tx),
        team = await customerTeamManager(actor,tx);
      const edge = store.edges.find(
        (e) =>
          e.id === input.edgeId &&
          (e.from === input.nodeId || e.to === input.nodeId),
      );
      if (!edge || (edge.revision ?? 0) !== input.edgeRevision)
        throw new Error("Connection changed; refresh / 关系已更新，请刷新");
      for (const id of [edge.from, edge.to])
        assertCustomerVisible(
          actor,
          store.nodes.find((n) => n.id === id)!,
          team,
        );
      if (
        !input.note.trim() ||
        !input.label.trim() ||
        input.label.length > 160 ||
        !["GUARDIAN", "REFERRAL", "SCHOOL", "CONTACT"].includes(
          input.meaning,
        ) ||
        typeof input.confirmed !== "boolean"
      )
        throw new Error(
          "Review the connection meaning and record the basis / 请核对关系含义并填写依据",
        );
      if (
        input.meaning === "GUARDIAN" &&
        !store.nodes.some(
          (n) =>
            (n.id === edge.from || n.id === edge.to) && n.kind === "PARENT",
        )
      )
        throw new Error(
          "A guardian connection needs a parent node / 监护关系需要家长节点",
        );
      const before = { ...edge };
      edge.label = input.label.trim();
      edge.meaning = input.meaning;
      edge.confirmed = input.confirmed;
      edge.revision = (edge.revision ?? 0) + 1;
      for (const n of store.nodes.filter(
        (n) => n.id === edge.from || n.id === edge.to,
      ))
        n.revision = (n.revision ?? 0) + 1;
      await saveCustomerStore(tx, store, actor, "CUSTOMER_CONNECTION_REVIEW", {
        before,
        after: edge,
        reason: input.note,
      });
    },
    { timeout: 30000 },
  );
}
