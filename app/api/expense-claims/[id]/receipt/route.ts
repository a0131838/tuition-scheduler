import { prisma } from '@/lib/prisma';
import { canFinanceOperateExpense, canApproveExpense } from '@/lib/expense-claims';
import { getCurrentUser, isManagerUser } from '@/lib/auth';
import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX } from '@/lib/business-file-storage';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    select: {
      id: true,
      submitterUserId: true,
      receiptPath: true,
      receiptOriginalName: true,
    },
  });
  if (!claim) return new Response('Not Found', { status: 404 });

  const isPrivileged =
    user.role === 'ADMIN' ||
    user.role === 'FINANCE' ||
    canFinanceOperateExpense(user) ||
    (await canApproveExpense(user)) ||
    (await isManagerUser(user));

  if (!isPrivileged && claim.submitterUserId !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.expenseClaims,
    relativePath: claim.receiptPath,
    originalFileName: claim.receiptOriginalName,
    fallbackFileName: 'receipt',
  });
}
