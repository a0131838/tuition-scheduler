import assert from "node:assert/strict";
import test from "node:test";
import {
  buildParentReceiptNoForInvoice,
  createParentInvoice,
  createParentReceipt,
} from "../lib/student-parent-billing";
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

test("parent receipt numbering progresses as RC, RC2, RC3 for the same invoice", async () => {
  const invoice = {
    id: "inv-1",
    packageId: "pkg-1",
    studentId: "stu-1",
    invoiceNo: "RGT-202604-0005",
    issueDate: "2026-04-13",
    dueDate: "2026-04-13",
    courseStartDate: null,
    courseEndDate: null,
    billTo: "Parent A",
    quantity: 1,
    description: "Invoice",
    amount: 3000,
    gstAmount: 0,
    totalAmount: 3000,
    paymentTerms: "Immediate",
    note: null,
    createdBy: "finance@test.com",
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  };

  const store = makeAppSettingStub({
    initialValue: {
      invoices: [invoice],
      paymentRecords: [
        {
          id: "pay-1",
          packageId: "pkg-1",
          studentId: "stu-1",
          paymentDate: "2026-04-13",
          paymentMethod: "Paynow",
          referenceNo: "TXN-1",
          uploadedBy: "finance@test.com",
          uploadedAt: "2026-04-13T10:01:00.000Z",
          originalFileName: "proof-1.jpg",
          storedFileName: "proof-1.jpg",
          relativePath: "payment-proofs/proof-1.jpg",
          note: null,
        },
        {
          id: "pay-2",
          packageId: "pkg-1",
          studentId: "stu-1",
          paymentDate: "2026-04-14",
          paymentMethod: "Paynow",
          referenceNo: "TXN-2",
          uploadedBy: "finance@test.com",
          uploadedAt: "2026-04-14T10:01:00.000Z",
          originalFileName: "proof-2.jpg",
          storedFileName: "proof-2.jpg",
          relativePath: "payment-proofs/proof-2.jpg",
          note: null,
        },
      ],
      receipts: [],
      invoiceSeqByMonth: { "202604": 5 },
    },
  });

  await withPrismaStubs(store.api, async () => {
    const receiptNo1 = await buildParentReceiptNoForInvoice("inv-1");
    assert.equal(receiptNo1, "RGT-202604-0005-RC");

    await createParentReceipt({
      packageId: "pkg-1",
      studentId: "stu-1",
      invoiceId: "inv-1",
      paymentRecordId: "pay-1",
      receiptNo: receiptNo1,
      receiptDate: "2026-04-13",
      receivedFrom: "Parent A",
      paidBy: "Paynow",
      quantity: 1,
      description: "Receipt 1",
      amount: 1000,
      gstAmount: 0,
      totalAmount: 1000,
      amountReceived: 1000,
      createdBy: "finance@test.com",
    });

    const receiptNo2 = await buildParentReceiptNoForInvoice("inv-1");
    assert.equal(receiptNo2, "RGT-202604-0005-RC2");

    await createParentReceipt({
      packageId: "pkg-1",
      studentId: "stu-1",
      invoiceId: "inv-1",
      paymentRecordId: "pay-2",
      receiptNo: receiptNo2,
      receiptDate: "2026-04-14",
      receivedFrom: "Parent A",
      paidBy: "Paynow",
      quantity: 1,
      description: "Receipt 2",
      amount: 1000,
      gstAmount: 0,
      totalAmount: 1000,
      amountReceived: 1000,
      createdBy: "finance@test.com",
    });

    const receiptNo3 = await buildParentReceiptNoForInvoice("inv-1");
    assert.equal(receiptNo3, "RGT-202604-0005-RC3");
  });
});

test("parent partial receipt can create a second receipt up to the remaining invoice balance", async () => {
  const store = makeAppSettingStub({
    initialValue: {
      invoices: [
        {
          id: "inv-2",
          packageId: "pkg-2",
          studentId: "stu-2",
          invoiceNo: "RGT-202604-0006",
          issueDate: "2026-04-13",
          dueDate: "2026-04-13",
          courseStartDate: null,
          courseEndDate: null,
          billTo: "Parent B",
          quantity: 1,
          description: "Invoice",
          amount: 3000,
          gstAmount: 0,
          totalAmount: 3000,
          paymentTerms: "Immediate",
          note: null,
          createdBy: "finance@test.com",
          createdAt: "2026-04-13T10:00:00.000Z",
          updatedAt: "2026-04-13T10:00:00.000Z",
        },
      ],
      paymentRecords: [
        {
          id: "pay-3",
          packageId: "pkg-2",
          studentId: "stu-2",
          paymentDate: "2026-04-13",
          paymentMethod: "Paynow",
          referenceNo: "TXN-3",
          uploadedBy: "finance@test.com",
          uploadedAt: "2026-04-13T10:01:00.000Z",
          originalFileName: "proof-3.jpg",
          storedFileName: "proof-3.jpg",
          relativePath: "payment-proofs/proof-3.jpg",
          note: null,
        },
        {
          id: "pay-4",
          packageId: "pkg-2",
          studentId: "stu-2",
          paymentDate: "2026-04-15",
          paymentMethod: "Bank transfer",
          referenceNo: "TXN-4",
          uploadedBy: "finance@test.com",
          uploadedAt: "2026-04-15T10:01:00.000Z",
          originalFileName: "proof-4.jpg",
          storedFileName: "proof-4.jpg",
          relativePath: "payment-proofs/proof-4.jpg",
          note: null,
        },
      ],
      receipts: [
        {
          id: "rc-existing",
          packageId: "pkg-2",
          studentId: "stu-2",
          invoiceId: "inv-2",
          paymentRecordId: "pay-3",
          receiptNo: "RGT-202604-0006-RC",
          receiptDate: "2026-04-13",
          receivedFrom: "Parent B",
          paidBy: "Paynow",
          quantity: 1,
          description: "Receipt 1",
          amount: 1000,
          gstAmount: 0,
          totalAmount: 1000,
          amountReceived: 1000,
          note: null,
          createdBy: "finance@test.com",
          createdAt: "2026-04-13T10:02:00.000Z",
          updatedAt: "2026-04-13T10:02:00.000Z",
        },
      ],
      invoiceSeqByMonth: { "202604": 6 },
    },
  });

  await withPrismaStubs(store.api, async () => {
    const created = await createParentReceipt({
      packageId: "pkg-2",
      studentId: "stu-2",
      invoiceId: "inv-2",
      paymentRecordId: "pay-4",
      receiptNo: "RGT-202604-0006-RC2",
      receiptDate: "2026-04-15",
      receivedFrom: "Parent B",
      paidBy: "Bank transfer",
      quantity: 1,
      description: "Receipt 2",
      amount: 2000,
      gstAmount: 0,
      totalAmount: 2000,
      amountReceived: 2000,
      createdBy: "finance@test.com",
    });

    assert.equal(created.receiptNo, "RGT-202604-0006-RC2");
    assert.equal(created.paymentRecordId, "pay-4");
  });

  const saved = store.getValue();
  assert.equal(saved.receipts.length, 2);
  assert.deepEqual(
    saved.receipts.map((x: any) => x.receiptNo).sort(),
    ["RGT-202604-0006-RC", "RGT-202604-0006-RC2"],
  );
  assert.equal(saved.receipts.reduce((sum: number, x: any) => sum + Number(x.amountReceived || 0), 0), 3000);
});

test("parent partial receipt blocks amount received above remaining invoice balance", async () => {
  const store = makeAppSettingStub({
    initialValue: {
      invoices: [
        {
          id: "inv-3",
          packageId: "pkg-3",
          studentId: "stu-3",
          invoiceNo: "RGT-202604-0007",
          issueDate: "2026-04-13",
          dueDate: "2026-04-13",
          courseStartDate: null,
          courseEndDate: null,
          billTo: "Parent C",
          quantity: 1,
          description: "Invoice",
          amount: 2500,
          gstAmount: 0,
          totalAmount: 2500,
          paymentTerms: "Immediate",
          note: null,
          createdBy: "finance@test.com",
          createdAt: "2026-04-13T10:00:00.000Z",
          updatedAt: "2026-04-13T10:00:00.000Z",
        },
      ],
      paymentRecords: [],
      receipts: [
        {
          id: "rc-existing",
          packageId: "pkg-3",
          studentId: "stu-3",
          invoiceId: "inv-3",
          paymentRecordId: null,
          receiptNo: "RGT-202604-0007-RC",
          receiptDate: "2026-04-13",
          receivedFrom: "Parent C",
          paidBy: "Paynow",
          quantity: 1,
          description: "Receipt 1",
          amount: 1000,
          gstAmount: 0,
          totalAmount: 1000,
          amountReceived: 1000,
          note: null,
          createdBy: "finance@test.com",
          createdAt: "2026-04-13T10:02:00.000Z",
          updatedAt: "2026-04-13T10:02:00.000Z",
        },
      ],
      invoiceSeqByMonth: { "202604": 7 },
    },
  });

  await withPrismaStubs(store.api, async () => {
    await assert.rejects(
      () =>
        createParentReceipt({
          packageId: "pkg-3",
          studentId: "stu-3",
          invoiceId: "inv-3",
          paymentRecordId: null,
          receiptNo: "RGT-202604-0007-RC2",
          receiptDate: "2026-04-15",
          receivedFrom: "Parent C",
          paidBy: "Paynow",
          quantity: 1,
          description: "Receipt 2",
          amount: 1600,
          gstAmount: 0,
          totalAmount: 1600,
          amountReceived: 1600,
          createdBy: "finance@test.com",
        }),
      /Amount Received exceeds invoice remaining balance: 1500\.00/,
    );
  });
});

test("parent partial receipt rejects reusing the same payment record on another receipt", async () => {
  const store = makeAppSettingStub({
    initialValue: {
      invoices: [
        {
          id: "inv-4",
          packageId: "pkg-4",
          studentId: "stu-4",
          invoiceNo: "RGT-202604-0008",
          issueDate: "2026-04-13",
          dueDate: "2026-04-13",
          courseStartDate: null,
          courseEndDate: null,
          billTo: "Parent D",
          quantity: 1,
          description: "Invoice",
          amount: 3000,
          gstAmount: 0,
          totalAmount: 3000,
          paymentTerms: "Immediate",
          note: null,
          createdBy: "finance@test.com",
          createdAt: "2026-04-13T10:00:00.000Z",
          updatedAt: "2026-04-13T10:00:00.000Z",
        },
      ],
      paymentRecords: [
        {
          id: "pay-5",
          packageId: "pkg-4",
          studentId: "stu-4",
          paymentDate: "2026-04-13",
          paymentMethod: "Paynow",
          referenceNo: "TXN-5",
          uploadedBy: "finance@test.com",
          uploadedAt: "2026-04-13T10:01:00.000Z",
          originalFileName: "proof-5.jpg",
          storedFileName: "proof-5.jpg",
          relativePath: "payment-proofs/proof-5.jpg",
          note: null,
        },
      ],
      receipts: [
        {
          id: "rc-existing",
          packageId: "pkg-4",
          studentId: "stu-4",
          invoiceId: "inv-4",
          paymentRecordId: "pay-5",
          receiptNo: "RGT-202604-0008-RC",
          receiptDate: "2026-04-13",
          receivedFrom: "Parent D",
          paidBy: "Paynow",
          quantity: 1,
          description: "Receipt 1",
          amount: 1000,
          gstAmount: 0,
          totalAmount: 1000,
          amountReceived: 1000,
          note: null,
          createdBy: "finance@test.com",
          createdAt: "2026-04-13T10:02:00.000Z",
          updatedAt: "2026-04-13T10:02:00.000Z",
        },
      ],
      invoiceSeqByMonth: { "202604": 8 },
    },
  });

  await withPrismaStubs(store.api, async () => {
    await assert.rejects(
      () =>
        createParentReceipt({
          packageId: "pkg-4",
          studentId: "stu-4",
          invoiceId: "inv-4",
          paymentRecordId: "pay-5",
          receiptNo: "RGT-202604-0008-RC2",
          receiptDate: "2026-04-15",
          receivedFrom: "Parent D",
          paidBy: "Paynow",
          quantity: 1,
          description: "Receipt 2",
          amount: 1000,
          gstAmount: 0,
          totalAmount: 1000,
          amountReceived: 1000,
          createdBy: "finance@test.com",
        }),
      /This payment record is already linked to another receipt/,
    );
  });
});
