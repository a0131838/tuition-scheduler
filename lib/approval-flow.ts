import { prisma } from "@/lib/prisma";

const MANAGER_APPROVER_KEY = "approval_manager_emails_v1";
const FINANCE_APPROVER_KEY = "approval_finance_emails_v1";
const DEFAULT_OWNER_MANAGER_EMAIL = "zhaohongwei0880@gmail.com";

export type ApprovalRoleConfig = {
  managerApproverEmails: string[];
  financeApproverEmails: string[];
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function dedupeEmails(emails: string[]) {
  return Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));
}

function parseEmailList(raw?: string | null) {
  if (!raw) return [];
  return dedupeEmails(raw.split(","));
}

export function isRoleApprover(email: string | null | undefined, approverEmails: string[]) {
  if (!email) return false;
  return approverEmails.includes(normalizeEmail(email));
}

export function areAllApproversConfirmed(approvedBy: string[] | null | undefined, approverEmails: string[]) {
  if (!approverEmails.length) return false;
  const set = new Set((approvedBy ?? []).map(normalizeEmail));
  return approverEmails.every((x) => set.has(normalizeEmail(x)));
}

export async function getApprovalRoleConfig(): Promise<ApprovalRoleConfig> {
  const [managerRow, financeRow, managerAclRows] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: MANAGER_APPROVER_KEY }, select: { value: true } }),
    prisma.appSetting.findUnique({ where: { key: FINANCE_APPROVER_KEY }, select: { value: true } }),
    prisma.managerAcl.findMany({ where: { isActive: true }, select: { email: true } }).catch(() => []),
  ]);

  const managerFromSetting = parseEmailList(managerRow?.value ?? null);
  const financeFromSetting = parseEmailList(financeRow?.value ?? null);

  const fallbackManagers = dedupeEmails([
    DEFAULT_OWNER_MANAGER_EMAIL,
    ...managerAclRows.map((x) => x.email ?? ""),
  ]);

  return {
    managerApproverEmails: managerFromSetting.length ? managerFromSetting : fallbackManagers,
    financeApproverEmails: financeFromSetting,
  };
}

export async function saveApprovalRoleConfig(input: { managerEmailsRaw: string; financeEmailsRaw: string }) {
  const managerApproverEmails = dedupeEmails((input.managerEmailsRaw ?? "").split(","));
  const financeApproverEmails = dedupeEmails((input.financeEmailsRaw ?? "").split(","));

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: MANAGER_APPROVER_KEY },
      update: { value: managerApproverEmails.join(",") },
      create: { key: MANAGER_APPROVER_KEY, value: managerApproverEmails.join(",") },
    }),
    prisma.appSetting.upsert({
      where: { key: FINANCE_APPROVER_KEY },
      update: { value: financeApproverEmails.join(",") },
      create: { key: FINANCE_APPROVER_KEY, value: financeApproverEmails.join(",") },
    }),
  ]);
}

