import assert from "node:assert/strict";
import test from "node:test";
import { ExpenseClaimStatus } from "@prisma/client";
import { findRecentDuplicateExpenseClaimForDb, updateExpenseClaimWithExpectedStatusForDb } from "../lib/expense-claims";

test("expense claim transition uses conditional update on expected status", async () => {
  const calls: Array<unknown> = [];
  const db = {
    expenseClaim: {
      async findUnique(args: unknown) {
        calls.push(["findUnique", args]);
        if (calls.length === 1) return { id: "claim-1", status: ExpenseClaimStatus.SUBMITTED };
        return { id: "claim-1", status: ExpenseClaimStatus.APPROVED, claimRefNo: "EC-001" };
      },
      async updateMany(args: unknown) {
        calls.push(["updateMany", args]);
        return { count: 1 };
      },
    },
  };

  const row = await updateExpenseClaimWithExpectedStatusForDb(db as any, {
    claimId: "claim-1",
    expectedStatus: ExpenseClaimStatus.SUBMITTED,
    notAllowedMessage: "Only submitted claims can be approved",
    data: { status: ExpenseClaimStatus.APPROVED },
  });

  assert.equal(row.status, ExpenseClaimStatus.APPROVED);
  assert.deepEqual(calls[1], [
    "updateMany",
    {
      where: { id: "claim-1", status: ExpenseClaimStatus.SUBMITTED },
      data: { status: ExpenseClaimStatus.APPROVED },
    },
  ]);
});

test("expense claim transition rejects stale concurrent updates", async () => {
  let findCount = 0;
  const db = {
    expenseClaim: {
      async findUnique() {
        findCount += 1;
        if (findCount === 1) return { id: "claim-2", status: ExpenseClaimStatus.SUBMITTED };
        return { id: "claim-2", status: ExpenseClaimStatus.APPROVED };
      },
      async updateMany() {
        return { count: 0 };
      },
    },
  };

  await assert.rejects(
    () =>
      updateExpenseClaimWithExpectedStatusForDb(db as any, {
        claimId: "claim-2",
        expectedStatus: ExpenseClaimStatus.SUBMITTED,
        notAllowedMessage: "Only submitted claims can be approved",
        data: { status: ExpenseClaimStatus.APPROVED },
      }),
    /Only submitted claims can be approved/
  );
});

test("duplicate expense claim lookup matches exact recent submissions only", async () => {
  let receivedWhere: unknown = null;
  const db = {
    expenseClaim: {
      async findFirst(args: any) {
        receivedWhere = args.where;
        return { id: "claim-dup-1" };
      },
    },
  };

  const row = await findRecentDuplicateExpenseClaimForDb(
    db as any,
    {
      submitterUserId: "teacher-1",
      expenseDate: new Date("2026-03-29T12:00:00.000Z"),
      description: "Travel to the center for teaching.",
      studentName: null,
      location: "From NTU to orchard plaza",
      amountCents: 3180,
      gstAmountCents: null,
      currencyCode: "sgd",
      expenseTypeCode: "TRANSPORT",
      accountCode: "6040",
      receiptOriginalName: "Screenshot_20260330_093807_Grab.jpg",
      remarks: null,
    },
    new Date("2026-03-30T01:40:32.470Z"),
  );

  assert.equal(row?.id, "claim-dup-1");
  assert.deepEqual(receivedWhere, {
    submitterUserId: "teacher-1",
    expenseDate: new Date("2026-03-29T12:00:00.000Z"),
    description: "Travel to the center for teaching.",
    studentName: null,
    location: "From NTU to orchard plaza",
    amountCents: 3180,
    gstAmountCents: null,
    currencyCode: "SGD",
    expenseTypeCode: "TRANSPORT",
    accountCode: "6040",
    receiptOriginalName: "Screenshot_20260330_093807_Grab.jpg",
    remarks: null,
    status: { in: [ExpenseClaimStatus.SUBMITTED, ExpenseClaimStatus.APPROVED, ExpenseClaimStatus.PAID] },
    createdAt: { gte: new Date("2026-03-30T01:25:32.470Z") },
  });
});
