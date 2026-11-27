/** Isolated integration acceptance. Refuses production databases. */
import assert from "node:assert/strict";
import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  reviewedNetwork,
  defaultCreateRelationship,
  NETWORK_KEY,
} from "../lib/sales-network-source";
import {
  importNetwork,
  importNetworkInTransaction,
  editNetwork,
  readNetwork,
  searchNetworkCandidates,
  networkPreview,
  maintainNetwork,
  type NetworkEdit,
} from "../lib/sales-network";
import type { NetworkChoice } from "../lib/sales-network-types";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/sgt_network_verify_20261123");
  const actor = {
    id: "network-uat",
    name: "Jasmine (local UAT)",
    email: "network-uat@example.test",
    role: "ADMIN",
  };
  assert.equal(
    await prisma.appSetting.findUnique({ where: { key: NETWORK_KEY } }),
    null,
    "Run on a fresh dedicated test database",
  );
  await prisma.lead.deleteMany({ where: { leadNo: "MAP-UAT-001" } });
  await prisma.student.deleteMany({
    where: { school: { startsWith: "UAT fixture" } },
  });
  await prisma.user.create({
    data: {
      id: actor.id,
      email: actor.email,
      name: actor.name,
      role: "ADMIN",
      passwordHash: "local-no-login",
      passwordSalt: "local-uat",
    },
  });
  const graph = reviewedNetwork(),
    choices: NetworkChoice[] = graph.nodes.map((n) => ({
      nodeId: n.id,
      mode: defaultCreateRelationship(n) ? "CREATE" : "KEEP",
      reviewNote:
        "PDF structure reviewed; test identity / 已核对PDF结构，测试身份",
    }));
  const zack = await prisma.student.create({
    data: {
      name: "Zack Ouyang Xinen",
      school: "UAT fixture · NLCS",
      grade: "UAT",
    },
  });
  const sameName = await prisma.student.create({
    data: { name: "Wang Yuxuan", school: "UAT fixture · identity A" },
  });
  const lead = await prisma.lead.create({
    data: {
      leadNo: "MAP-UAT-001",
      sourceType: "其他",
      studentName: "Zhu Yichen",
      recordKind: "STUDENT",
      status: "Contacted",
      nextAction: "UAT: confirm learning needs",
      nextActionDue: new Date("2026-11-25T09:00:00+08:00"),
    },
  });
  choices.find((c) => c.nodeId === "zack")!.mode = "STUDENT";
  choices.find((c) => c.nodeId === "zack")!.targetId = zack.id;
  choices.find((c) => c.nodeId === "yichen")!.mode = "LEAD";
  choices.find((c) => c.nodeId === "yichen")!.targetId = lead.id;
  await assert.rejects(
    () =>
      prisma.$transaction(
        async (tx) => {
          const failAudit = new Proxy(tx, {
            get(target, key) {
              if (key === "auditLog")
                return {
                  create: async (args: any) => {
                    if (args.data.action === "NETWORK_IMPORT")
                      throw new Error("forced audit failure");
                    return tx.auditLog.create(args);
                  },
                };
              return Reflect.get(target, key);
            },
          });
          await importNetworkInTransaction(failAudit, actor, choices);
        },
        { timeout: 30000 },
      ),
    /forced audit failure/,
  );
  assert.equal(await prisma.salesRelationship.count(), 0);
  assert.equal(await prisma.salesRelationshipOpportunity.count(), 0);
  assert.equal(
    await prisma.appSetting.count({ where: { key: NETWORK_KEY } }),
    0,
  );
  const invalid = choices.map((c) => ({ ...c }));
  invalid.find((c) => c.nodeId === "felix")!.mode = "STUDENT";
  invalid.find((c) => c.nodeId === "felix")!.targetId = sameName.id;
  invalid.find((c) => c.nodeId === "wang")!.mode = "STUDENT";
  invalid.find((c) => c.nodeId === "wang")!.targetId = sameName.id;
  await assert.rejects(() => importNetwork(actor, invalid), /silent|静默/);
  assert.equal(await prisma.salesRelationship.count(), 0);
  await assert.rejects(() =>
    importNetwork({ ...actor, isObserver: true }, choices),
  );
  const results = await Promise.all([
    importNetwork(actor, choices),
    importNetwork(actor, choices),
  ]);
  assert.equal(results.filter((r) => !r.alreadyImported).length, 1);
  assert.equal(await prisma.salesRelationship.count(), 10);
  assert.equal(await prisma.salesRelationshipOpportunity.count(), 4);
  assert.equal(await prisma.student.count(), 2);
  assert.equal(await prisma.lead.count(), 1);
  let view = (await readNetwork(actor))!;
  assert.equal(view.live.zack.student?.id, zack.id);
  assert.equal(view.live.yichen.lead?.status, "Contacted");
  const node = view.store.nodes.find((n) => n.id === "mdm-su")!,
    edge = view.store.edges.find((e) => e.to === "mdm-su")!;
  const edit: NetworkEdit = {
    revision: view.store.revision,
    nodeId: node.id,
    name: node.name,
    kind: node.kind,
    note: "UAT reviewed parent connection",
    edges: [{ id: edge.id, label: "mother / 母亲", confirmed: true }],
  };
  await editNetwork(actor, edit);
  await assert.rejects(() => editNetwork(actor, edit), /changed|更新/);
  view = (await readNetwork(actor))!;
  assert.ok(view.store.edges.find((e) => e.id === edge.id)?.confirmed);
  const rel = view.store.nodes.find((n) => n.id === "nlcs")!.relationshipId!;
  await prisma.salesRelationship.update({
    where: { id: rel },
    data: {
      nextAction: "UAT: arrange relationship follow-up",
      nextActionDue: new Date("2026-11-26T02:00:00Z"),
    },
  });
  assert.equal(
    (await readNetwork(actor))!.live.nlcs.relationship?.nextAction,
    "UAT: arrange relationship follow-up",
  );
  const candidates = await searchNetworkCandidates(
    { ...actor, role: "SALES" },
    "Zack",
  );
  assert.ok(candidates.every((c) => c.type !== "STUDENT"));
  await assert.rejects(() => readNetwork({ ...actor, role: "FINANCE" }));
  view = (await readNetwork(actor))!;
  const alex = view.store.nodes.find((n) => n.id === "alex")!;
  await assert.rejects(
    () =>
      editNetwork(
        { ...actor, role: "SALES" },
        {
          revision: view.store.revision,
          nodeId: alex.id,
          name: alex.name,
          kind: alex.kind,
          note: "",
          edges: [],
          choice: {
            nodeId: alex.id,
            mode: "STUDENT",
            targetId: zack.id,
            reviewNote: "not authorized",
          },
        },
      ),
    /administrator|管理员/,
  );
  const duplicateLead = await prisma.lead.create({
    data: {
      leadNo: "MAP-UAT-CROSS",
      sourceType: "其他",
      studentName: "Alias of existing student",
      recordKind: "STUDENT",
      convertedStudentId: zack.id,
    },
  });
  await assert.rejects(
    () =>
      editNetwork(actor, {
        revision: view.store.revision,
        nodeId: alex.id,
        name: alex.name,
        kind: alex.kind,
        note: "",
        edges: [],
        choice: {
          nodeId: alex.id,
          mode: "LEAD",
          targetId: duplicateLead.id,
          reviewNote: "UAT cross-kind duplicate",
        },
      }),
    /silent|静默/,
  );
  await prisma.lead.delete({ where: { id: duplicateLead.id } });
  const suggested = await networkPreview(actor);
  assert.ok(
    suggested.suggestions.zack.some(
      (c) => c.type === "STUDENT" && c.id === zack.id,
    ),
  );
  assert.ok(
    (await networkPreview({ ...actor, role: "SALES" })).suggestions.zack.every(
      (c) => c.type !== "STUDENT",
    ),
  );
  view = (await readNetwork(actor))!;
  const zackNode = view.store.nodes.find((n) => n.id === "zack")!;
  await editNetwork(actor, {
    revision: view.store.revision,
    nodeId: zackNode.id,
    name: zackNode.name,
    kind: zackNode.kind,
    note: "UAT unlink",
    edges: [],
    choice: {
      nodeId: zackNode.id,
      mode: "UNLINK",
      reviewNote: "UAT correction; preserve student record",
    },
  });
  assert.equal(
    (await readNetwork(actor))!.store.nodes.find((n) => n.id === "zack")!
      .studentId,
    undefined,
  );
  assert.deepEqual(
    await prisma.student.findUnique({ where: { id: zack.id } }),
    zack,
  );
  // Growth and maintenance use the same atomic, audited service as the live UI.
  view = (await readNetwork(actor))!;
  let grown = await maintainNetwork(actor, {
    revision: view.store.revision,
    action: "ADD_NODE",
    from: "jasmine",
    name: "UAT New Partner",
    kind: "INSTITUTION",
    label: "cooperation discussion",
    style: "PIPELINE",
    confirmed: false,
    note: "UAT explicit new partner identity",
    choice: { nodeId: "NEW", mode: "CREATE" },
    createProject: true,
  });
  const partner = grown.store.nodes.find((n) => n.id === grown.nodeId)!;
  assert.ok(partner.relationshipId && partner.projectId);
  assert.equal(partner.origin, "MANUAL");
  const studentCount = await prisma.student.count();
  grown = await maintainNetwork(actor, {
    revision: grown.store.revision,
    action: "ADD_NODE",
    from: partner.id,
    name: "UAT New Student Prospect",
    kind: "STUDENT",
    label: "contact awaiting source verification",
    style: "CONNECTION",
    confirmed: false,
    note: "UAT new prospect first follow-up",
    newLead: true,
    sourceType: "其他",
  });
  const prospect = grown.store.nodes.find((n) => n.id === grown.nodeId)!;
  const newLead = await prisma.lead.findUniqueOrThrow({
    where: { id: prospect.leadId },
  });
  assert.equal(newLead.status, "New Lead");
  assert.equal(newLead.relationshipId, null);
  assert.equal(await prisma.student.count(), studentCount);
  assert.equal(
    await prisma.leadFollowUp.count({ where: { leadId: newLead.id } }),
    1,
  );
  grown = await maintainNetwork(actor, {
    revision: grown.store.revision,
    action: "CONNECT",
    from: "mdm-su",
    to: prospect.id,
    label: "connection to review",
    style: "CONNECTION",
    confirmed: false,
    note: "UAT independent additional connection",
  });
  await assert.rejects(
    () =>
      maintainNetwork(actor, {
        revision: grown.store.revision,
        action: "CONNECT",
        from: "mdm-su",
        to: prospect.id,
        label: "duplicate",
        style: "CONNECTION",
        note: "UAT duplicate edge",
      }),
    /already exists|已存在/,
  );
  await assert.rejects(() =>
    maintainNetwork(
      { ...actor, isObserver: true },
      {
        revision: grown.store.revision,
        action: "LAYOUT",
        note: "UAT observer blocked",
      },
    ),
  );
  await assert.rejects(
    () =>
      maintainNetwork(actor, {
        revision: grown.store.revision,
        action: "CONNECT",
        from: prospect.id,
        to: "jasmine",
        label: "cycle",
        style: "CONNECTION",
        note: "UAT cycle blocked",
      }),
    /cycle|循环/,
  );
  const beforeArchive = await prisma.student.findUniqueOrThrow({
    where: { id: zack.id },
  });
  grown = await maintainNetwork(actor, {
    revision: grown.store.revision,
    action: "ARCHIVE_NODE",
    nodeId: partner.id,
    note: "UAT archive map only",
  });
  assert.ok(grown.store.nodes.find((n) => n.id === partner.id)!.archived);
  assert.ok(
    await prisma.salesRelationship.findUnique({
      where: { id: partner.relationshipId },
    }),
  );
  grown = await maintainNetwork(actor, {
    revision: grown.store.revision,
    action: "RESTORE_NODE",
    nodeId: partner.id,
    note: "UAT restore original node",
  });
  assert.equal(
    grown.store.nodes.find((n) => n.id === partner.id)!.archived,
    false,
  );
  assert.deepEqual(
    await prisma.student.findUniqueOrThrow({ where: { id: zack.id } }),
    beforeArchive,
  );
  const link = grown.store.edges.find(
    (e) => e.from === "mdm-su" && e.to === prospect.id,
  )!;
  grown = await maintainNetwork(actor, {
    revision: grown.store.revision,
    action: "ARCHIVE_EDGE",
    edgeId: link.id,
    note: "UAT remove mistaken connection",
  });
  grown = await maintainNetwork(actor, {
    revision: grown.store.revision,
    action: "RESTORE_EDGE",
    edgeId: link.id,
    note: "UAT restore audited connection",
  });
  assert.equal(
    grown.store.edges.find((e) => e.id === link.id)!.archived,
    false,
  );
  await assert.rejects(
    () =>
      maintainNetwork(actor, {
        revision: grown.store.revision - 1,
        action: "LAYOUT",
        note: "UAT stale layout",
      }),
    /changed|更新/,
  );
  for (const [role, observer] of [
    ["ADMIN", false],
    ["SALES", false],
    ["CS", false],
    ["FINANCE", false],
    ["TEACHER", false],
    ["ADMIN", true],
  ] as const) {
    const key = observer ? "observer" : role.toLowerCase();
    const user = await prisma.user.create({
      data: {
        email: `map-${key}@example.test`,
        name: `Map ${key} UAT`,
        role,
        language: "EN",
        isObserver: observer,
        passwordHash: "local-uat-no-login",
        passwordSalt: "local-uat",
      },
    });
    await prisma.authSession.create({
      data: {
        token: `map-local-uat-${key}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  }
  console.log(
    JSON.stringify({
      result: "PASS",
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      relationships: 10,
      projects: 4,
      duplicateImport: "idempotent",
      auditRollback: "passed",
      sameNameMerge: "rejected",
      staleEdit: "rejected",
      studentWritesDuringImport: 0,
      permissions: "passed",
      maintenance:
        "new partner/project, new student lead, extra edge, archive/restore, cycle/stale guards passed",
      database: url.pathname,
    }),
  );
}
main().finally(() => prisma.$disconnect());
