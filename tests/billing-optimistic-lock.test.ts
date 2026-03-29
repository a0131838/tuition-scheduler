import assert from "node:assert/strict";
import test from "node:test";
import { createParentInvoice } from "../lib/student-parent-billing";
import { getParentReceiptApprovalMap } from "../lib/parent-receipt-approval";
import { managerRejectPartnerSettlement } from "../lib/partner-settlement-approval";
import { prisma } from "../lib/prisma";

type AppSettingRow = {
  key: string;
  value: string;
  updatedAt: Date;
};

function makeAppSettingStub(options?: {
  initialValue?: unknown;
  conflictMutation?: (current: unknown) => unknown;
}) {
  let version = 0;
  let row: AppSettingRow | null =
    options?.initialValue === undefined
      ? null
      : {
          key: "test",
          value: JSON.stringify(options.initialValue),
          updatedAt: new Date(`2026-03-27T10:00:0${version}.000Z`),
        };
  let conflictInjected = false;

  return {
    getValue() {
      return row ? JSON.parse(row.value) : null;
    },
    api: {
      async findUnique(args: any) {
        if (!row) return null;
        return { key: row.key, value: row.value, updatedAt: row.updatedAt };
      },
      async create(args: any) {
        if (row) throw new Error("duplicate create");
        version += 1;
        row = {
          key: args.data.key,
          value: args.data.value,
          updatedAt: new Date(`2026-03-27T10:00:0${version}.000Z`),
        };
        return row;
      },
      async updateMany(args: any) {
        if (
          !conflictInjected &&
          options?.conflictMutation &&
          row &&
          row.updatedAt.getTime() === args.where.updatedAt.getTime()
        ) {
          conflictInjected = true;
          version += 1;
          row = {
            key: row.key,
            value: JSON.stringify(options.conflictMutation(JSON.parse(row.value))),
            updatedAt: new Date(`2026-03-27T10:00:0${version}.000Z`),
          };
          return { count: 0 };
        }

        if (!row) return { count: 0 };
        if (row.updatedAt.getTime() !== args.where.updatedAt.getTime()) return { count: 0 };
        version += 1;
        row = {
          key: row.key,
          value: args.data.value,
          updatedAt: new Date(`2026-03-27T10:00:0${version}.000Z`),
        };
        return { count: 1 };
      },
    },
  };
}

async function withPrismaStubs(
  appSettingApi: {
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    updateMany(args: any): Promise<any>;
  },
  run: () => Promise<void>,
) {
  const appSetting = prisma.appSetting as any;
  const auditLog = prisma.auditLog as any;
  const original = {
    findUnique: appSetting.findUnique,
    create: appSetting.create,
    updateMany: appSetting.updateMany,
    auditCreate: auditLog.create,
  };

  appSetting.findUnique = appSettingApi.findUnique;
  appSetting.create = appSettingApi.create;
  appSetting.updateMany = appSettingApi.updateMany;
  auditLog.create = async () => ({ id: "audit-1" });

  try {
    await run();
  } finally {
    appSetting.findUnique = original.findUnique;
    appSetting.create = original.create;
    appSetting.updateMany = original.updateMany;
    auditLog.create = original.auditCreate;
  }
}

test("parent invoice creation retries on optimistic-lock conflict and preserves concurrent invoice", async () => {
  const existingInvoice = {
    id: "inv-existing",
    packageId: "pkg-1",
    studentId: "stu-1",
    invoiceNo: "RGT-202603-0001",
    issueDate: "2026-03-01",
    dueDate: "2026-03-01",
    courseStartDate: null,
    courseEndDate: null,
    billTo: "Parent A",
    quantity: 1,
    description: "Existing",
    amount: 100,
    gstAmount: 9,
    totalAmount: 109,
    paymentTerms: "Immediate",
    note: null,
    createdBy: "ops@test.com",
    createdAt: "2026-03-27T10:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
  };

  const store = makeAppSettingStub({
    initialValue: { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} },
    conflictMutation: () => ({
      invoices: [existingInvoice],
      paymentRecords: [],
      receipts: [],
      invoiceSeqByMonth: { "202603": 1 },
    }),
  });

  await withPrismaStubs(store.api, async () => {
    const created = await createParentInvoice({
      packageId: "pkg-2",
      studentId: "stu-2",
      invoiceNo: "RGT-202603-0002",
      issueDate: "2026-03-27",
      dueDate: "2026-03-27",
      billTo: "Parent B",
      quantity: 1,
      description: "New invoice",
      amount: 200,
      gstAmount: 18,
      totalAmount: 218,
      paymentTerms: "Immediate",
      createdBy: "ops@test.com",
    });

    assert.equal(created.invoiceNo, "RGT-202603-0002");
  });

  const saved = store.getValue();
  assert.equal(saved.invoices.length, 2);
  assert.deepEqual(
    saved.invoices.map((x: any) => x.invoiceNo).sort(),
    ["RGT-202603-0001", "RGT-202603-0002"],
  );
  assert.equal(saved.invoiceSeqByMonth["202603"], 2);
});

test("partner settlement manager reject retries on conflict and clears finance approvals on latest state", async () => {
  const store = makeAppSettingStub({
    initialValue: [
      {
        settlementId: "settlement-1",
        managerApprovedBy: ["manager1@test.com"],
        financeApprovedBy: [],
        exportedAt: null,
        exportedBy: null,
        managerRejectedAt: null,
        managerRejectedBy: null,
        managerRejectReason: null,
        financeRejectedAt: null,
        financeRejectedBy: null,
        financeRejectReason: null,
      },
    ],
    conflictMutation: (current) => {
      const rows = current as any[];
      return rows.map((row) =>
        row.settlementId === "settlement-1"
          ? {
              ...row,
              financeApprovedBy: ["finance@test.com"],
              exportedAt: "2026-03-27T10:00:05.000Z",
              exportedBy: "finance@test.com",
            }
          : row,
      );
    },
  });

  await withPrismaStubs(store.api, async () => {
    await managerRejectPartnerSettlement("settlement-1", "manager1@test.com", "redo settlement");
  });

  const [saved] = store.getValue();
  assert.deepEqual(saved.managerApprovedBy, []);
  assert.deepEqual(saved.financeApprovedBy, []);
  assert.equal(saved.exportedAt, null);
  assert.equal(saved.exportedBy, null);
  assert.equal(saved.managerRejectedBy, "manager1@test.com");
  assert.equal(saved.managerRejectReason, "redo settlement");
});

test("parent receipt approval map reads existing stored approvals from AppSetting JSON", async () => {
  const store = makeAppSettingStub({
    initialValue: [
      {
        receiptId: "receipt-1",
        managerApprovedBy: ["JASMINE@123.COM"],
        financeApprovedBy: [],
        managerRejectedAt: null,
        managerRejectedBy: null,
        managerRejectReason: null,
        financeRejectedAt: null,
        financeRejectedBy: null,
        financeRejectReason: null,
      },
    ],
  });

  await withPrismaStubs(store.api, async () => {
    const approvalMap = await getParentReceiptApprovalMap(["receipt-1"]);
    const row = approvalMap.get("receipt-1");
    assert.ok(row);
    assert.deepEqual(row.managerApprovedBy, ["jasmine@123.com"]);
    assert.deepEqual(row.financeApprovedBy, []);
  });
});
