import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { canFinanceOperateExpense, canApproveExpense } from '@/lib/expense-claims';
import { getCurrentUser, isManagerUser } from '@/lib/auth';

export const runtime = 'nodejs';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
};

function buildExpenseClaimFilePath(receiptPath: string) {
  const normalized = String(receiptPath || '').trim();
  if (!normalized.startsWith('/uploads/expense-claims/')) return null;
  const rel = normalized.replace(/^\//, '');
  if (rel.includes('..')) return null;
  return path.join(process.cwd(), 'public', ...rel.split('/'));
}

export async function GET(
  _req: Request,
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

  const absPath = buildExpenseClaimFilePath(claim.receiptPath);
  if (!absPath) return new Response('Not Found', { status: 404 });

  try {
    const st = await stat(absPath);
    if (!st.isFile()) return new Response('Not Found', { status: 404 });
  } catch {
    return new Response('Not Found', { status: 404 });
  }

  const safeName = path.basename(claim.receiptOriginalName || 'receipt');
  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const stream = createReadStream(absPath);

  return new Response(stream as any, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'private, max-age=3600',
      'content-disposition': `inline; filename="${safeName.replace(/"/g, '')}"`,
    },
  });
}
