/** Dedicated localhost fixtures only. No production writes or outbound messages. */
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  importNetwork,
  editNetwork,
  maintainNetwork,
  readNetwork,
} from "../lib/sales-network";
import { reviewedNetwork, NETWORK_KEY } from "../lib/sales-network-source";
import {
  enrollStudentCustomer,
  StudentIdentityConflict,
} from "../lib/customer-onboarding";
import {
  assignCustomer,
  reviewCustomerConnection,
  ensureStudentCustomer,
} from "../lib/customer-registry";
import { readCustomerDetail } from "../lib/customer-detail";
import { linkLeadStudent } from "../lib/lead-student-link";
import type { RelationshipActor } from "../lib/sales-relationship-policy";
import { randomUUID } from "node:crypto";
async function main() {
  const db = new URL(process.env.DATABASE_URL!);
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.pathname, "/sgt_customer_workspace_20261123");
  assert.equal(await prisma.user.count(), 0, "Use a fresh dedicated database");
  const actors: Record<string, RelationshipActor> = {};
  for (const [key, role, name] of [
    ["manager", "ADMIN", "Manager"],
    ["jasmine", "ADMIN", "Jasmine"],
    ["sales", "SALES", "Sales Collaborator"],
    ["other", "ADMIN", "Other Owner"],
    ["finance", "FINANCE", "Finance"],
    ["teacher", "TEACHER", "Teacher"],
  ] as const) {
    const user = await prisma.user.create({
      data: {
        email: key + "@example.test",
        name,
        role,
        passwordHash: "local-uat-no-login",
        passwordSalt: "local-uat",
        language: "EN",
      },
    });
    actors[key] = { ...user };
    await prisma.authSession.create({
      data: {
        token: "customer-local-uat-" + key,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  }
  const manager = actors.manager,
    jasmine = actors.jasmine,
    sales = actors.sales,
    other = actors.other;
  await importNetwork(
    jasmine,
    reviewedNetwork().nodes.map((n) => ({ nodeId: n.id, mode: "KEEP" })),
  );
  const initialParents = await prisma.parentStudentLink.count();
  const requestId = randomUUID(),
    data = { name: "UAT Sibling One", school: "NLCS", grade: "G8" };
  const meta = {
    ownerUserId: jasmine.id,
    collaboratorUserIds: [sales.id],
    requestId,
    guardianName: "UAT Guardian",
    guardianPhone: "+6591111111",
    guardianRelationship: "mother",
    guardianConfirmed: true,
    reviewNote: "Exact guardian verified in staff enrollment",
  };
  const results = await Promise.all([
    enrollStudentCustomer(jasmine, data, meta),
    enrollStudentCustomer(jasmine, data, meta),
  ]);
  assert.equal(results[0].studentId, results[1].studentId);
  assert.equal(await prisma.student.count(), 1);
  const studentId = results[0].studentId;
  let view = (await readNetwork(jasmine))!;
  const studentNode = view.store.nodes.find((n) => n.studentId === studentId)!;
  const parentNode = view.store.nodes.find(
    (n) => n.guardianContact?.name === "UAT Guardian",
  )!;
  assert.ok(parentNode);
  const second = await enrollStudentCustomer(
    jasmine,
    { name: "UAT Sibling Two", school: "NLCS" },
    {
      ownerUserId: jasmine.id,
      requestId: randomUUID(),
      parentNodeId: parentNode.id,
      guardianRelationship: "mother",
      guardianConfirmed: true,
      reviewNote: "Verified sibling with the same guardian",
    },
  );
  assert.equal(await prisma.student.count(), 2);
  assert.equal(
    await prisma.parentStudentLink.count(),
    initialParents,
    "CRM enrollment must not grant parent portal rights",
  );
  await assert.rejects(
    () => enrollStudentCustomer(jasmine, data, { ownerUserId: jasmine.id }),
    StudentIdentityConflict,
  );
  const reused = await enrollStudentCustomer(
    jasmine,
    { name: data.name },
    {
      existingStudentId: studentId,
      ownerUserId: "",
      reviewNote: "Explicit existing student selected",
    },
  );
  assert.equal(reused.studentId, studentId);
  assert.equal(await prisma.student.count(), 2);
  await assert.rejects(
    () =>
      enrollStudentCustomer(
        jasmine,
        { name: "Different identity" },
        { requestId, ownerUserId: jasmine.id },
      ),
    /different student|other|其他/,
  );
  assert.ok(
    (await readNetwork(jasmine, { scope: "mine" }))!.store.nodes.some(
      (n) => n.studentId === studentId,
    ),
  );
  assert.ok(
    (await readNetwork(sales, { scope: "collaborating" }))!.store.nodes.some(
      (n) => n.studentId === studentId,
    ),
  );
  assert.ok(
    !(await readNetwork(other, { scope: "mine" }))!.store.nodes.some(
      (n) => n.studentId === studentId,
    ),
  );
  await assert.rejects(() => readNetwork(other, { scope: "team" }));
  await assert.rejects(() => readCustomerDetail(other, studentNode.id));
  const course = await prisma.course.create({
    data: { name: "UAT Shared Tuition" },
  });
  const pkg = await prisma.coursePackage.create({
    data: {
      studentId,
      courseId: course.id,
      type: "HOURS",
      remainingMinutes: 480,
      totalMinutes: 600,
      validFrom: new Date("2026-11-01"),
      sharedStudents: { create: { studentId: second.studentId } },
    },
  });
  const invoice = {
    id: "private-invoice",
    invoiceNo: "PRIVATE-UAT-INVOICE",
    issueDate: "2026-11-23",
    studentId,
    packageId: pkg.id,
    amount: 100,
    gstAmount: 9,
    totalAmount: 109,
  };
  const receipts = [
    {
      id: "approved-receipt",
      invoiceId: invoice.id,
      studentId,
      packageId: pkg.id,
      receiptNo: "APPROVED-UAT",
      receiptDate: "2026-11-23",
      amountReceived: 40,
    },
    {
      id: "pending-receipt",
      invoiceId: invoice.id,
      studentId,
      packageId: pkg.id,
      receiptNo: "PENDING-UAT",
      receiptDate: "2026-11-23",
      amountReceived: 20,
    },
  ];
  await prisma.appSetting.createMany({
    data: [
      {
        key: "parent_billing_v1",
        value: JSON.stringify({ invoices: [invoice], receipts }),
      },
      { key: "approval_finance_emails_v1", value: "finance@example.test" },
      {
        key: "parent_receipt_approval_v1",
        value: JSON.stringify([
          {
            receiptId: "approved-receipt",
            financeApprovedBy: ["finance@example.test"],
            managerApprovedBy: [],
          },
          {
            receiptId: "pending-receipt",
            financeApprovedBy: [],
            managerApprovedBy: [],
          },
        ]),
      },
    ],
  });
  const billingBefore = await prisma.appSetting.findUniqueOrThrow({
    where: { key: "parent_billing_v1" },
  });
  const packageBefore = await prisma.coursePackage.findUniqueOrThrow({
    where: { id: pkg.id },
  });
  const family = await readCustomerDetail(jasmine, parentNode.id);
  assert.equal(family.students.length, 2);
  assert.equal(family.packages.length, 1);
  assert.equal(family.finance.access, "ALLOWED");
  if (family.finance.access === "ALLOWED") {
    assert.equal(family.finance.rows.length, 1);
    assert.equal(family.finance.summary.approvedCents, 4000);
    assert.equal(family.finance.summary.outstandingCents, 6900);
  }
  const denied = await readCustomerDetail(sales, studentNode.id);
  assert.equal(denied.finance.access, "DENIED");
  assert.ok(!JSON.stringify(denied).includes("PRIVATE-UAT-INVOICE"));
  assert.ok(!JSON.stringify(denied).includes("approvedCents"));
  assert.equal(
    (
      await readCustomerDetail(
        { ...jasmine, operationsAdmin: true },
        studentNode.id,
      )
    ).finance.access,
    "DENIED",
  );
  await assert.rejects(() =>
    readCustomerDetail(actors.finance, studentNode.id),
  );
  // Different customer updates can use per-node revisions even after another node changed the company graph.
  view = (await readNetwork(manager, { scope: "team" }))!;
  const ownNode = view.store.nodes.find((n) => n.studentId === studentId)!;
  const otherNode = view.store.nodes.find(
    (n) => n.studentId === second.studentId,
  )!;
  await assignCustomer(manager, {
    nodeId: otherNode.id,
    revision: view.store.revision,
    nodeRevision: otherNode.revision ?? 0,
    ownerUserId: other.id,
    collaboratorUserIds: [],
    note: "Explicitly transfer the second sibling to another coordinator",
  });
  await assignCustomer(jasmine, {
    nodeId: ownNode.id,
    revision: view.store.revision,
    nodeRevision: ownNode.revision ?? 0,
    ownerUserId: jasmine.id,
    collaboratorUserIds: [sales.id],
    note: "Keep same shared customer with sales collaborator",
  });
  await assert.rejects(
    async () =>
      assignCustomer(sales, {
        nodeId: ownNode.id,
        revision: view.store.revision,
        nodeRevision:
          (await readCustomerDetail(jasmine, ownNode.id)).node.revision ?? 0,
        ownerUserId: sales.id,
        collaboratorUserIds: [],
        note: "Unauthorized self transfer",
      }),
    /manager|Only|权限|负责人/,
  );
  await assert.rejects(() =>
    assignCustomer(
      { ...jasmine, isObserver: true },
      {
        nodeId: ownNode.id,
        revision: 0,
        ownerUserId: jasmine.id,
        collaboratorUserIds: [],
        note: "Observer denied",
      },
    ),
  );
  // Unverified guardian edges must not expose the family billing panel.
  const pending = await maintainNetwork(jasmine, {
    revision: (await readNetwork(jasmine))!.store.revision,
    action: "ADD_NODE",
    from: "jasmine",
    name: "UAT Unverified Guardian",
    kind: "PARENT",
    label: "possible family",
    style: "CONNECTION",
    note: "Unverified contact",
  });
  const edgeAdded = await maintainNetwork(jasmine, {
    revision: pending.store.revision,
    action: "CONNECT",
    from: pending.nodeId,
    to: studentNode.id,
    label: "mother claimed, not reviewed",
    style: "CONNECTION",
    confirmed: false,
    note: "Keep guardian pending",
  });
  const edge = edgeAdded.store.edges.find(
    (e) => e.from === pending.nodeId && e.to === studentNode.id,
  )!;
  await reviewCustomerConnection(jasmine, {
    nodeId: pending.nodeId,
    edgeId: edge.id,
    edgeRevision: edge.revision ?? 0,
    label: "guardian pending",
    meaning: "GUARDIAN",
    confirmed: false,
    note: "Not yet verified",
  });
  assert.equal(
    (await readCustomerDetail(jasmine, pending.nodeId)).students.length,
    0,
  );
  // Existing parent / partner IDs resolve rather than generating duplicate business records.
  const parentAccount = await prisma.parentAccount.create({
    data: { name: "UAT Registered Guardian", phone: "+6591111111" },
  });
  await prisma.parentStudentLink.create({
    data: {
      parentId: parentAccount.id,
      studentId,
      relationship: "mother",
      canViewFinance: false,
    },
  });
  view = (await readNetwork(jasmine))!;
  const pn = view.store.nodes.find((n) => n.id === parentNode.id)!;
  await editNetwork(jasmine, {
    revision: view.store.revision,
    nodeRevision: pn.revision ?? 0,
    nodeId: pn.id,
    name: pn.name,
    kind: pn.kind,
    note: pn.note,
    edges: [],
    choice: {
      nodeId: pn.id,
      mode: "PARENT",
      targetId: parentAccount.id,
      reviewNote: "Registered account ID explicitly verified",
    },
  });
  assert.equal(
    (await readCustomerDetail(jasmine, pn.id)).parent?.id,
    parentAccount.id,
  );
  assert.equal(
    (
      await prisma.parentStudentLink.findUniqueOrThrow({
        where: {
          parentId_studentId: { parentId: parentAccount.id, studentId },
        },
      })
    ).canViewFinance,
    false,
  );
  // Lead conversion reuses the canonical student node, preserves history and never duplicates students.
  const lead = await prisma.lead.create({
    data: {
      leadNo: "CRM-UAT-LEAD",
      studentName: data.name,
      sourceType: "其他",
      recordKind: "STUDENT",
    },
  });
  view = (await readNetwork(jasmine))!;
  const prospect = await maintainNetwork(jasmine, {
    revision: view.store.revision,
    action: "ADD_NODE",
    from: "jasmine",
    name: "UAT Prospect Alias",
    kind: "STUDENT",
    label: "contact",
    style: "CONNECTION",
    note: "Exact lead before conversion",
    choice: { nodeId: "NEW", mode: "LEAD", targetId: lead.id },
  });
  await linkLeadStudent(jasmine, {
    leadId: lead.id,
    mode: "LINK",
    studentId,
    expectedUpdatedAt: lead.updatedAt.toISOString(),
    reviewNote: "Verified existing enrolled student, reuse identity",
  });
  view = (await readNetwork(manager, { scope: "team" }))!;
  assert.equal(
    view.store.nodes.filter((n) => n.studentId === studentId).length,
    1,
  );
  assert.ok(
    view.store.nodes.find((n) => n.id === prospect.nodeId)?.mergedIntoId,
  );
  assert.equal(await prisma.student.count(), 2);
  assert.deepEqual(
    await prisma.appSetting.findUniqueOrThrow({
      where: { key: "parent_billing_v1" },
    }),
    billingBefore,
  );
  assert.deepEqual(
    await prisma.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } }),
    packageBefore,
  );
  // A failing audit rolls registration and the graph back together.
  const count = await prisma.student.count();
  await assert.rejects(
    () =>
      prisma.$transaction(
        async (tx) => {
          const s = await tx.student.create({
            data: { name: "UAT rollback student" },
          });
          const wrapped = new Proxy(tx, {
            get(target, key) {
              if (key === "auditLog")
                return {
                  create: async () => {
                    throw new Error("forced audit failure");
                  },
                };
              return Reflect.get(target, key);
            },
          });
          await ensureStudentCustomer(wrapped, s.id, jasmine);
        },
        { timeout: 30000 },
      ),
    /forced audit failure/,
  );
  assert.equal(await prisma.student.count(), count);
  console.log(
    JSON.stringify({
      result: "PASS",
      database: db.pathname,
      duplicateEnrollment: "idempotent",
      studentReuse: "same ID",
      guardianPortalRights: "unchanged",
      sharedInvoice: "counted once",
      approvedReceiptCents: 4000,
      pendingReceiptExcluded: true,
      ownershipAndCollaboration: "scoped",
      financialMasking: "passed",
      observer: "read only",
      unverifiedGuardian: "no children/finance inferred",
      leadConversion: "same canonical student",
      auditFailure: "atomic rollback",
      billingAndLedger: "unchanged",
    }),
  );
}
main().finally(() => prisma.$disconnect());
