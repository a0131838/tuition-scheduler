import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile } from "@/lib/business-file-storage";
import { formatUTCDateOnly, parseDateOnlyToUTCNoon } from "@/lib/date-only";
import { storeExpenseClaimFile } from "@/lib/expense-claim-files";
import {
  createExpenseClaim,
  DuplicateExpenseClaimError,
  EXPENSE_CURRENCY_CODES,
  EXPENSE_TYPE_OPTIONS,
  formatExpenseMoney,
  getExpenseTypeOption,
  requiresExpenseLocation,
} from "@/lib/expense-claims";
import { miniappTeacherExpenseStatusText } from "@/lib/miniapp-teacher-workbench";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function moneyToCents(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").trim());
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const rows = await prisma.expenseClaim.findMany({
    where: { submitterUserId: access.user.id, archivedAt: null, status: { not: "WITHDRAWN" } },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  const summary = {
    total: rows.length,
    submitted: rows.filter((row) => row.status === "SUBMITTED").length,
    approved: rows.filter((row) => row.status === "APPROVED").length,
    rejected: rows.filter((row) => row.status === "REJECTED").length,
    paid: rows.filter((row) => row.status === "PAID").length,
  };
  return ok({
    options: {
      currencies: [...EXPENSE_CURRENCY_CODES],
      types: EXPENSE_TYPE_OPTIONS.map((item) => ({ code: item.code, label: item.label })),
    },
    summary,
    claims: rows.map((row) => ({
      id: row.id,
      claimRefNo: row.claimRefNo,
      expenseDate: formatUTCDateOnly(row.expenseDate),
      description: row.description,
      studentName: row.studentName,
      location: row.location,
      amountText: formatExpenseMoney(row.amountCents, row.currencyCode),
      status: row.status,
      statusText: miniappTeacherExpenseStatusText(row.status),
      rejectReason: row.rejectReason,
      remarks: row.remarks,
    })),
  });
}

export async function POST(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const form = await req.formData().catch(() => null);
  if (!form) return bad("提交内容格式不正确", 409);
  const expenseDateText = text(form.get("expenseDate"), 20);
  const expenseDate = parseDateOnlyToUTCNoon(expenseDateText);
  const description = text(form.get("description"), 500);
  const studentName = text(form.get("studentName"), 120);
  const location = text(form.get("location"), 200);
  const currencyCode = text(form.get("currencyCode"), 10).toUpperCase();
  const expenseTypeCode = text(form.get("expenseTypeCode"), 40).toUpperCase();
  const amountCents = moneyToCents(form.get("amount"));
  const gstRaw = text(form.get("gstAmount"), 40);
  const gstAmountCents = gstRaw ? moneyToCents(form.get("gstAmount")) : null;
  const remarks = text(form.get("remarks"), 1000);
  const expenseType = getExpenseTypeOption(expenseTypeCode);
  const file = form.get("receiptFile");
  if (!expenseDate || !description || amountCents === null || !expenseType) return bad("请完整填写日期、类型、说明和金额", 409);
  if (gstRaw && gstAmountCents === null) return bad("GST 金额格式不正确", 409);
  if (requiresExpenseLocation(expenseTypeCode) && !location) return bad("交通与出行报销必须填写地点", 409);
  if (!(file instanceof File)) return bad("请上传收据或发票", 409);

  let stored: Awaited<ReturnType<typeof storeExpenseClaimFile>> | null = null;
  try {
    stored = await storeExpenseClaimFile(file);
    const row = await createExpenseClaim({
      submitterUserId: access.user.id,
      submitterName: access.user.name || access.user.email,
      submitterRole: access.user.role,
      expenseDate,
      description,
      studentName: studentName || null,
      location: location || null,
      amountCents,
      gstAmountCents,
      currencyCode,
      expenseTypeCode,
      accountCode: expenseType.accountCode,
      receiptPath: stored.relativePath,
      receiptOriginalName: stored.originalName,
      remarks: remarks || null,
      actor: access.user,
    });
    return ok({ message: "报销已提交，等待审批", claim: { id: row.id, claimRefNo: row.claimRefNo } });
  } catch (error) {
    if (stored) await deleteStoredBusinessFile(stored.relativePath, BUSINESS_UPLOAD_PREFIX.expenseClaims);
    if (error instanceof DuplicateExpenseClaimError) return bad("这笔报销刚刚已经提交，请勿重复操作", 409);
    return bad(error instanceof Error ? error.message : "报销提交失败", 409);
  }
}
