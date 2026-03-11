import path from 'path';
import crypto from 'crypto';
import { mkdir, writeFile } from 'fs/promises';

export const EXPENSE_CLAIM_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export function validateExpenseClaimFile(file: File | null | undefined) {
  if (!(file instanceof File) || !file.size) {
    throw new Error('Receipt or invoice is required');
  }
  if (file.size > EXPENSE_CLAIM_UPLOAD_MAX_BYTES) {
    throw new Error('File too large (max 10MB)');
  }
}

export async function storeExpenseClaimFile(file: File) {
  validateExpenseClaimFile(file);
  const ext = path.extname(file.name || '').slice(0, 10) || '.bin';
  const safeExt = /^[.a-zA-Z0-9]+$/.test(ext) ? ext : '.bin';
  const now = new Date();
  const relDir = path.join('uploads', 'expense-claims', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const absDir = path.join(process.cwd(), 'public', relDir);
  await mkdir(absDir, { recursive: true });
  const storeName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${safeExt}`;
  const absPath = path.join(absDir, storeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);
  return {
    relativePath: `/${path.posix.join('uploads', 'expense-claims', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, storeName)}`,
    originalName: file.name || 'receipt',
  };
}
