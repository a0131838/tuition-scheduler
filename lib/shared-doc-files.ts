import crypto from 'crypto';
import path from 'path';
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from '@/lib/business-file-storage';
import { getSharedDocStorageDriver, uploadSharedDocToS3 } from '@/lib/shared-doc-storage';
import { toSharedDocCategoryFolderName } from '@/lib/shared-docs';

export const SHARED_DOC_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function validateSharedDocFile(file: File | null | undefined) {
  if (!(file instanceof File) || !file.size) {
    throw new Error('Document file is required');
  }
  if (file.size > SHARED_DOC_UPLOAD_MAX_BYTES) {
    throw new Error('File too large (max 25MB)');
  }
  const mime = String(file.type || '').toLowerCase().trim();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error('Unsupported file type');
  }
}

export async function storeSharedDocFile(file: File, options?: { categoryName?: string | null }) {
  validateSharedDocFile(file);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const categoryFolder = toSharedDocCategoryFolderName(options?.categoryName);
  const buf = Buffer.from(await file.arrayBuffer());
  const storageDriver = getSharedDocStorageDriver();
  const mimeType = String(file.type || '').trim() || null;

  let filePath: string;
  if (storageDriver === 's3') {
    const ext = path.extname(file.name || '').slice(0, 12) || '.bin';
    const safeExt = /^[.a-zA-Z0-9]+$/.test(ext) ? ext : '.bin';
    const storeName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${safeExt}`;
    filePath = await uploadSharedDocToS3({
      objectKey: path.posix.join('shared-docs', categoryFolder, month, storeName),
      content: buf,
      contentType: mimeType,
    });
  } else {
    const localStored = await storeBusinessUpload(file, {
      allowedPrefix: BUSINESS_UPLOAD_PREFIX.sharedDocs,
      subdirSegments: [categoryFolder, month],
      maxBytes: SHARED_DOC_UPLOAD_MAX_BYTES,
      fallbackOriginalName: 'document',
    });
    filePath = localStored.relativePath;
  }

  return {
    relativePath: filePath,
    originalName: file.name || 'document',
    sizeBytes: buf.byteLength,
    mimeType,
  };
}
