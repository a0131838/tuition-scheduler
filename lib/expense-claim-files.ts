import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from '@/lib/business-file-storage';

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
  const now = new Date();
  return storeBusinessUpload(file, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.expenseClaims,
    subdirSegments: [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`],
    maxBytes: EXPENSE_CLAIM_UPLOAD_MAX_BYTES,
    fallbackOriginalName: 'receipt',
  });
}
