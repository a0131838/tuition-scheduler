import { canAccessResourceWorkspaceRole } from "./staff-roles";
import { prisma } from "./prisma";
import { NETWORK_KEY } from "./sales-network-source";
import { validateNetworkStore, type NetworkNode } from "./sales-network-types";
import { assertCustomerVisible, customerTeamManager } from "./customer-access";
import { canReadSalesEvidence } from "./sales-evidence-policy";
import type { RelationshipActor } from "./sales-relationship-policy";
import { parseSalesBilling, parseSalesApprovals } from "./sales-invoice-policy";
import { getApprovalRoleConfig } from "./approval-flow";
import {
  customerInvoice,
  summarizeCustomerInvoices,
  type CustomerInvoiceRow,
} from "./customer-finance-policy";
export async function readCustomerDetail(actor: RelationshipActor, id: string) {
  if (!canAccessResourceWorkspaceRole(actor.role) && !actor.operationsAdmin)
    throw new Error("Customer access denied / 无客户访问权限");
  const raw = await prisma.appSetting.findUnique({
    where: { key: NETWORK_KEY },
  });
  if (!raw)
    throw new Error(
      "Customer workspace is not initialized / 客户工作台尚未初始化",
    );
  const store = validateNetworkStore(JSON.parse(raw.value)),
    node = store.nodes.find((n) => n.id === id && n.kind !== "ROOT");
  if (!node) throw new Error("Customer unavailable / 客户不存在");
  const manager = await customerTeamManager(actor);
  assertCustomerVisible(actor, node, manager);
  const [parent, partner, lead, relationship, owners] = await Promise.all([
    node.parentId
      ? prisma.parentAccount.findUnique({
          where: { id: node.parentId },
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            studentLinks: { select: { studentId: true, relationship: true } },
          },
        })
      : null,
    node.partnerId
      ? prisma.partner.findUnique({
          where: { id: node.partnerId },
          select: {
            id: true,
            name: true,
            isActive: true,
            sourceChannelId: true,
          },
        })
      : null,
    node.leadId
      ? prisma.lead.findUnique({
          where: { id: node.leadId },
          select: {
            id: true,
            studentName: true,
            status: true,
            convertedStudentId: true,
            nextAction: true,
            nextActionDue: true,
            ownerName: true,
          },
        })
      : null,
    node.relationshipId
      ? prisma.salesRelationship.findUnique({
          where: { id: node.relationshipId },
          select: {
            id: true,
            name: true,
            status: true,
            nextAction: true,
            nextActionDue: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
            contactWechat: true,
            followUps: {
              take: 5,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                actorName: true,
                content: true,
                createdAt: true,
              },
            },
            opportunities: {
              select: {
                id: true,
                title: true,
                status: true,
                nextAction: true,
                nextActionDue: true,
              },
            },
            leads: {
              where: { recordKind: "STUDENT" },
              select: {
                id: true,
                studentName: true,
                status: true,
                convertedStudentId: true,
              },
            },
          },
        })
      : null,
    prisma.user.findMany({
      where: {
        id: {
          in: [node.ownerUserId, ...(node.collaboratorUserIds ?? [])].filter(
            (x): x is string => Boolean(x),
          ),
        },
      },
      select: { id: true, name: true },
    }),
  ]);
  const partnerStudents = partner
    ? await prisma.student.findMany({
        where: { sourceChannelId: partner.sourceChannelId },
        select: { id: true, name: true, school: true, grade: true },
        take: 100,
      })
    : [];
  const guardianEdges = store.edges.filter(
    (e) =>
      !e.archived &&
      e.confirmed &&
      e.meaning === "GUARDIAN" &&
      (e.from === node.id || e.to === node.id),
  );
  const studentIds = [
    ...new Set(
      [
        node.studentId,
        lead?.convertedStudentId,
        ...(parent?.studentLinks.map((l) => l.studentId) ?? []),
        ...(node.kind === "PARENT"
          ? guardianEdges.flatMap((e) => {
              const other = store.nodes.find(
                (n) => n.id === (e.from === node.id ? e.to : e.from),
              );
              return other?.studentId ? [other.studentId] : [];
            })
          : []),
      ].filter((x): x is string => Boolean(x)),
    ),
  ];
  const [students, packages, renewals, parents, contracts] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        school: true,
        grade: true,
        nextAction: true,
        nextActionDue: true,
        advisorOwner: true,
      },
    }),
    prisma.coursePackage.findMany({
      where: {
        OR: [
          { studentId: { in: studentIds } },
          { sharedStudents: { some: { studentId: { in: studentIds } } } },
        ],
      },
      select: {
        id: true,
        studentId: true,
        sharedStudents: { select: { studentId: true } },
        type: true,
        status: true,
        remainingMinutes: true,
        validTo: true,
        course: { select: { name: true } },
      },
    }),
    prisma.renewalTask.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        id: true,
        studentId: true,
        packageId: true,
        status: true,
        nextFollowUpAt: true,
        completedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.parentStudentLink.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        studentId: true,
        relationship: true,
        parent: { select: { id: true, name: true, phone: true } },
      },
    }),
    canReadSalesEvidence(actor)
      ? prisma.studentContract.findMany({
          where: { studentId: { in: studentIds } },
          select: {
            id: true,
            studentId: true,
            packageId: true,
            invoiceId: true,
            flowType: true,
            status: true,
            signedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);
  const finance = canReadSalesEvidence(actor)
    ? await readCustomerFinance(studentIds, partner?.id, packages, contracts)
    : { access: "DENIED" as const };
  return {
    node,
    revision: store.revision,
    manager,
    owner: owners.find((u) => u.id === node.ownerUserId) ?? null,
    collaborators: owners.filter((u) =>
      node.collaboratorUserIds?.includes(u.id),
    ),
    parent,
    partner,
    partnerStudents,
    missing: [
      node.studentId && !students.some((s) => s.id === node.studentId)
        ? "student"
        : null,
      node.parentId && !parent ? "parent" : null,
      node.partnerId && !partner ? "partner" : null,
      node.leadId && !lead ? "lead" : null,
      node.relationshipId && !relationship ? "relationship" : null,
    ].filter(Boolean),
    lead,
    relationship,
    students,
    packages: packages.map((p) => ({
      ...p,
      shared: p.sharedStudents.length > 0,
      studentId: studentIds.includes(p.studentId) ? p.studentId : "",
      sharedStudents: p.sharedStudents.filter((s) =>
        studentIds.includes(s.studentId),
      ),
    })),
    renewals,
    parents,
    contracts,
    finance,
    connections: store.edges
      .filter((e) => !e.archived && (e.from === node.id || e.to === node.id))
      .flatMap((e) => {
        const other = store.nodes.find(
          (n) => n.id === (e.from === node.id ? e.to : e.from),
        );
        if (!other) return [];
        try {
          assertCustomerVisible(actor, other, manager);
        } catch {
          return [];
        }
        return [
          {
            id: e.id,
            revision: e.revision ?? 0,
            name: other.name,
            nodeId: other.id,
            label: e.label,
            confirmed: e.confirmed,
            meaning: e.meaning,
          },
        ];
      }),
  };
}
async function readCustomerFinance(
  studentIds: string[],
  partnerId: string | undefined,
  packages: Array<{
    id: string;
    studentId: string;
    sharedStudents: Array<{ studentId: string }>;
  }>,
  contracts: Array<{ invoiceId: string | null; flowType: string }>,
) {
  const keys = [
    "parent_billing_v1",
    "parent_receipt_approval_v1",
    ...(partnerId ? ["partner_billing_v1", "partner_receipt_approval_v1"] : []),
  ];
  const [settings, roles, credits] = await Promise.all([
    prisma.appSetting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    }),
    getApprovalRoleConfig(),
    partnerId
      ? prisma.creditNote.findMany({
          where: { sourceType: "PARTNER_INVOICE", status: "ISSUED" },
          select: {
            id: true,
            sourceInvoiceId: true,
            status: true,
            issuedAt: true,
            voidedAt: true,
            totalAmount: true,
            currency: true,
            sourceInvoiceNo: true,
            originalInvoiceTotal: true,
            amount: true,
            gstAmount: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const get = (key: string) =>
    settings.find((s) => s.key === key)?.value ?? null;
  const rows: CustomerInvoiceRow[] = [];
  let invalidSource = false;
  for (const channel of [
    "PARENT",
    ...(partnerId ? ["PARTNER"] : []),
  ] as const) {
    const prefix = channel === "PARENT" ? "parent" : "partner";
    const billing = parseSalesBilling(get(prefix + "_billing_v1")),
      approvals = parseSalesApprovals(get(prefix + "_receipt_approval_v1"));
    if (!billing.valid || !approvals.valid) invalidSource = true;
    const context = {
      billing,
      approvals,
      financeApproverEmails: roles.financeApproverEmails,
      packages: packages.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        sharedStudentIds: p.sharedStudents.map((s) => s.studentId),
      })),
      credits:
        channel === "PARTNER"
          ? credits.map((c) => ({
              ...c,
              totalAmount: Number(c.totalAmount),
              originalInvoiceTotal: Number(c.originalInvoiceTotal),
              amount: Number(c.amount),
              gstAmount: Number(c.gstAmount),
            }))
          : [],
    };
    for (const invoice of billing.invoices.filter((i) =>
      channel === "PARENT"
        ? typeof i.studentId === "string" && studentIds.includes(i.studentId)
        : i.partnerId === partnerId,
    ))
      rows.push(
        customerInvoice(
          invoice,
          channel as "PARENT" | "PARTNER",
          context,
          { studentIds, partnerId },
          contracts.some(
            (c) => c.invoiceId === invoice.id && c.flowType === "RENEWAL",
          ),
        ),
      );
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return {
    access: "ALLOWED" as const,
    invalidSource,
    rows,
    summary: summarizeCustomerInvoices(rows),
    note: "Family/customer payment facts only; not sales attribution. Shared invoices are counted once. / 仅客户付款事实，不作为个人业绩归属；共享单据去重。",
  };
}
export type CustomerDetail = Awaited<ReturnType<typeof readCustomerDetail>>;
