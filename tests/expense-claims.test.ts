import assert from "node:assert/strict";
import test from "node:test";
import { ExpenseClaimStatus } from "@prisma/client";
import { updateExpenseClaimWithExpectedStatusForDb } from "../lib/expense-claims";

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
