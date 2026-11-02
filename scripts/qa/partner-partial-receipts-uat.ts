import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import {
  createPartnerReceipt,
  deletePartnerReceipt,
  getPartnerInvoiceById,
  listPartnerBilling,
} from "../../lib/partner-billing";
import {
  financeApprovePartnerReceipt,
  financeRejectPartnerReceipt,
  revokePartnerReceiptApprovalForRedo,
} from "../../lib/partner-receipt-approval";
import {
  loadPartnerReceiptBalance,
  withPartnerReceiptLock,
  PARTNER_RECEIVING_ENTITY,
} from "../../lib/partner-receipt-balance";
async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
    const u = new URL(process.env[key] || "");
    assert.equal(u.hostname, "127.0.0.1");
    assert.equal(u.port, "55439");
    assert.equal(u.pathname, "/sgt_staff_feedback_test");
  }
  const keys = [
    "partner_billing_v1",
    "partner_receipt_approval_v1",
    "approval_finance_emails_v1",
  ];
  const old = await prisma.appSetting.findMany({
    where: { key: { in: keys } },
  });
  const actor = randomUUID() + "@uat.invalid",
    partnerId = randomUUID();
  const credits: string[] = [];
  const invoices = Array.from({ length: 5 }, (_, i) => ({
    id: randomUUID(),
    partnerId,
    partnerName: "Training partner",
    mode: "OFFLINE_MONTHLY",
    monthKey: "2057-01",
    settlementIds: [],
    invoiceNo: `RGT-205701-${String(i + 1).padStart(4, "0")}`,
    issueDate: "2057-01-02",
    dueDate: "2057-01-31",
    billTo: "New Oriental Beijing (training)",
    paymentTerms: "Training",
    courseStartDate: null,
    courseEndDate: null,
    description: "Training invoice",
    lines: [
      {
        id: randomUUID(),
        type: "MANUAL",
        settlementId: null,
        description: "Training service",
        quantity: 1,
        amount: i === 1 || i === 2 ? 100 : 5580,
        gstAmount: 0,
        totalAmount: i === 1 || i === 2 ? 100 : 5580,
      },
    ],
    amount: i === 1 || i === 2 ? 100 : 5580,
    gstAmount: 0,
    totalAmount: i === 1 || i === 2 ? 100 : 5580,
    note: null,
    createdBy: actor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const payment = {
    id: randomUUID(),
    partnerId,
    mode: "OFFLINE_MONTHLY",
    monthKey: "2057-01",
    paymentDate: "2057-01-02",
    paymentMethod: "Bank transfer",
    referenceNo: "TRAINING-PROOF",
    uploadedBy: actor,
    uploadedAt: new Date().toISOString(),
    originalFileName: "Training proof.pdf",
    storedFileName: "Training proof.pdf",
    relativePath: "/uploads/business/training.pdf",
    note: null,
  };
  const input = (
    i: number,
    amount: number,
    payer = "New Oriental Beijing (training)",
  ) => ({
    invoiceId: invoices[i].id,
    submissionId: randomUUID(),
    receiptNo: "",
    receiptDate: "2057-01-02",
    receivedFrom: payer,
    receivingEntity: PARTNER_RECEIVING_ENTITY,
    paidBy: "Bank transfer",
    quantity: 1,
    description: "Ignored client description",
    amount: 0,
    gstAmount: 999,
    totalAmount: 999999,
    amountReceived: amount,
    paymentRecordId: payment.id,
    createdBy: actor,
  });
  const balance = (i: number) =>
    withPartnerReceiptLock((tx) =>
      loadPartnerReceiptBalance(tx, invoices[i].id),
    );
  try {
    for (const [key, value] of Object.entries({
      partner_billing_v1: JSON.stringify({
        invoices,
        paymentRecords: [payment],
        receipts: [],
        deletedInvoices: [],
        invoiceSeqByMonth: {},
      }),
      partner_receipt_approval_v1: "[]",
      approval_finance_emails_v1: actor,
    }))
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    const original = await getPartnerInvoiceById(invoices[0].id);
    const firstInput = input(0, 3690);
    const submitted = await Promise.allSettled([
      createPartnerReceipt(firstInput),
      createPartnerReceipt(firstInput),
    ]);
    for (const result of submitted) assert.equal(result.status, "fulfilled");
    const duplicate = submitted.map(
      (result) =>
        (
          result as PromiseFulfilledResult<
            Awaited<ReturnType<typeof createPartnerReceipt>>
          >
        ).value,
    );
    assert.equal(duplicate[0].id, duplicate[1].id);
    const first = duplicate[0];
    assert.equal(first.amount, 3690);
    assert.equal(first.gstAmount, 0);
    assert.match(first.receiptNo, /-RC-01$/);
    assert.equal((await balance(0)).availableAmount, 1890);
    assert.equal((await balance(0)).remainingAmount, 5580);
    await financeApprovePartnerReceipt(first.id, actor);
    assert.equal((await balance(0)).approvedAmount, 3690);
    assert.equal((await balance(0)).remainingAmount, 1890);
    await assert.rejects(createPartnerReceipt(input(0, 1890.01)), /exceeds/);
    const second = await createPartnerReceipt(
      input(0, 1890, "New Oriental Singapore (training)"),
    );
    assert.match(second.receiptNo, /-RC-02$/);
    assert.equal((await balance(0)).availableAmount, 0);
    await financeApprovePartnerReceipt(second.id, actor);
    assert.equal((await balance(0)).remainingAmount, 0);
    assert.deepEqual(await getPartnerInvoiceById(invoices[0].id), original);
    await assert.rejects(
      deletePartnerReceipt({ receiptId: first.id, actorEmail: actor }),
      /Approved receipts/,
    );
    await assert.rejects(
      createPartnerReceipt({
        ...input(1, 1),
        receivingEntity: "Another company",
      }),
      /Receiving entity/,
    );
    await assert.rejects(createPartnerReceipt(input(1, 0.001)), /positive/);
    const race = await Promise.allSettled([
      createPartnerReceipt(input(1, 80)),
      createPartnerReceipt(input(1, 80)),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    const winner = (
      race.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
        typeof first
      >
    ).value;
    await deletePartnerReceipt({ receiptId: winner.id, actorEmail: actor });
    const afterDelete = await createPartnerReceipt(input(1, 1));
    assert.match(afterDelete.receiptNo, /-RC-02$/);
    const rejected = await createPartnerReceipt(input(2, 100));
    await financeRejectPartnerReceipt(
      rejected.id,
      actor,
      "Wrong training evidence",
    );
    const replacement = await createPartnerReceipt(input(2, 100));
    await assert.rejects(
      financeApprovePartnerReceipt(rejected.id, actor),
      /exceeds/,
    );
    await assert.rejects(
      revokePartnerReceiptApprovalForRedo(
        rejected.id,
        actor,
        "Training reopen",
      ),
      /exceeds/,
    );
    await financeApprovePartnerReceipt(replacement.id, actor);
    assert.equal((await balance(2)).approvedAmount, 100);
    // Simulate an existing legacy receipt number without rewriting its historical identifier.
    const raw = await prisma.appSetting.findUniqueOrThrow({
      where: { key: "partner_billing_v1" },
    });
    const store = JSON.parse(raw.value);
    store.receipts.push({
      ...first,
      id: randomUUID(),
      submissionId: undefined,
      invoiceId: invoices[3].id,
      receiptNo: invoices[3].invoiceNo + "-RC",
    });
    await prisma.appSetting.update({
      where: { key: "partner_billing_v1" },
      data: { value: JSON.stringify(store) },
    });
    const legacyTail = await createPartnerReceipt(input(3, 1890));
    assert.match(legacyTail.receiptNo, /-RC-02$/);
    const credit = await prisma.creditNote.create({
      data: {
        sourceType: "PARTNER_INVOICE",
        sourceInvoiceId: invoices[4].id,
        sourceInvoiceNo: invoices[4].invoiceNo,
        sourceInvoiceDate: "2057-01-02",
        sourceInvoiceSnapshot: {},
        creditNoteNo: "TRAINING-CN-" + randomUUID(),
        issueDate: "2057-01-02",
        currency: "SGD",
        supplierName: PARTNER_RECEIVING_ENTITY,
        supplierAddress: "Training",
        supplierRegistrationNo: "Training",
        customerName: "Training customer",
        customerAddress: "Training address",
        reason: "Training credit",
        originalInvoiceTotal: 5580,
        amount: 300,
        gstAmount: 0,
        totalAmount: 300,
        status: "ISSUED",
        createdBy: actor,
      },
    });
    credits.push(credit.id);
    await assert.rejects(createPartnerReceipt(input(4, 5580)), /exceeds/);
    const credited = await createPartnerReceipt(input(4, 5280));
    assert.equal(credited.totalAmount, 5280);
    assert(credited.note?.includes(credit.creditNoteNo));
    assert.equal(
      (await listPartnerBilling()).receipts.filter(
        (r) => r.invoiceId === invoices[0].id,
      ).length,
      2,
    );
    console.log(
      JSON.stringify({
        passed: true,
        Beijing3690Singapore1890: true,
        invoiceUnchanged: true,
        pendingReservesBalance: true,
        approvedTracksOutstanding: true,
        duplicateSubmissionIdempotent: true,
        concurrentOverpaymentOneWinner: true,
        rejectedReapprovalAndReopenCannotOverbook: true,
        approvedDeletionBlocked: true,
        deletedReceiptNumberNotReused: true,
        legacyReceiptNumberPreserved: true,
        issuedCreditNetRespected: true,
        postedSubtotalAndTaxIgnored: true,
        receivingEntityValidated: true,
      }),
    );
  } finally {
    await prisma.creditNote.deleteMany({ where: { id: { in: credits } } });
    await prisma.auditLog.deleteMany({ where: { actorEmail: actor } });
    for (const key of keys) {
      const previous = old.find((r) => r.key === key);
      if (previous)
        await prisma.appSetting.upsert({
          where: { key },
          create: { key, value: previous.value },
          update: { value: previous.value },
        });
      else await prisma.appSetting.deleteMany({ where: { key } });
    }
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
